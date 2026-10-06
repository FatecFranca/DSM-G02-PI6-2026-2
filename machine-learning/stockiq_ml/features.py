"""Engenharia de atributos para previsão de demanda diária multi-horizonte.

Abordagem *direta*: para cada série ``s``, **origem** ``o`` (último dia observado) e
**horizonte** ``h`` (1..MAX_HORIZON), prevemos a demanda do dia ``o + h``.

Todos os atributos são calculados apenas com dados até ``o`` (sem vazamento do futuro) e
são *independentes de escala* (logs e razões em relação ao nível recente da série). Assim o
modelo treinado nas séries do Kaggle serve também para os produtos do StockIQ, cujo volume
é diferente. Esse módulo é usado idêntico no treino e no serviço (evita *train/serve skew*).

Alvo: ``y[o+h] / (média_28d + 1)`` — a razão entre a demanda futura e o nível recente.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .config import LOOKBACK_DAYS, MAX_HORIZON, RATIO_CAP

FEATURE_NAMES: list[str] = [
    "horizon",
    "dow",
    "dom",
    "month",
    "days_to_month_end",
    "is_payday",
    "lm7",
    "lm14",
    "lm28",
    "lm56",
    "trend_7_28",
    "trend_28_56",
    "zero_frac14",
    "zero_frac56",
    "cv28",
    "max_vs_mean28",
    "last_day",
    "wd_last",
    "wd_mean4",
    "wd_mean8",
    "wd_rel8",
    "wd_ratio8",
]


def level_scale(window: np.ndarray) -> np.ndarray:
    """Nível usado para normalizar o alvo: média dos últimos 28 dias + 1. window: [>=28, S]."""
    return window[-28:].mean(axis=0) + 1.0


def _calendar(date: pd.Timestamp) -> list[float]:
    month_end = date + pd.offsets.MonthEnd(0)
    days_to_end = (month_end - date).days
    return [
        float(date.dayofweek),
        float(date.day),
        float(date.month),
        float(days_to_end),
        float(date.day == 15 or days_to_end == 0),  # dias de pagamento (Equador/Brasil)
    ]


def base_stats(window: np.ndarray) -> dict[str, np.ndarray]:
    """Estatísticas por série da janela de LOOKBACK_DAYS terminando na origem. window: [56, S]."""
    m7 = window[-7:].mean(axis=0)
    m14 = window[-14:].mean(axis=0)
    m28 = window[-28:].mean(axis=0)
    m56 = window.mean(axis=0)
    lm = {k: np.log1p(v) for k, v in {"7": m7, "14": m14, "28": m28, "56": m56}.items()}
    std28 = window[-28:].std(axis=0)
    return {
        "lm7": lm["7"],
        "lm14": lm["14"],
        "lm28": lm["28"],
        "lm56": lm["56"],
        "trend_7_28": lm["7"] - lm["28"],
        "trend_28_56": lm["28"] - lm["56"],
        "zero_frac14": (window[-14:] == 0).mean(axis=0),
        "zero_frac56": (window == 0).mean(axis=0),
        "cv28": std28 / (m28 + 0.1),
        "max_vs_mean28": np.log1p(window[-28:].max(axis=0)) - lm["28"],
        "last_day": np.log1p(window[-1]),
    }


def weekday_stats(window: np.ndarray, horizon: int) -> dict[str, np.ndarray]:
    """Atributos do mesmo dia da semana do alvo, nas últimas semanas (janela terminando na origem)."""
    offset = (-horizon) % 7                      # distância até o último dia com o mesmo dia da semana
    idx = (len(window) - 1) - offset - 7 * np.arange(8)
    same_weekday = window[idx]                   # [8, S], do mais recente ao mais antigo
    lm28 = np.log1p(window[-28:].mean(axis=0))
    mean8 = same_weekday.mean(axis=0)
    return {
        "wd_last": np.log1p(same_weekday[0]),
        "wd_mean4": np.log1p(same_weekday[:4].mean(axis=0)),
        "wd_mean8": np.log1p(mean8),
        "wd_rel8": np.log1p(mean8) - lm28,
        "wd_ratio8": mean8 / (window.mean(axis=0) + 0.1),
    }


def assemble(
    stats: dict[str, np.ndarray],
    weekday: dict[str, np.ndarray],
    target_date: pd.Timestamp,
    horizon: int,
) -> np.ndarray:
    """Monta a matriz [S, len(FEATURE_NAMES)] para uma origem e um horizonte."""
    n_series = stats["lm7"].shape[0]
    calendar = _calendar(target_date)
    cols: dict[str, np.ndarray] = {
        "horizon": np.full(n_series, horizon, dtype=np.float32),
        "dow": np.full(n_series, calendar[0], dtype=np.float32),
        "dom": np.full(n_series, calendar[1], dtype=np.float32),
        "month": np.full(n_series, calendar[2], dtype=np.float32),
        "days_to_month_end": np.full(n_series, calendar[3], dtype=np.float32),
        "is_payday": np.full(n_series, calendar[4], dtype=np.float32),
        **stats,
        **weekday,
    }
    return np.column_stack([cols[name] for name in FEATURE_NAMES]).astype(np.float32)


def features_for_origin(
    values: np.ndarray, dates: pd.DatetimeIndex, origin: int, horizons: list[int]
) -> tuple[np.ndarray, np.ndarray]:
    """Atributos para todas as séries em uma origem. Retorna (X [len(h)*S, F], horizon_index)."""
    if origin < LOOKBACK_DAYS - 1:
        raise ValueError(f"origem {origin} sem histórico suficiente (precisa de {LOOKBACK_DAYS} dias)")
    window = values[origin - LOOKBACK_DAYS + 1 : origin + 1]
    stats = base_stats(window)
    blocks, tags = [], []
    for h in horizons:
        target_date = dates[origin] + pd.Timedelta(days=h)
        blocks.append(assemble(stats, weekday_stats(window, h), target_date, h))
        tags.append(np.full(window.shape[1], h))
    return np.vstack(blocks), np.concatenate(tags)


def build_training_set(
    values: np.ndarray,
    dates: pd.DatetimeIndex,
    origins: list[int],
    horizons_per_origin: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Amostra (origem, horizonte) e devolve X, y_ratio e a escala (para reconverter)."""
    xs, ys, scales = [], [], []
    for origin in origins:
        horizons = sorted(rng.choice(np.arange(1, MAX_HORIZON + 1), size=horizons_per_origin, replace=False).tolist())
        window = values[origin - LOOKBACK_DAYS + 1 : origin + 1]
        scale = level_scale(window)
        x, tags = features_for_origin(values, dates, origin, horizons)
        target = np.concatenate([values[origin + h] for h in horizons])
        xs.append(x)
        ys.append(target / np.tile(scale, len(horizons)))
        scales.append(np.tile(scale, len(horizons)))
    ratio = np.minimum(np.concatenate(ys), RATIO_CAP).astype(np.float32)
    return np.vstack(xs), ratio, np.concatenate(scales).astype(np.float32)


def history_to_matrix(daily: pd.Series, end: pd.Timestamp) -> np.ndarray:
    """Série diária esparsa (índice = data) -> vetor denso terminando em ``end`` (dias sem registro = 0)."""
    full_range = pd.date_range(daily.index.min().normalize(), end.normalize(), freq="D")
    return daily.reindex(full_range).fillna(0.0).clip(lower=0.0).to_numpy(dtype=np.float32)
