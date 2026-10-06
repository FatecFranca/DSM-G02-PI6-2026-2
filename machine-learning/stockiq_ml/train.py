"""CLI de treino: avalia no backtest e salva o modelo final em ``artifacts/``.

Uso::

    python -m stockiq_ml.train                # treino completo (~poucos minutos)
    python -m stockiq_ml.train --quick        # versão rápida p/ testar o pipeline

Etapas
1. carrega o Store Sales e monta a matriz dia × série;
2. treina um modelo *de validação* só com dados anteriores ao período de teste e mede o erro
   contra baselines (``metrics.json``);
3. treina o modelo *final* com todo o histórico utilizável e o salva (``demand_model.joblib``).
"""

from __future__ import annotations

import argparse
import json
import time

import numpy as np
import pandas as pd

from .config import ARTIFACTS_DIR, LOOKBACK_DAYS, MAX_HORIZON, METRICS_FILE, MODEL_FILE, RANDOM_STATE
from .data import SalesMatrix, load_sales_matrix
from .evaluate import backtest, last_train_origin
from .features import build_training_set
from .model import DemandModel


def training_origins(n_days: int, last_origin: int, stride: int, years: float) -> list[int]:
    first = max(LOOKBACK_DAYS - 1, last_origin - int(years * 365))
    return list(range(first, last_origin + 1, stride))


def fit(matrix: SalesMatrix, last_origin: int, args: argparse.Namespace) -> DemandModel:
    rng = np.random.default_rng(RANDOM_STATE)
    origins = training_origins(matrix.n_days, last_origin, args.stride, args.years)
    x, ratio, _ = build_training_set(matrix.values, matrix.dates, origins, args.horizons_per_origin, rng)
    print(f"  {len(origins)} origens × {args.horizons_per_origin} horizontes × {matrix.n_series} séries = {len(x):,} linhas")
    started = time.time()
    model = DemandModel(max_iter=args.max_iter).fit(x, ratio)
    print(f"  treinado em {time.time() - started:.0f}s")
    model.metadata.update(
        {
            "train_rows": int(len(x)),
            "train_origin_range": [str(matrix.dates[origins[0]].date()), str(matrix.dates[origins[-1]].date())],
            "max_iter": args.max_iter,
        }
    )
    return model


def print_table(results: dict[str, object]) -> None:
    rows = [(k, v) for k, v in results.items() if isinstance(v, dict) and "rmsle" in v]
    print(f"\n{'previsor':<24}{'RMSLE':>8}{'WAPE':>8}{'WAPE categ.':>13}{'viés %':>9}")
    for name, m in sorted(rows, key=lambda r: r[1]["rmsle"]):
        print(f"{name:<24}{m['rmsle']:>8}{m['wape']:>8}{m.get('wape_categoria', ''):>13}{m['vies_pct']:>9}")
    print(f"\nCobertura do intervalo p15–p85: {results['cobertura_intervalo']:.0%} (ideal ≈ 80%)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--quick", action="store_true", help="treino reduzido (smoke test do pipeline)")
    parser.add_argument("--stride", type=int, default=4, help="dias entre origens de treino")
    parser.add_argument("--years", type=float, default=2.5, help="anos de origens usados no treino")
    parser.add_argument("--horizons-per-origin", type=int, default=7, help="horizontes sorteados por origem")
    parser.add_argument("--max-iter", type=int, default=300)
    parser.add_argument("--skip-eval", action="store_true")
    args = parser.parse_args()
    if args.quick:
        args.stride, args.years, args.horizons_per_origin, args.max_iter = 14, 1.0, 4, 80

    print("1) Carregando Store Sales…")
    matrix = load_sales_matrix()
    print(f"  {matrix.n_series} séries × {matrix.n_days} dias ({matrix.dates[0].date()} → {matrix.dates[-1].date()})")

    metrics: dict[str, object] = {}
    if not args.skip_eval:
        print("2) Backtest: modelo treinado só com dados anteriores ao período de teste")
        validation_model = fit(matrix, last_train_origin(matrix.n_days), args)
        metrics = backtest(validation_model, matrix.values, matrix.dates, matrix.series["family"].to_numpy())
        print_table(metrics)

    print("3) Treinando o modelo final com todo o histórico utilizável")
    final_origin = matrix.n_days - 1 - MAX_HORIZON
    model = fit(matrix, final_origin, args)
    model.metadata.update(
        {
            "trained_on": "Store Sales - Time Series Forecasting (Kaggle)",
            "data_range": [str(matrix.dates[0].date()), str(matrix.dates[-1].date())],
            "n_series": matrix.n_series,
            "backtest": metrics,
        }
    )
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model.save(MODEL_FILE)
    METRICS_FILE.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nModelo salvo em {MODEL_FILE}\nMétricas em {METRICS_FILE}")


if __name__ == "__main__":
    main()
