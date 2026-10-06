"""Previsores simples usados como régua de comparação do modelo.

Todos recebem a janela de histórico ``window`` [T, S] terminando na origem e devolvem a
previsão [H, S] para os horizontes pedidos.
"""

from __future__ import annotations

import numpy as np


def seasonal_naive(window: np.ndarray, horizons: list[int]) -> np.ndarray:
    """Repete o valor do mesmo dia da semana na semana anterior mais recente."""
    last = len(window) - 1
    return np.stack([window[last - 7 * int(np.ceil(h / 7)) + h] for h in horizons])


def mean_28d(window: np.ndarray, horizons: list[int]) -> np.ndarray:
    """Média simples dos últimos 28 dias (constante em todos os horizontes)."""
    return np.tile(window[-28:].mean(axis=0), (len(horizons), 1))


def weekday_mean_8w(window: np.ndarray, horizons: list[int]) -> np.ndarray:
    """Média do mesmo dia da semana nas últimas 8 semanas (baseline forte para varejo)."""
    last = len(window) - 1
    rows = []
    for h in horizons:
        offset = (-h) % 7
        idx = last - offset - 7 * np.arange(8)
        rows.append(window[idx].mean(axis=0))
    return np.stack(rows)


BASELINES = {
    "naive_sazonal_7d": seasonal_naive,
    "media_28d": mean_28d,
    "media_mesmo_dia_8sem": weekday_mean_8w,
}
