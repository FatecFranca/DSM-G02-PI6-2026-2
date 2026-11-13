"""Testes do modelo de demanda dos produtos do sistema (wms_forecast).

Rode:  cd ml-service && PYTHONPATH=.pylibs python3 -m unittest -v tests.test_wms_forecast
Usa séries sintéticas com padrão conhecido (sem depender do banco nem do dataset do Kaggle).
"""
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import wms_forecast  # noqa: E402

AS_OF = date(2026, 6, 30)


def make_series(sid: str, days: int, qty_for_day) -> dict:
    start = AS_OF - timedelta(days=days - 1)
    history = []
    for i in range(days):
        day = start + timedelta(days=i)
        qty = qty_for_day(day)
        if qty > 0:
            history.append({"date": day.isoformat(), "quantity": qty})
    return {"id": sid, "history": history}


class WmsForecastTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # "fim": vende 10/dia nos fins de semana; "fixo": vende 4/dia sempre; "novo": histórico curto demais para o modelo
        cls.series = [
            make_series("fim", 240, lambda d: 10 if d.weekday() >= 5 else 0),
            make_series("fixo", 240, lambda d: 4),
            make_series("novo", 20, lambda d: 6),
        ]
        cls.body = wms_forecast.forecast(cls.series, AS_OF.isoformat(), 14)
        cls.by_id = {f["id"]: f for f in cls.body["forecasts"]}

    def test_um_resultado_por_produto_com_o_horizonte_pedido(self):
        self.assertEqual(set(self.by_id), {"fim", "fixo", "novo"})
        for f in self.by_id.values():
            self.assertEqual(len(f["daily"]), 14)
            self.assertEqual(f["daily"][0]["date"], (AS_OF + timedelta(days=1)).isoformat())

    def test_faixa_coerente_e_sem_valores_negativos(self):
        for f in self.by_id.values():
            for d in f["daily"]:
                self.assertGreaterEqual(d["low"], 0)
                self.assertLessEqual(d["low"], d["mean"] + 1e-9)
                self.assertGreaterEqual(d["high"], d["mean"] - 1e-9)

    def test_aprende_o_padrao_de_fim_de_semana(self):
        daily = self.by_id["fim"]["daily"]
        weekend = [d["mean"] for d in daily if date.fromisoformat(d["date"]).weekday() >= 5]
        weekday = [d["mean"] for d in daily if date.fromisoformat(d["date"]).weekday() < 5]
        self.assertGreater(min(weekend), max(weekday) * 2)

    def test_demanda_constante_fica_proxima_do_valor_real(self):
        for d in self.by_id["fixo"]["daily"]:
            self.assertAlmostEqual(d["mean"], 4, delta=0.8)

    def test_historico_curto_usa_media_simples(self):
        self.assertEqual(self.by_id["novo"]["method"], "mean")
        self.assertEqual(self.by_id["fixo"]["method"], "rf")

    def test_info_traz_backtest_e_comparacao_com_a_media(self):
        info = wms_forecast.last_info()
        bt = info["backtest"]
        self.assertIsNotNone(bt)
        for key in ("modelo_rf", "regressao_linear", wms_forecast.BASELINE_NAME):
            self.assertIn("wape", bt[key])
        self.assertGreater(bt["cobertura_intervalo"], 0.5)
        self.assertEqual(info["products_modelled"], 2)
        self.assertTrue(info["importance"])

    def test_mesma_entrada_vem_do_cache(self):
        again = wms_forecast.forecast(self.series, AS_OF.isoformat(), 14)
        self.assertIs(again, self.body)


if __name__ == "__main__":
    unittest.main()
