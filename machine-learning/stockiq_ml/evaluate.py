"""Validação temporal (backtest) do modelo contra os baselines.

Várias origens semanais no fim do histórico; para cada uma prevemos 1..14 dias e comparamos
com o que realmente aconteceu. O treino usa somente origens cujos alvos são anteriores à
primeira origem de teste: nenhuma informação do período avaliado vaza para o modelo.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .baselines import BASELINES
from .config import LOOKBACK_DAYS, MAX_HORIZON
from .model import DemandModel

EVAL_HORIZON = 14
N_TEST_ORIGINS = 4


def test_origins(n_days: int) -> list[int]:
    """Origens de teste espaçadas em 7 dias; a mais recente deixa EVAL_HORIZON dias reais após ela."""
    latest = n_days - 1 - EVAL_HORIZON
    return [latest - 7 * k for k in reversed(range(N_TEST_ORIGINS))]


def last_train_origin(n_days: int) -> int:
    """Último dia de origem permitido no treino: alvos (origem + MAX_HORIZON) antes do primeiro teste."""
    return test_origins(n_days)[0] - MAX_HORIZON


def rmsle(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.sqrt(np.mean((np.log1p(predicted) - np.log1p(actual)) ** 2)))


def wape(actual: np.ndarray, predicted: np.ndarray) -> float:
    total = actual.sum()
    return float(np.abs(actual - predicted).sum() / total) if total > 0 else float("nan")


def score(actual: np.ndarray, predicted: np.ndarray, group_ids: np.ndarray | None = None) -> dict[str, float]:
    """Métricas sobre arrays [H, S]; ``group_ids`` agrega séries (ex.: lojas -> categoria)."""
    out = {
        "rmsle": round(rmsle(actual, predicted), 4),
        "wape": round(wape(actual, predicted), 4),
        "vies_pct": round(float(predicted.sum() / actual.sum() - 1) * 100, 2),
    }
    if group_ids is not None:
        groups = pd.factorize(group_ids)[0]
        agg_actual = np.stack([actual[:, groups == g].sum(axis=1) for g in np.unique(groups)], axis=1)
        agg_pred = np.stack([predicted[:, groups == g].sum(axis=1) for g in np.unique(groups)], axis=1)
        out["wape_categoria"] = round(wape(agg_actual, agg_pred), 4)
    return out


def backtest(
    model: DemandModel,
    values: np.ndarray,
    dates: pd.DatetimeIndex,
    group_ids: np.ndarray | None = None,
) -> dict[str, object]:
    horizons = list(range(1, EVAL_HORIZON + 1))
    origins = test_origins(values.shape[0])
    names = ["modelo_gbm", *BASELINES]
    store: dict[str, dict[str, list[np.ndarray]]] = {n: {"pred": [], "act": []} for n in names}
    low_all, high_all, act_all = [], [], []

    for origin in origins:
        window = values[origin - LOOKBACK_DAYS + 1 : origin + 1]
        actual = np.stack([values[origin + h] for h in horizons])
        mean, low, high = model.predict_matrix(values, dates, origin, horizons)
        preds = {"modelo_gbm": mean, **{n: fn(window, horizons) for n, fn in BASELINES.items()}}
        for n, p in preds.items():
            store[n]["pred"].append(p)
            store[n]["act"].append(actual)
        low_all.append(low)
        high_all.append(high)
        act_all.append(actual)

    actual_all = np.concatenate(act_all)
    results: dict[str, object] = {}
    for n in names:
        pred = np.concatenate(store[n]["pred"])
        results[n] = score(actual_all, pred, group_ids)

    # Métricas por faixa de horizonte (modelo vs melhor baseline simples).
    pred_model = np.concatenate(store["modelo_gbm"]["pred"])
    pred_base = np.concatenate(store["media_mesmo_dia_8sem"]["pred"])
    per_horizon = {}
    for label, sl in {"1-7 dias": slice(0, 7), "8-14 dias": slice(7, 14)}.items():
        rows = np.concatenate([np.arange(k * EVAL_HORIZON, (k + 1) * EVAL_HORIZON)[sl] for k in range(len(origins))])
        per_horizon[label] = {
            "modelo_gbm": score(actual_all[rows], pred_model[rows], group_ids),
            "media_mesmo_dia_8sem": score(actual_all[rows], pred_base[rows], group_ids),
        }

    low_cat = np.concatenate(low_all)
    high_cat = np.concatenate(high_all)
    results["cobertura_intervalo"] = round(float(((actual_all >= low_cat) & (actual_all <= high_cat)).mean()), 4)
    results["por_horizonte"] = per_horizon
    results["origens_teste"] = [str(dates[o].date()) for o in origins]
    results["horizonte_dias"] = EVAL_HORIZON
    results["series"] = int(values.shape[1])
    return results
