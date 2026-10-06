import unittest

import numpy as np
import pandas as pd

from stockiq_ml.config import LOOKBACK_DAYS, MAX_HORIZON
from stockiq_ml.features import (
    FEATURE_NAMES,
    build_training_set,
    features_for_origin,
    history_to_matrix,
    level_scale,
)


def synthetic_matrix(days: int = 200, series: int = 5, seed: int = 0):
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2024-01-01", periods=days, freq="D")
    weekly = 1 + 0.5 * np.sin(2 * np.pi * dates.dayofweek.to_numpy() / 7)
    values = rng.poisson(10 * weekly[:, None] * np.arange(1, series + 1)).astype(np.float32)
    return values, dates


class FeatureTests(unittest.TestCase):
    def test_shape_and_names(self) -> None:
        values, dates = synthetic_matrix()
        x, tags = features_for_origin(values, dates, 100, [1, 7, 14])
        self.assertEqual(x.shape, (3 * values.shape[1], len(FEATURE_NAMES)))
        self.assertEqual(sorted(set(tags.tolist())), [1, 7, 14])
        self.assertFalse(np.isnan(x).any())

    def test_features_ignore_the_future(self) -> None:
        values, dates = synthetic_matrix()
        origin = 120
        baseline, _ = features_for_origin(values, dates, origin, [1, 5, 14])
        changed = values.copy()
        changed[origin + 1 :] = 9999  # altera tudo que acontece depois da origem
        after, _ = features_for_origin(changed, dates, origin, [1, 5, 14])
        np.testing.assert_array_equal(baseline, after)

    def test_weekday_features_align_with_target_weekday(self) -> None:
        # Série que vale o índice do dia da semana: o "mesmo dia da semana" deve ser exato.
        dates = pd.date_range("2024-01-01", periods=120, freq="D")  # começa numa segunda-feira
        values = np.tile(dates.dayofweek.to_numpy(dtype=np.float32)[:, None], (1, 2)) * 10
        origin = 90
        for horizon in range(1, 15):
            x, _ = features_for_origin(values, dates, origin, [horizon])
            expected = float(dates[origin + horizon].dayofweek * 10)
            wd_last = x[0, FEATURE_NAMES.index("wd_last")]
            self.assertAlmostEqual(float(np.expm1(wd_last)), expected, places=3, msg=f"h={horizon}")

    def test_origin_without_history_is_rejected(self) -> None:
        values, dates = synthetic_matrix()
        with self.assertRaises(ValueError):
            features_for_origin(values, dates, LOOKBACK_DAYS - 2, [1])

    def test_training_target_is_ratio_to_recent_level_and_capped(self) -> None:
        values, dates = synthetic_matrix()
        rng = np.random.default_rng(1)
        origins = [80, 90]
        x, ratio, scale = build_training_set(values, dates, origins, 3, rng)
        self.assertEqual(len(x), len(ratio))
        self.assertEqual(len(x), len(origins) * 3 * values.shape[1])
        self.assertTrue((ratio >= 0).all() and (ratio <= 5.0).all())
        window = values[80 - LOOKBACK_DAYS + 1 : 81]
        np.testing.assert_allclose(scale[: values.shape[1]], level_scale(window), rtol=1e-5)

    def test_history_to_matrix_fills_missing_days_with_zero(self) -> None:
        daily = pd.Series({pd.Timestamp("2025-03-01"): 4.0, pd.Timestamp("2025-03-04"): 2.0})
        vector = history_to_matrix(daily, pd.Timestamp("2025-03-06"))
        self.assertEqual(vector.tolist(), [4.0, 0.0, 0.0, 2.0, 0.0, 0.0])

    def test_max_horizon_is_covered_by_the_lookback_window(self) -> None:
        values, dates = synthetic_matrix()
        x, _ = features_for_origin(values, dates, 100, list(range(1, MAX_HORIZON + 1)))
        self.assertEqual(len(x), MAX_HORIZON * values.shape[1])


if __name__ == "__main__":
    unittest.main()
