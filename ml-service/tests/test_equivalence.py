"""Garante que os modelos do serviço reproduzem os resultados do notebook (R² no teste).

Rode:  cd ml-service && PYTHONPATH=.pylibs python3 -m unittest -v tests.test_equivalence
Demora cerca de 1 minuto (carrega train.csv e treina os modelos).
"""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import sales_model  # noqa: E402

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", Path(__file__).resolve().parents[2] / "machine-learning" / "store-sales-time-series-forecasting"))

# Valores impressos pelo notebook Previsao_Vendas.ipynb (célula de comparação dos métodos)
NOTEBOOK_R2 = {"kbest_linear": 0.6270, "kbest_rf": 0.6279, "rfe_linear": 0.6337, "rfe_rf": 0.9156}


@unittest.skipUnless((DATA_DIR / "train.csv").exists(), "dataset do Kaggle ausente")
class EquivalenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = sales_model.train(DATA_DIR, extra_models=True)

    def test_dataset_igual_ao_do_notebook(self):
        d = self.bundle.dataset
        self.assertEqual((d["rows"], d["trainRows"], d["testRows"], d["attributes"]), (97680, 68376, 29304, 41))

    def test_r2_igual_ao_do_notebook(self):
        for model_id, expected in NOTEBOOK_R2.items():
            self.assertAlmostEqual(self.bundle.metrics[model_id]["r2"], expected, places=4, msg=model_id)

    def test_atributos_selecionados_iguais_aos_do_notebook(self):
        self.assertEqual(self.bundle.features["rfe_rf"], [
            "store_nbr", "onpromotion", "cluster", "family_BEVERAGES", "family_CLEANING", "family_DAIRY",
            "family_GROCERY I", "family_HOME AND KITCHEN II", "family_PRODUCE", "family_SEAFOOD"])

    def test_previsao_sensata(self):
        base = {"store": 1, "date": "2017-08-20", "onpromotion": 0}
        mercearia, livros = self.bundle.predict([{**base, "family": "GROCERY I"}, {**base, "family": "BOOKS"}], ["rfe_rf"])
        self.assertGreater(mercearia["rfe_rf"], livros["rfe_rf"] * 10)  # mercearia vende muito mais que livros


if __name__ == "__main__":
    unittest.main()
