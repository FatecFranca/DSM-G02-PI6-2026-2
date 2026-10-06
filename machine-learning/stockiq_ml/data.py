"""Carga do dataset Store Sales - Time Series Forecasting (Kaggle).

Convertemos o formato longo (data, loja, família, vendas) em uma matriz densa
``Y[dia, série]``, onde cada série é um par (loja, família). É exatamente o formato
que o backend do StockIQ enviará ao serviço: uma série por produto com a quantidade
de saída por dia.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .config import DATASET_DIR


@dataclass(frozen=True)
class SalesMatrix:
    values: np.ndarray            # float32 [T, S]
    dates: pd.DatetimeIndex       # T datas consecutivas (dias sem registro = 0)
    series: pd.DataFrame          # S linhas: store_nbr, family

    @property
    def n_days(self) -> int:
        return self.values.shape[0]

    @property
    def n_series(self) -> int:
        return self.values.shape[1]


def load_sales_matrix(dataset_dir: Path | None = None) -> SalesMatrix:
    path = (dataset_dir or DATASET_DIR) / "train.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"{path} não encontrado. Baixe o dataset do Kaggle (store-sales-time-series-forecasting) "
            "e extraia na pasta machine-learning/store-sales-time-series-forecasting/ "
            "ou defina STORE_SALES_DIR."
        )
    frame = pd.read_csv(
        path,
        usecols=["date", "store_nbr", "family", "sales"],
        parse_dates=["date"],
        dtype={"store_nbr": "int16", "family": "category", "sales": "float32"},
    )
    wide = frame.pivot_table(index="date", columns=["store_nbr", "family"], values="sales", observed=True)
    # 25/12 não consta no dataset (lojas fechadas): trata como demanda zero.
    full_range = pd.date_range(wide.index.min(), wide.index.max(), freq="D")
    wide = wide.reindex(full_range).fillna(0.0).clip(lower=0.0)
    series = pd.DataFrame(wide.columns.tolist(), columns=["store_nbr", "family"])
    return SalesMatrix(wide.to_numpy(dtype=np.float32), pd.DatetimeIndex(full_range), series)


def category_level(matrix: SalesMatrix) -> pd.DataFrame:
    """Soma as lojas: demanda diária por categoria (equivale a Category no StockIQ)."""
    frame = pd.DataFrame(matrix.values, index=matrix.dates)
    return frame.T.groupby(matrix.series["family"].to_numpy()).sum().T
