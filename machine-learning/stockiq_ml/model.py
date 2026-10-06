"""Modelo global de demanda diária: um único gradient boosting para todas as séries.

Três regressores :class:`~sklearn.ensemble.HistGradientBoostingRegressor` compartilham os
mesmos atributos (ver ``features.py``):

* ``mean``  – perda de Poisson sobre a razão demanda/nível: estima a **média** (o que importa
  para dimensionar estoque; uma regressão em log subestimaria a demanda de séries intermitentes);
* ``low`` / ``high`` – perda de quantil (15% / 85%): faixa de incerteza (~80% de cobertura), usada
  para estoque de segurança.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from . import __version__
from .config import LOOKBACK_DAYS, MAX_HORIZON, MIN_HISTORY_DAYS, QUANTILE_HIGH, QUANTILE_LOW, RANDOM_STATE, RATIO_CAP
from .features import FEATURE_NAMES, features_for_origin, level_scale


def _regressor(loss: str, max_iter: int, quantile: float | None = None) -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(
        loss=loss,
        quantile=quantile,
        learning_rate=0.08,
        max_iter=max_iter,
        max_leaf_nodes=63,
        min_samples_leaf=100,
        l2_regularization=1.0,
        random_state=RANDOM_STATE,
    )


@dataclass
class Forecast:
    """Previsão de uma série: ``mean``/``low``/``high`` com um valor por horizonte."""

    method: str                       # "gbm" (modelo) ou "mean" (histórico curto demais)
    horizons: list[int]
    mean: np.ndarray
    low: np.ndarray
    high: np.ndarray


@dataclass
class DemandModel:
    max_iter: int = 300
    mean_model: HistGradientBoostingRegressor | None = None
    low_model: HistGradientBoostingRegressor | None = None
    high_model: HistGradientBoostingRegressor | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    # ── treino ────────────────────────────────────────────────────────────
    def fit(self, x: np.ndarray, ratio: np.ndarray) -> "DemandModel":
        self.mean_model = _regressor("poisson", self.max_iter).fit(x, ratio)
        self.low_model = _regressor("quantile", self.max_iter, QUANTILE_LOW).fit(x, ratio)
        self.high_model = _regressor("quantile", self.max_iter, QUANTILE_HIGH).fit(x, ratio)
        return self

    def predict_ratio(self, x: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        assert self.mean_model and self.low_model and self.high_model, "modelo não treinado"
        mean = np.clip(self.mean_model.predict(x), 0.0, RATIO_CAP)
        low = np.clip(self.low_model.predict(x), 0.0, RATIO_CAP)
        high = np.clip(self.high_model.predict(x), 0.0, RATIO_CAP)
        # garante low <= mean <= high (os três modelos são independentes)
        return mean, np.minimum(low, mean), np.maximum(high, mean)

    # ── previsão sobre a matriz [T, S] (treino/avaliação) ─────────────────
    def predict_matrix(
        self, values: np.ndarray, dates: pd.DatetimeIndex, origin: int, horizons: list[int]
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Retorna (mean, low, high), cada um [H, S], em unidades de demanda."""
        n_series = values.shape[1]
        x, _ = features_for_origin(values, dates, origin, horizons)
        scale = np.tile(level_scale(values[origin - LOOKBACK_DAYS + 1 : origin + 1]), len(horizons))
        mean, low, high = (r * scale for r in self.predict_ratio(x))
        shape = (len(horizons), n_series)
        return mean.reshape(shape), low.reshape(shape), high.reshape(shape)

    # ── previsão sobre séries de tamanhos diferentes (serviço) ────────────
    def forecast_series(
        self, series: list[np.ndarray], last_date: pd.Timestamp, horizons: list[int]
    ) -> list[Forecast]:
        """Cada série é um vetor diário terminando em ``last_date`` (qualquer comprimento)."""
        if max(horizons) > MAX_HORIZON or min(horizons) < 1:
            raise ValueError(f"horizontes devem estar entre 1 e {MAX_HORIZON}")

        results: list[Forecast | None] = [None] * len(series)
        usable: list[int] = []
        for i, values in enumerate(series):
            if len(values) < MIN_HISTORY_DAYS:
                level = float(np.mean(values)) if len(values) else 0.0
                flat = np.full(len(horizons), level)
                results[i] = Forecast("mean", horizons, flat, flat * 0.5, flat * 1.5)
            else:
                usable.append(i)

        if usable:
            # Séries entre 28 e 56 dias são completadas à esquerda com a própria média.
            window = np.empty((LOOKBACK_DAYS, len(usable)), dtype=np.float32)
            for col, i in enumerate(usable):
                values = np.asarray(series[i], dtype=np.float32)[-LOOKBACK_DAYS:]
                pad = LOOKBACK_DAYS - len(values)
                window[:, col] = np.concatenate([np.full(pad, values.mean(), dtype=np.float32), values])
            dates = pd.date_range(end=last_date.normalize(), periods=LOOKBACK_DAYS, freq="D")
            mean, low, high = self.predict_matrix(window, dates, LOOKBACK_DAYS - 1, horizons)
            for col, i in enumerate(usable):
                results[i] = Forecast("gbm", horizons, mean[:, col], low[:, col], high[:, col])
        return results  # type: ignore[return-value]

    # ── persistência ──────────────────────────────────────────────────────
    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.metadata.update(
            {
                "package_version": __version__,
                "saved_at": datetime.now(timezone.utc).isoformat(),
                "feature_names": FEATURE_NAMES,
                "lookback_days": LOOKBACK_DAYS,
                "max_horizon": MAX_HORIZON,
            }
        )
        joblib.dump(self, path, compress=3)

    @staticmethod
    def load(path: Path) -> "DemandModel":
        model = joblib.load(path)
        if model.metadata.get("feature_names") != FEATURE_NAMES:
            raise RuntimeError("O modelo salvo usa atributos diferentes do código atual; treine novamente.")
        return model

    def describe(self) -> str:
        return json.dumps(self.metadata, indent=2, ensure_ascii=False, default=str)
