"""Previsão de demanda dos produtos do próprio sistema (movimentações de saída do WMS).

Usa o mesmo método do notebook (`machine-learning/Previsao_Vendas.ipynb`): regressão supervisionada sobre uma tabela
de atributos, comparando Regressão Linear (com SelectKBest) e Random Forest, avaliados por R², MAE e RMSE. A diferença
é a base: aqui o alvo é a quantidade que sai do estoque de cada produto por dia, a partir do histórico enviado pelo
backend (`POST /wms/forecast`), e não as vendas do Kaggle.

Formato da tabela de treino (uma linha = um produto, uma origem O e um dia-alvo O+k):
  - do produto, conhecidos até O: média dos últimos 7/28/56 dias, média geral, fração de dias com saída, dias desde a
    última saída e média do mesmo dia da semana nas últimas 8 semanas;
  - do dia-alvo: dia da semana, dia do mês, mês, distância k (1..H) e se é início/fim de mês.
Nenhuma linha usa informação posterior à origem, então não há vazamento. O modelo final é treinado até a última data
conhecida (`asOf`) e prevê os H dias seguintes; a faixa de incerteza vem do percentil 10–90 das árvores.

O backtest reserva as duas últimas janelas de 14 dias: treina só com o que aconteceu antes de cada janela, prevê a
janela e compara com o que de fato saiu — contra a média do mesmo dia da semana nas últimas 8 semanas (baseline).
As métricas são calculadas por produto e semana (o nível em que se decide uma compra).
"""
from __future__ import annotations

import hashlib
import json
import threading
from datetime import date, datetime, timedelta, timezone

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

VERSION = "wms-rf-1"
BASELINE_NAME = "media_mesmo_dia_8sem"
MIN_HISTORY_DAYS = 56          # menos que isso: média simples dos últimos 28 dias
MIN_ACTIVE_DAYS = 5            # menos dias com saída que isso: média simples
FIRST_ORIGIN = 56              # primeiro dia do histórico com contexto suficiente para virar origem
ORIGIN_STEP = 5
BACKTEST_HORIZON = 14
BACKTEST_FOLDS = 4
MAX_ROWS = 120_000
# Dia do mês e mês ficam de fora por parcimônia: com cerca de um ano de histórico cada mês aparece uma única vez, então
# o modelo não consegue separar sazonalidade de tendência. Na ablação do notebook (Previsao_Vendas_Completo.ipynb) as duas
# versões ficaram equivalentes (R² 0,17 contra 0,20 em 200 amostras: diferença dentro do ruído). Reavaliar com 2 anos.
FEATURES = [
    "mean7", "mean28", "mean56", "mean_all", "active_rate28", "days_since_sale", "same_dow_8w",
    "dow", "k", "month_start", "month_end",
]
FEATURE_LABELS = {
    "mean7": "Média dos últimos 7 dias", "mean28": "Média dos últimos 28 dias", "mean56": "Média dos últimos 56 dias",
    "mean_all": "Média de todo o histórico", "active_rate28": "Frequência de saídas (28 dias)",
    "days_since_sale": "Dias desde a última saída", "same_dow_8w": "Média do mesmo dia da semana (8 semanas)",
    "dow": "Dia da semana", "k": "Dias à frente",
    "month_start": "Início do mês", "month_end": "Fim do mês",
}

_lock = threading.Lock()
_cache: dict[str, dict] = {}
_last_info: dict | None = None


# ── Preparação ───────────────────────────────────────────────────────────────

def _d(value: str | date) -> date:
    return value if isinstance(value, date) else date.fromisoformat(value)


def dense_matrix(series: list[dict], as_of: date) -> tuple[np.ndarray, date]:
    """Matriz (produtos × dias) com a quantidade diária; dias sem saída valem 0. Termina em `as_of`."""
    first = min((_d(p["date"]) for s in series for p in s["history"]), default=as_of)
    first = min(first, as_of)
    n = (as_of - first).days + 1
    y = np.zeros((len(series), n), dtype=float)
    for i, s in enumerate(series):
        for p in s["history"]:
            idx = (_d(p["date"]) - first).days
            if 0 <= idx < n:
                y[i, idx] += float(p["quantity"])
    return y, first


def _context(y: np.ndarray, origin: int) -> dict[str, np.ndarray]:
    """Atributos do produto conhecidos no fim do dia `origin` (índice inclusivo)."""
    upto = y[:, : origin + 1]
    last_sale = np.where(upto > 0, np.arange(origin + 1)[None, :], -1).max(axis=1)
    return {
        "mean7": upto[:, -7:].mean(axis=1),
        "mean28": upto[:, -28:].mean(axis=1),
        "mean56": upto[:, -56:].mean(axis=1),
        "mean_all": upto.mean(axis=1),
        "active_rate28": (upto[:, -28:] > 0).mean(axis=1),
        "days_since_sale": np.where(last_sale >= 0, origin - last_sale, origin + 1).astype(float),
    }


def _same_dow(y: np.ndarray, origin: int, target: int) -> np.ndarray:
    """Média do mesmo dia da semana do alvo nas últimas 8 semanas anteriores à origem."""
    idx = [target - 7 * w for w in range(1, 9)]
    idx = [i for i in idx if 0 <= i <= origin]
    if not idx:
        return y[:, : origin + 1].mean(axis=1)
    return y[:, idx].mean(axis=1)


def _features(y: np.ndarray, first: date, origin: int, horizon: int) -> np.ndarray:
    """Linhas (produto × k) para a origem dada: matriz (n_produtos*horizon, len(FEATURES)), ordenada por produto e k."""
    ctx = _context(y, origin)
    rows = []
    for k in range(1, horizon + 1):
        day = first + timedelta(days=origin + k)
        nxt = day + timedelta(days=1)
        cal = [day.weekday(), k, float(day.day <= 3), float(nxt.month != day.month or day.day >= 28)]
        same = _same_dow(y, origin, origin + k)
        block = np.column_stack([
            ctx["mean7"], ctx["mean28"], ctx["mean56"], ctx["mean_all"], ctx["active_rate28"], ctx["days_since_sale"],
            same, np.tile(cal, (y.shape[0], 1)),
        ])
        rows.append(block)
    stacked = np.stack(rows, axis=1)  # produto × k × atributo
    return stacked.reshape(-1, len(FEATURES))


def training_table(y: np.ndarray, first: date, last_target: int, horizon: int, step: int = ORIGIN_STEP):
    """Tabela de treino com origens espaçadas; só entram alvos até o índice `last_target`."""
    xs, ys = [], []
    n_prod = y.shape[0]
    for origin in range(FIRST_ORIGIN - 1, last_target, step):
        usable = min(horizon, last_target - origin)
        if usable < 1:
            continue
        x = _features(y, first, origin, usable)
        target = np.stack([y[:, origin + k] for k in range(1, usable + 1)], axis=1).reshape(-1)  # produto × k
        xs.append(x)
        ys.append(target)
    if not xs:
        return np.empty((0, len(FEATURES))), np.empty(0)
    x_all, y_all = np.vstack(xs), np.concatenate(ys)
    if len(y_all) > MAX_ROWS:
        pick = np.random.default_rng(1).choice(len(y_all), MAX_ROWS, replace=False)
        x_all, y_all = x_all[pick], y_all[pick]
    _ = n_prod
    return x_all, y_all


def _forest() -> RandomForestRegressor:
    return RandomForestRegressor(n_estimators=60, max_depth=12, min_samples_leaf=40, n_jobs=-1, random_state=1)


Z80 = 1.2816  # faixa de 80% (percentil 10–90 de uma normal)


def _predict_forest(model: RandomForestRegressor, x: np.ndarray, spread: np.ndarray):
    """Previsão média + faixa de 80%. `spread` é o desvio diário de cada linha (do produto): as árvores só medem a
    incerteza da média, não a variação do dia a dia, e por isso subestimam a faixa (cobertura de ~1/3 no backtest)."""
    mean = np.clip(model.predict(x), 0, None)
    return mean, np.clip(mean - Z80 * spread, 0, None), mean + Z80 * spread


def _spread(y: np.ndarray, origin: int, horizon: int) -> np.ndarray:
    """Desvio padrão diário (últimos 56 dias até a origem) repetido para cada dia do horizonte: produto × k."""
    sd = y[:, max(0, origin - 55): origin + 1].std(axis=1)
    return np.repeat(sd, horizon)


# ── Backtest ─────────────────────────────────────────────────────────────────

def _weekly(values: np.ndarray, n_prod: int, horizon: int) -> np.ndarray:
    """(produto × k) → soma por produto e por semana de 7 dias."""
    grid = values.reshape(n_prod, horizon)
    weeks = horizon // 7
    return grid[:, : weeks * 7].reshape(n_prod, weeks, 7).sum(axis=2).reshape(-1)


def _scores(pred: np.ndarray, actual: np.ndarray) -> dict:
    total = float(actual.sum())
    return {
        "r2": round(float(r2_score(actual, pred)), 4) if len(actual) > 1 and actual.std() > 0 else None,
        "mae": round(float(mean_absolute_error(actual, pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(actual, pred))), 3),
        "rmsle": round(float(np.sqrt(np.mean((np.log1p(np.clip(pred, 0, None)) - np.log1p(actual)) ** 2))), 4),
        "wape": round(float(np.abs(pred - actual).sum() / total), 4) if total > 0 else None,
        "vies_pct": round(float((pred.sum() - total) / total * 100), 2) if total > 0 else None,
    }


def backtest(y: np.ndarray, first: date, horizon: int = BACKTEST_HORIZON, folds: int = BACKTEST_FOLDS) -> dict | None:
    n_days = y.shape[1]
    n_prod = y.shape[0]
    preds: dict[str, list[np.ndarray]] = {"rf": [], "linear": [], "baseline": []}
    actuals, covered, daily_total, origins = [], 0, 0, []
    for f in range(folds):
        origin = n_days - 1 - horizon * (f + 1)  # a janela de teste é origin+1 .. origin+horizon
        if origin < FIRST_ORIGIN + 14:
            break
        x_train, y_train = training_table(y, first, origin, 28)
        if len(y_train) < 200:
            break
        x_test = _features(y, first, origin, horizon)
        actual = np.stack([y[:, origin + k] for k in range(1, horizon + 1)], axis=1).reshape(-1)

        forest = _forest().fit(x_train, y_train)
        mean, low, high = _predict_forest(forest, x_test, _spread(y, origin, horizon))
        k_best = min(6, x_train.shape[1])
        selector = SelectKBest(f_regression, k=k_best).fit(x_train, y_train)
        linear = LinearRegression().fit(selector.transform(x_train), y_train)
        lin = np.clip(linear.predict(selector.transform(x_test)), 0, None)
        base = x_test[:, FEATURES.index("same_dow_8w")]

        for name, p in (("rf", mean), ("linear", lin), ("baseline", base)):
            preds[name].append(_weekly(p, n_prod, horizon))
        actuals.append(_weekly(actual, n_prod, horizon))
        covered += int(((actual >= low - 1e-9) & (actual <= high + 1e-9)).sum())
        daily_total += len(actual)
        origins.append((first + timedelta(days=origin)).isoformat())
    if not actuals:
        return None
    a = np.concatenate(actuals)
    return {
        "horizonte_dias": horizon,
        "origens_teste": origins[::-1],
        "nivel": "produto × semana",
        "modelo_rf": _scores(np.concatenate(preds["rf"]), a),
        "regressao_linear": _scores(np.concatenate(preds["linear"]), a),
        BASELINE_NAME: _scores(np.concatenate(preds["baseline"]), a),
        "cobertura_intervalo": round(covered / daily_total, 3) if daily_total else 0,
        "amostras": int(len(a)),
    }


# ── Previsão ─────────────────────────────────────────────────────────────────

def _flat_forecast(series_y: np.ndarray, as_of: date, horizon: int) -> list[dict]:
    mean = float(series_y[-28:].mean()) if len(series_y) else 0.0
    return [{"date": (as_of + timedelta(days=k)).isoformat(), "mean": round(mean, 3),
             "low": round(mean * 0.5, 3), "high": round(mean * 1.5, 3)} for k in range(1, horizon + 1)]


def forecast(series: list[dict], as_of_str: str, horizon: int) -> dict:
    """Treina com o histórico recebido e devolve a previsão diária de cada produto (contrato de /wms/forecast)."""
    global _last_info
    as_of = _d(as_of_str)
    payload = json.dumps({"a": as_of_str, "h": horizon, "s": series}, sort_keys=True, default=str)
    key = hashlib.sha256(payload.encode()).hexdigest()
    with _lock:
        if key in _cache:
            _last_info = _cache[key]["info"]
            return _cache[key]["body"]

        y, first = dense_matrix(series, as_of)
        n_days = y.shape[1]
        n_prod = y.shape[0]
        active = (y > 0).sum(axis=1)
        # Histórico de cada produto = do primeiro dia com saída até `asOf` (o calendário é comum a todos, mas um produto
        # novo não pode ser tratado como se existisse desde o início).
        first_sale = np.where(active > 0, (y > 0).argmax(axis=1), n_days)
        eligible = np.array([n_days - first_sale[i] >= MIN_HISTORY_DAYS and active[i] >= MIN_ACTIVE_DAYS for i in range(n_prod)])

        started = datetime.now(timezone.utc)
        results: dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
        importance: list[dict] = []
        bt = None
        if eligible.any():
            sub = y[eligible]
            x_train, y_train = training_table(sub, first, n_days - 1, 28)
            if len(y_train) >= 200:
                forest = _forest().fit(x_train, y_train)
                x_pred = _features(sub, first, n_days - 1, horizon)
                mean, low, high = _predict_forest(forest, x_pred, _spread(sub, n_days - 1, horizon))
                shape = (sub.shape[0], horizon)
                mean, low, high = mean.reshape(shape), low.reshape(shape), high.reshape(shape)
                for j, i in enumerate(np.flatnonzero(eligible)):
                    results[int(i)] = (mean[j], low[j], high[j])
                weights = forest.feature_importances_
                importance = [{"feature": f, "label": FEATURE_LABELS[f], "weight": round(float(w), 4)}
                              for f, w in sorted(zip(FEATURES, weights), key=lambda t: -t[1])]
                bt = backtest(sub, first)

        forecasts = []
        for i, s in enumerate(series):
            if i in results:
                mean, low, high = results[i]
                daily = [{"date": (as_of + timedelta(days=k + 1)).isoformat(), "mean": round(float(mean[k]), 3),
                          "low": round(float(low[k]), 3), "high": round(float(high[k]), 3)} for k in range(horizon)]
                method = "rf"
            else:
                daily, method = _flat_forecast(y[i], as_of, horizon), "mean"
            forecasts.append({"id": s["id"], "method": method, "historyDays": len(s["history"]), "daily": daily})

        info = {
            "package_version": VERSION,
            "trained_on": f"{int(eligible.sum())} de {n_prod} produtos · {n_days} dias de saídas do sistema (Random Forest)",
            "saved_at": started.isoformat(),
            "data_range": [first.isoformat(), as_of.isoformat()],
            "backtest": bt,
            "importance": importance,
            "algorithm": "Random Forest (60 árvores) comparado a Regressão Linear com SelectKBest e à média do mesmo dia da semana",
            "products_modelled": int(eligible.sum()),
            "products_total": n_prod,
        }
        body = {"forecasts": forecasts}
        if len(_cache) >= 8:
            _cache.pop(next(iter(_cache)))
        _cache[key] = {"body": body, "info": info}
        _last_info = info
        return body


def last_info() -> dict | None:
    return _last_info
