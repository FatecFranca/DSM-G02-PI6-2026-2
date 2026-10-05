import unittest

import pandas as pd

from src.forecast_demand import evaluate_temporal, forecast_next_week


def weekly_series(values: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "categoria": ["ferramentas"] * len(values),
            "date": pd.date_range("2025-01-05", periods=len(values), freq="W"),
            "quantidade_saida": values,
        }
    )


class DemandForecastTests(unittest.TestCase):
    def test_insufficient_history_is_returned_explicitly(self) -> None:
        result = forecast_next_week(weekly_series([2, 4, 5]))
        self.assertEqual(result.iloc[0]["status"], "historico_insuficiente")
        self.assertEqual(result.iloc[0]["semanas_disponiveis"], 3)
        self.assertTrue(pd.isna(result.iloc[0]["previsao_proxima_semana"]))

    def test_temporal_evaluation_uses_only_prior_weeks_and_reports_baseline(self) -> None:
        result = evaluate_temporal(weekly_series([2, 4, 6, 8, 10, 12, 14, 16]))
        category = result[result["categoria"] == "ferramentas"].iloc[0]
        self.assertEqual(category["status"], "avaliado")
        self.assertEqual(category["semanas_avaliadas"], 4)
        self.assertIsNotNone(category["mae_regressao"])
        self.assertIsNotNone(category["mae_media"])


if __name__ == "__main__":
    unittest.main()
