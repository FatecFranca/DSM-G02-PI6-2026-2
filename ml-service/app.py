"""API de simulação de vendas (FastAPI). Sobe com ./start.sh e é consumida pelo backend em /api/simulation."""
from __future__ import annotations

import os
import threading
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import sales_model

HERE = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("ML_DATA_DIR", HERE.parent / "machine-learning" / "store-sales-time-series-forecasting"))
ARTIFACTS = Path(os.environ.get("ML_ARTIFACTS_DIR", HERE / "artifacts"))
EXTRA_MODELS = os.environ.get("ML_EXTRA_MODELS", "true").lower() != "false"
MAX_SCENARIOS = 400

state: dict = {"status": "loading", "message": "Iniciando…", "bundle": None, "fromCache": None}


def _boot() -> None:
    try:
        if not (DATA_DIR / "train.csv").exists():
            raise FileNotFoundError(f"train.csv não encontrado em {DATA_DIR} (defina ML_DATA_DIR)")
        state.update(status="training", message="Carregando os dados e treinando os modelos (cerca de 1 minuto na primeira vez)…")
        bundle, cached = sales_model.load_or_train(DATA_DIR, ARTIFACTS, EXTRA_MODELS)
        state.update(status="ready", message="Modelos prontos", bundle=bundle, fromCache=cached)
    except Exception as err:  # noqa: BLE001 - registra o motivo para /health
        state.update(status="error", message=f"{type(err).__name__}: {err}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_boot, daemon=True).start()  # o serviço responde /health enquanto treina
    yield


app = FastAPI(title="StockIQ — Simulação de vendas", version="1.0.0", lifespan=lifespan)


def _ready():
    if state["status"] != "ready":
        raise HTTPException(status_code=503, detail=state["message"])
    return state["bundle"]


class Scenario(BaseModel):
    store: int = Field(..., description="Loja (1 a 5)")
    family: str = Field(..., description="Família de produtos (ex.: GROCERY I)")
    date: date
    onpromotion: int = Field(0, ge=0, le=10_000, description="Itens da família em promoção (vira uma das 4 faixas do notebook)")
    oil: float | None = Field(None, ge=0, le=500, description="Preço do petróleo; padrão: último valor da base")


class PredictRequest(BaseModel):
    scenarios: list[Scenario] = Field(..., min_length=1, max_length=MAX_SCENARIOS)
    models: list[str] | None = None


@app.get("/health")
def health():
    bundle = state["bundle"]
    return {"status": state["status"], "ready": state["status"] == "ready", "message": state["message"],
            "fromCache": state["fromCache"], "trainedAt": bundle.trained_at if bundle else None}


@app.get("/model")
def model_info():
    return _ready().info()


@app.post("/predict")
def predict(body: PredictRequest):
    bundle = _ready()
    stores = {s["id"] for s in bundle.stores}
    for i, sc in enumerate(body.scenarios):
        if sc.store not in stores:
            raise HTTPException(422, f"Cenário {i}: loja {sc.store} fora do treino (use {sorted(stores)})")
        if sc.family not in bundle.families:
            raise HTTPException(422, f"Cenário {i}: família '{sc.family}' desconhecida")
    if body.models:
        unknown = [m for m in body.models if m not in bundle.models]
        if unknown:
            raise HTTPException(422, f"Modelos desconhecidos: {unknown}")
    scenarios = [sc.model_dump() | {"date": sc.date.isoformat()} for sc in body.scenarios]
    return {"predictions": bundle.predict(scenarios, body.models)}
