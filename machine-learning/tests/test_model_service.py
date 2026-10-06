import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from stockiq_ml import service
from stockiq_ml.config import MAX_HORIZON
from stockiq_ml.evaluate import backtest, last_train_origin, test_origins
from stockiq_ml.features import build_training_set
from stockiq_ml.model import DemandModel
from tests.test_features import synthetic_matrix


def small_model() -> tuple[DemandModel, np.ndarray, pd.DatetimeIndex]:
    values, dates = synthetic_matrix(days=400, series=12)
    rng = np.random.default_rng(0)
    x, ratio, _ = build_training_set(values, dates, list(range(60, 330, 6)), 4, rng)
    return DemandModel(max_iter=40).fit(x, ratio), values, dates


class ModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.model, cls.values, cls.dates = small_model()

    def test_forecast_is_non_negative_and_ordered(self) -> None:
        series = [self.values[:300, i] for i in range(3)]
        for result in self.model.forecast_series(series, self.dates[299], [1, 7, 14, 28]):
            self.assertEqual(result.method, "gbm")
            self.assertTrue((result.mean >= 0).all())
            self.assertTrue((result.low <= result.mean + 1e-6).all())
            self.assertTrue((result.high >= result.mean - 1e-6).all())

    def test_forecast_tracks_the_level_of_the_series(self) -> None:
        series = [self.values[:300, 0], self.values[:300, 9]]  # níveis ~10 e ~100
        small, large = self.model.forecast_series(series, self.dates[299], [1, 2, 3])
        self.assertGreater(large.mean.mean(), 3 * small.mean.mean())

    def test_short_history_falls_back_to_mean(self) -> None:
        result = self.model.forecast_series([np.array([2, 4, 6], dtype=np.float32)], self.dates[299], [1, 2])[0]
        self.assertEqual(result.method, "mean")
        self.assertAlmostEqual(float(result.mean[0]), 4.0)

    def test_horizon_limits(self) -> None:
        with self.assertRaises(ValueError):
            self.model.forecast_series([self.values[:300, 0]], self.dates[299], [MAX_HORIZON + 1])

    def test_between_28_and_56_days_is_padded_not_rejected(self) -> None:
        result = self.model.forecast_series([self.values[:40, 0]], self.dates[39], [1, 2])[0]
        self.assertEqual(result.method, "gbm")

    def test_backtest_keeps_test_period_out_of_training(self) -> None:
        origins = test_origins(len(self.dates))
        self.assertLess(last_train_origin(len(self.dates)) + MAX_HORIZON, origins[0] + 1)
        report = backtest(self.model, self.values, self.dates)
        self.assertIn("modelo_gbm", report)
        self.assertGreater(report["cobertura_intervalo"], 0.0)

    def test_save_and_load_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "m.joblib"
            self.model.save(path)
            loaded = DemandModel.load(path)
            a = self.model.forecast_series([self.values[:300, 0]], self.dates[299], [1, 2])[0]
            b = loaded.forecast_series([self.values[:300, 0]], self.dates[299], [1, 2])[0]
            np.testing.assert_allclose(a.mean, b.mean)


class ServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.model, _, _ = small_model()
        cls.model.metadata.update({"trained_on": "synthetic"})
        cls.client = TestClient(service.app)

    def setUp(self) -> None:
        service.get_model.cache_clear()
        patcher = mock.patch.object(service, "get_model", return_value=self.model)
        patcher.start()
        self.addCleanup(patcher.stop)

    def payload(self, history_days: int = 60) -> dict:
        end = pd.Timestamp("2025-06-30")
        days = pd.date_range(end=end, periods=history_days, freq="D")
        history = [{"date": str(d.date()), "quantity": float(5 + d.dayofweek)} for d in days if d.dayofweek != 6]
        return {"asOf": str(end.date()), "horizon": 14, "series": [{"id": "p1", "history": history}, {"id": "p2", "history": []}]}

    def test_forecast_contract(self) -> None:
        response = self.client.post("/forecast", json=self.payload())
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["horizon"], 14)
        first, empty = body["forecasts"]
        self.assertEqual(first["id"], "p1")
        self.assertEqual(first["method"], "gbm")
        self.assertEqual(len(first["daily"]), 14)
        self.assertEqual(first["daily"][0]["date"], "2025-07-01")
        self.assertAlmostEqual(first["next7"]["mean"], sum(d["mean"] for d in first["daily"][:7]), delta=0.1)
        self.assertEqual(empty["method"], "mean")
        self.assertEqual(empty["total"]["mean"], 0)

    def test_total_band_adds_deviations_as_independent_errors(self) -> None:
        days = [service.DayForecast(date="2025-07-01", mean=10, low=6, high=14) for _ in range(4)]
        total = service._total(days)
        self.assertEqual(total.mean, 40)
        self.assertAlmostEqual(total.low, 40 - 8, places=2)   # √(4 × 4²) = 8, não 16
        self.assertAlmostEqual(total.high, 40 + 8, places=2)

    def test_rejects_invalid_requests(self) -> None:
        bad = self.payload()
        bad["horizon"] = MAX_HORIZON + 1
        self.assertEqual(self.client.post("/forecast", json=bad).status_code, 422)
        negative = self.payload()
        negative["series"][0]["history"][0]["quantity"] = -1
        self.assertEqual(self.client.post("/forecast", json=negative).status_code, 422)

    def test_health_and_model_info(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 200)
        info = self.client.get("/model").json()
        self.assertEqual(info["trained_on"], "synthetic")
        self.assertNotIn("feature_names", info)

    def test_missing_model_returns_503(self) -> None:
        with mock.patch.object(service, "get_model", side_effect=FileNotFoundError("x")):
            self.assertEqual(self.client.post("/forecast", json=self.payload()).status_code, 503)


if __name__ == "__main__":
    unittest.main()
