"""Modelos de previsão de vendas do notebook `machine-learning/Previsao_Vendas.ipynb`, servidos por API.

O notebook NÃO é alterado nem executado aqui: este módulo reproduz, na mesma ordem e com os mesmos parâmetros, as etapas
de pré-processamento, a divisão treino/teste (70/30, random_state=1), a seleção de atributos (SelectKBest e RFE, 10 atributos)
e os quatro modelos (Regressão Linear e Random Forest com cada seleção). As métricas no conjunto de teste coincidem com as do
notebook (R² 0,6270 · 0,6279 · 0,6337 · 0,9156) — ver tests/test_equivalence.py.

Além dos quatro modelos do notebook, há um modelo complementar (`rf_full`): Random Forest com os 41 atributos, que — diferente dos
modelos com seleção — enxerga dia da semana, mês e preço do petróleo, permitindo simular datas. Ele é identificado como
complementar e não faz parte do notebook.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import date as Date
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn import metrics
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_selection import RFE, SelectKBest, f_regression
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

CODE_VERSION = "1"
PROMO_BINS = [-1, 0, 3, 16, float("inf")]  # notebook, etapa 6: 0 · 1–3 · 4–16 · >16 itens em promoção
PROMO_LABELS = ["0 itens", "1–3 itens", "4–16 itens", "mais de 16 itens"]

MODEL_NAMES = {
    "kbest_linear": ("Regressão Linear", "SelectKBest", "notebook"),
    "kbest_rf": ("Random Forest", "SelectKBest", "notebook"),
    "rfe_linear": ("Regressão Linear", "RFE", "notebook"),
    "rfe_rf": ("Random Forest", "RFE", "notebook"),
    "rf_full": ("Random Forest", "41 atributos", "complementar"),
}


def promo_band(items: int) -> int:
    """Mesma faixa do notebook (pd.cut com os mesmos limites)."""
    return int(pd.cut([items], bins=PROMO_BINS, labels=[0, 1, 2, 3])[0])


def load_training_table(data_dir: Path):
    """Pré-processamento — cópia fiel das etapas 0–8 do notebook (células 'Pré-processamento da base')."""
    tabela = pd.read_csv(data_dir / "train.csv", sep=",")
    lojas = pd.read_csv(data_dir / "stores.csv", sep=",")
    petroleo = pd.read_csv(data_dir / "oil.csv", sep=",")

    # 0) descartar o período anterior à primeira venda de cada loja
    vendas_dia = tabela.groupby(["store_nbr", "date"])["sales"].sum().reset_index()
    primeira_venda = vendas_dia[vendas_dia["sales"] > 0].groupby("store_nbr")["date"].min()
    tabela["primeira_venda"] = tabela["store_nbr"].map(primeira_venda)
    tabela = tabela[tabela["date"] >= tabela["primeira_venda"]].drop(columns="primeira_venda")

    # 1) recorte: lojas 1 a 5, a partir de 2016
    tabela = tabela[(tabela["store_nbr"] <= 5) & (tabela["date"] >= "2016-01-01")].copy()

    # 2) duplicados e campos essenciais ausentes
    if tabela.duplicated().sum():
        tabela = tabela.drop_duplicates().copy()
    chaves = ["date", "store_nbr", "family", "sales"]
    if tabela[chaves].isna().any(axis=1).sum():
        tabela = tabela.dropna(subset=chaves).copy()

    # 3) loja e petróleo
    tabela = tabela.merge(lojas[["store_nbr", "type", "cluster"]], on="store_nbr", how="left")
    petroleo["date"] = pd.to_datetime(petroleo["date"])
    dias = pd.date_range(petroleo["date"].min(), "2017-08-31")
    petroleo = petroleo.set_index("date").reindex(dias).ffill().bfill().rename_axis("date").reset_index()
    tabela["date"] = pd.to_datetime(tabela["date"])
    tabela = tabela.merge(petroleo, on="date", how="left")

    # 4) ausentes nos atributos
    for atributo in tabela.select_dtypes(include="number").columns:
        if atributo != "sales" and tabela[atributo].isna().any():
            tabela[atributo] = tabela[atributo].fillna(tabela[atributo].median())
    for atributo in ["family", "type"]:
        tabela[atributo] = tabela[atributo].fillna("Desconhecido")

    # 6) agrupar onpromotion em quatro faixas
    tabela["onpromotion"] = pd.cut(tabela["onpromotion"], bins=PROMO_BINS, labels=[0, 1, 2, 3]).astype("int8")

    # 7) atributos de data
    tabela["dia_semana"] = tabela["date"].dt.dayofweek
    tabela["dia_mes"] = tabela["date"].dt.day
    tabela["mes"] = tabela["date"].dt.month

    # 8) remover id/date e codificar
    tabela = tabela.drop(columns=["id", "date"])
    tabela = pd.get_dummies(tabela, columns=["family", "type"], dtype=int)
    for atributo in tabela.columns:
        if atributo != "sales" and tabela[atributo].isna().any():
            tabela[atributo] = tabela[atributo].fillna(tabela[atributo].median())

    return tabela, lojas, petroleo


@dataclass
class Bundle:
    columns: list[str]
    models: dict[str, Any]
    features: dict[str, list[str]]
    metrics: dict[str, dict[str, float]]
    importance: dict[str, list[dict[str, Any]]]
    stores: list[dict[str, Any]]
    families: list[str]
    oil: dict[str, float]
    dataset: dict[str, Any]
    trained_at: str
    seconds: float
    extra: dict[str, Any] = field(default_factory=dict)

    # ── informações para a API ──────────────────────────────────────────────
    def info(self) -> dict[str, Any]:
        return {
            "trainedAt": self.trained_at,
            "trainingSeconds": round(self.seconds, 1),
            "dataset": self.dataset,
            "stores": self.stores,
            "families": self.families,
            "oil": self.oil,
            "promoBands": [{"band": i, "label": label} for i, label in enumerate(PROMO_LABELS)],
            "models": [
                {
                    "id": model_id,
                    "name": MODEL_NAMES[model_id][0],
                    "selection": MODEL_NAMES[model_id][1],
                    "origin": MODEL_NAMES[model_id][2],
                    "usesDate": any(f in self.features[model_id] for f in ("dia_semana", "dia_mes", "mes", "dcoilwtico")),
                    "features": self.features[model_id],
                    "metrics": self.metrics[model_id],
                    "importance": self.importance[model_id],
                }
                for model_id in self.models
            ],
        }

    # ── previsão ────────────────────────────────────────────────────────────
    def _frame(self, scenarios: list[dict[str, Any]]) -> pd.DataFrame:
        store_cluster = {s["id"]: s for s in self.stores}
        rows = []
        for sc in scenarios:
            store = store_cluster[sc["store"]]
            day = pd.Timestamp(sc["date"])
            row = dict.fromkeys(self.columns, 0)
            row["store_nbr"] = store["id"]
            row["cluster"] = store["cluster"]
            row["onpromotion"] = promo_band(sc.get("onpromotion", 0))
            row["dcoilwtico"] = sc.get("oil") if sc.get("oil") is not None else self.oil["default"]
            row["dia_semana"] = int(day.dayofweek)
            row["dia_mes"] = int(day.day)
            row["mes"] = int(day.month)
            row[f"family_{sc['family']}"] = 1
            if f"type_{store['type']}" in row:
                row[f"type_{store['type']}"] = 1
            rows.append(row)
        return pd.DataFrame(rows, columns=self.columns)

    def predict(self, scenarios: list[dict[str, Any]], model_ids: list[str] | None = None) -> list[dict[str, float]]:
        ids = model_ids or list(self.models)
        frame = self._frame(scenarios)
        out: list[dict[str, float]] = [dict() for _ in scenarios]
        for model_id in ids:
            values = self.models[model_id].predict(frame[self.features[model_id]])
            for i, value in enumerate(values):
                out[i][model_id] = round(max(0.0, float(value)), 2)  # venda não pode ser negativa
        return out


def _evaluate(model, x_test, y_test) -> dict[str, float]:
    pred = model.predict(x_test)
    return {
        "r2": round(float(metrics.r2_score(y_test, pred)), 4),
        "mae": round(float(metrics.mean_absolute_error(y_test, pred)), 2),
        "rmse": round(float(np.sqrt(metrics.mean_squared_error(y_test, pred))), 2),
    }


def _importance(model_id: str, model, columns: list[str]) -> list[dict[str, Any]]:
    if hasattr(model, "feature_importances_"):
        values = model.feature_importances_
    else:  # pipeline com regressão linear: |coeficiente| padronizado
        values = np.abs(model.named_steps["linearregression"].coef_)
    total = float(np.sum(values)) or 1.0
    ranked = sorted(zip(columns, values), key=lambda item: -item[1])[:10]
    return [{"feature": name, "weight": round(float(value) / total, 4)} for name, value in ranked]


def train(data_dir: Path, extra_models: bool = True) -> Bundle:
    started = time.time()
    tabela, lojas, petroleo = load_training_table(data_dir)

    y = tabela["sales"]
    x = tabela.drop("sales", axis=1)
    x_treino, x_teste, y_treino, y_teste = train_test_split(x, y, test_size=0.3, random_state=1)

    numero_atributos = min(10, x_treino.shape[1])
    kbest = SelectKBest(score_func=f_regression, k=numero_atributos).fit(x_treino, y_treino)
    atributos_kbest = x.columns[kbest.get_support()].tolist()
    rfe = RFE(
        estimator=make_pipeline(StandardScaler(), LinearRegression()),
        importance_getter="named_steps.linearregression.coef_",
        n_features_to_select=numero_atributos,
    ).fit(x_treino, y_treino)
    atributos_rfe = x.columns[rfe.get_support()].tolist()

    def forest():
        return RandomForestRegressor(n_estimators=50, n_jobs=-1, random_state=1)

    def linear():
        return make_pipeline(StandardScaler(), LinearRegression())

    models: dict[str, Any] = {}
    features: dict[str, list[str]] = {}
    for model_id, feats, factory in [
        ("kbest_linear", atributos_kbest, linear), ("kbest_rf", atributos_kbest, forest),
        ("rfe_linear", atributos_rfe, linear), ("rfe_rf", atributos_rfe, forest),
    ]:
        models[model_id] = factory().fit(x_treino[feats], y_treino)
        features[model_id] = feats
    if extra_models:
        models["rf_full"] = forest().fit(x_treino, y_treino)
        features["rf_full"] = list(x.columns)

    result_metrics = {mid: _evaluate(m, x_teste[features[mid]], y_teste) for mid, m in models.items()}
    importance = {mid: _importance(mid, m, features[mid]) for mid, m in models.items()}

    stores = [
        {"id": int(r.store_nbr), "city": r.city, "state": r.state, "type": r.type, "cluster": int(r.cluster)}
        for r in lojas[lojas["store_nbr"] <= 5].itertuples()
    ]
    families = sorted(c.removeprefix("family_") for c in x.columns if c.startswith("family_"))
    oil_series = petroleo["dcoilwtico"].dropna()
    dataset = {
        "rows": int(len(tabela)), "trainRows": int(len(x_treino)), "testRows": int(len(x_teste)),
        "attributes": int(x.shape[1]), "stores": [s["id"] for s in stores], "families": len(families),
        "split": "70% treino / 30% teste, aleatório (random_state=1), como no notebook",
    }
    return Bundle(
        columns=list(x.columns), models=models, features=features, metrics=result_metrics, importance=importance,
        stores=stores, families=families,
        oil={"default": round(float(oil_series.iloc[-1]), 2), "min": round(float(oil_series.min()), 2), "max": round(float(oil_series.max()), 2)},
        dataset=dataset, trained_at=pd.Timestamp.now(tz="UTC").isoformat(), seconds=time.time() - started,
    )


# ── cache em disco ───────────────────────────────────────────────────────────
def signature(data_dir: Path, extra_models: bool) -> dict[str, Any]:
    stats = {name: (data_dir / name).stat() for name in ("train.csv", "stores.csv", "oil.csv")}
    return {"version": CODE_VERSION, "extra": extra_models, **{n: [s.st_size, int(s.st_mtime)] for n, s in stats.items()}}


def load_or_train(data_dir: Path, artifacts: Path, extra_models: bool = True) -> tuple[Bundle, bool]:
    """Devolve (modelos, veio_do_cache). Retreina se os dados ou o código mudaram."""
    artifacts.mkdir(parents=True, exist_ok=True)
    sig_file, bundle_file = artifacts / "signature.json", artifacts / "bundle.joblib"
    wanted = signature(data_dir, extra_models)
    if sig_file.exists() and bundle_file.exists():
        try:
            if json.loads(sig_file.read_text()) == wanted:
                return joblib.load(bundle_file), True
        except Exception:
            pass  # cache ilegível: treina de novo
    bundle = train(data_dir, extra_models)
    joblib.dump(bundle, bundle_file, compress=3)
    sig_file.write_text(json.dumps(wanted))
    return bundle, False
