"""Caminhos e constantes compartilhadas por treino, avaliação e serviço."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# O dataset do Kaggle pode estar na pasta original (descompactada) ou em data/raw.
_DATASET_CANDIDATES = (
    BASE_DIR / "store-sales-time-series-forecasting",
    BASE_DIR / "data" / "raw",
)
DATASET_DIR = Path(os.environ.get("STORE_SALES_DIR", "")) if os.environ.get("STORE_SALES_DIR") else next(
    (p for p in _DATASET_CANDIDATES if (p / "train.csv").exists()), _DATASET_CANDIDATES[0]
)

ARTIFACTS_DIR = Path(os.environ.get("ML_ARTIFACTS_DIR", BASE_DIR / "artifacts"))
MODEL_FILE = ARTIFACTS_DIR / "demand_model.joblib"
METRICS_FILE = ARTIFACTS_DIR / "metrics.json"

# Janela de histórico usada para construir os atributos no ponto de origem.
LOOKBACK_DAYS = 56
# Menor histórico aceito no serviço; abaixo disso a previsão cai para média simples.
MIN_HISTORY_DAYS = 28
# Maior horizonte treinado (dias à frente da origem).
MAX_HORIZON = 28

RANDOM_STATE = 42

# A razão demanda/nível-recente é limitada a este valor: saltos maiores (ex.: loja que reabre
# após meses parada) são imprevisíveis e desestabilizam a perda de Poisson.
RATIO_CAP = 5.0

# Quantis da faixa de incerteza (≈ 80% de cobertura nominal; ver "cobertura_intervalo" nas métricas).
QUANTILE_LOW = 0.15
QUANTILE_HIGH = 0.85
