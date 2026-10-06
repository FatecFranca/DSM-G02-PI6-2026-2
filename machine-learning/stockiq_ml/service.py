"""Serviço HTTP de previsão de demanda consumido pelo backend do StockIQ.

Subir localmente::

    uvicorn stockiq_ml.service:app --port 8000

O backend (Node) monta, para cada produto, o histórico de **saídas por dia** a partir da
tabela ``movements`` e chama ``POST /forecast``. O serviço não acessa o banco: recebe só os
números que precisa, o que mantém o contrato simples e o ML desacoplado do schema Prisma.
"""

from __future__ import annotations

import logging
from datetime import date
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import __version__
from .config import MAX_HORIZON, MIN_HISTORY_DAYS, MODEL_FILE
from .features import history_to_matrix
from .model import DemandModel

logger = logging.getLogger("stockiq_ml")

MAX_SERIES = 5000
MAX_HISTORY_DAYS = 800

app = FastAPI(
    title="StockIQ ML — previsão de demanda",
    version=__version__,
    description="Previsão diária de demanda (média e faixa p15–p85) por produto, até 28 dias à frente.",
)


class DayQuantity(BaseModel):
    date: date
    quantity: float = Field(ge=0, description="Unidades que saíram nesse dia")


class SeriesInput(BaseModel):
    id: str
    history: list[DayQuantity] = Field(
        default_factory=list, description="Dias com saída; dias ausentes contam como zero"
    )


class ForecastRequest(BaseModel):
    as_of: date = Field(alias="asOf", description="Último dia observado (inclusive)")
    horizon: int = Field(default=MAX_HORIZON, ge=1, le=MAX_HORIZON)
    series: list[SeriesInput] = Field(max_length=MAX_SERIES)

    model_config = {"populate_by_name": True}


class DayForecast(BaseModel):
    date: date
    mean: float
    low: float
    high: float


class Total(BaseModel):
    mean: float
    low: float
    high: float


class SeriesForecast(BaseModel):
    id: str
    method: str = Field(description="gbm = modelo treinado; mean = histórico curto, média simples")
    history_days: int = Field(serialization_alias="historyDays")
    daily: list[DayForecast]
    next7: Total
    next14: Total | None = None
    total: Total = Field(description="Soma de todo o horizonte pedido")

    model_config = {"populate_by_name": True}


class ForecastResponse(BaseModel):
    as_of: date = Field(serialization_alias="asOf")
    horizon: int
    model_version: str = Field(serialization_alias="modelVersion")
    forecasts: list[SeriesForecast]

    model_config = {"populate_by_name": True}


@lru_cache(maxsize=1)
def get_model() -> DemandModel:
    if not MODEL_FILE.exists():
        raise FileNotFoundError(MODEL_FILE)
    return DemandModel.load(MODEL_FILE)


def _model_or_503() -> DemandModel:
    try:
        return get_model()
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Modelo não treinado. Rode `python -m stockiq_ml.train` e reinicie o serviço.",
        ) from None


def _total(parts: list[DayForecast]) -> Total:
    """Soma a previsão do período. A faixa agrega os desvios por raiz da soma dos quadrados
    (dias independentes): somar os limites diários superestimaria a incerteza do total."""
    mean = sum(p.mean for p in parts)
    down = sum((p.mean - p.low) ** 2 for p in parts) ** 0.5
    up = sum((p.high - p.mean) ** 2 for p in parts) ** 0.5
    return Total(mean=round(mean, 2), low=round(max(0.0, mean - down), 2), high=round(mean + up, 2))


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "modelLoaded": MODEL_FILE.exists(), "version": __version__}


@app.get("/model")
def model_info() -> dict[str, object]:
    """Metadados do modelo (treino, atributos e métricas do backtest)."""
    meta = dict(_model_or_503().metadata)
    meta.pop("feature_names", None)
    meta["minHistoryDays"] = MIN_HISTORY_DAYS
    meta["maxHorizon"] = MAX_HORIZON
    return meta


@app.post("/forecast", response_model=ForecastResponse, response_model_by_alias=True)
def forecast(request: ForecastRequest) -> ForecastResponse:
    model = _model_or_503()
    as_of = pd.Timestamp(request.as_of)
    horizons = list(range(1, request.horizon + 1))

    vectors: list[np.ndarray] = []
    for item in request.series:
        if not item.history:
            vectors.append(np.zeros(0, dtype=np.float32))
            continue
        daily = pd.Series({pd.Timestamp(h.date): h.quantity for h in item.history})
        daily = daily[daily.index <= as_of]
        if daily.empty:
            vectors.append(np.zeros(0, dtype=np.float32))
            continue
        # Sem começo explícito, o histórico "começa" no primeiro movimento da série.
        # Limita ao que o modelo usa (56 dias) para o custo não crescer com o histórico.
        vector = history_to_matrix(daily.groupby(level=0).sum(), as_of)
        vectors.append(vector[-MAX_HISTORY_DAYS:])

    results = model.forecast_series(vectors, as_of, horizons)
    forecasts: list[SeriesForecast] = []
    for item, vector, result in zip(request.series, vectors, results, strict=True):
        days = [
            DayForecast(
                date=(as_of + pd.Timedelta(days=h)).date(),
                mean=round(float(result.mean[i]), 3),
                low=round(float(result.low[i]), 3),
                high=round(float(result.high[i]), 3),
            )
            for i, h in enumerate(horizons)
        ]
        forecasts.append(
            SeriesForecast(
                id=item.id,
                method=result.method,
                history_days=len(vector),
                daily=days,
                next7=_total(days[:7]),
                next14=_total(days[:14]) if len(days) >= 14 else None,
                total=_total(days),
            )
        )
    return ForecastResponse(as_of=request.as_of, horizon=request.horizon, model_version=__version__, forecasts=forecasts)
