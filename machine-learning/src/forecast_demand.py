"""Previsão simples de demanda semanal por categoria de produto.

O banco de produção do StockIQ (Postgres/Prisma) ainda não acumulou
histórico suficiente de movimentações, então este protótipo usa o
histórico de vendas em data/raw/train.csv como massa de dados
equivalente. O mapeamento de colunas para o schema do StockIQ é:

    date        -> Movement.createdAt
    family      -> Category.name (Product.categoryId)
    store_nbr   -> WarehouseAddress (endereço físico do estoque)
    sales       -> Movement.quantity (nas movimentações do tipo "exit")

Quando o banco real tiver histórico suficiente, load_sales() pode ser
trocada por uma consulta SQL na tabela `movements` sem alterar o resto
do pipeline.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_FILE = BASE_DIR / "data" / "raw" / "train.csv"
OUTPUT_FILE = BASE_DIR / "data" / "previsao_demanda.csv"
WEEKS_HISTORY = 12
MIN_TRAIN_WEEKS = 4
EVALUATION_HORIZON = 4
EVALUATION_FILE = BASE_DIR / "data" / "avaliacao_temporal.csv"


def load_sales() -> pd.DataFrame:
    df = pd.read_csv(RAW_FILE, usecols=["date", "family", "sales"], parse_dates=["date"])
    return df.rename(columns={"family": "categoria", "sales": "quantidade_saida"})


def weekly_demand(df: pd.DataFrame) -> pd.DataFrame:
    semanal = (
        df.set_index("date")
        .groupby("categoria")["quantidade_saida"]
        .resample("W")
        .sum()
        .reset_index()
    )
    # a última semana do dataset costuma vir incompleta (corte no meio da
    # semana) e distorce a tendência para baixo, então ela é descartada
    return semanal[semanal["date"] < semanal["date"].max()]


def forecast_next_week(weekly: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for categoria, grupo in weekly.groupby("categoria"):
        grupo = grupo.sort_values("date")
        available_weeks = len(grupo)
        if available_weeks < MIN_TRAIN_WEEKS:
            linhas.append(
                {
                    "categoria": categoria,
                    "semanas_disponiveis": available_weeks,
                    "demanda_media_semanal": round(grupo["quantidade_saida"].mean(), 1),
                    "previsao_proxima_semana": None,
                    "tendencia": "insuficiente",
                    "status": "historico_insuficiente",
                }
            )
            continue

        y = grupo["quantidade_saida"].tail(WEEKS_HISTORY).to_numpy()
        inclinacao, intercepto = np.polyfit(np.arange(len(y)), y, 1)
        previsao = max(0.0, inclinacao * len(y) + intercepto)

        linhas.append(
            {
                "categoria": categoria,
                "semanas_disponiveis": available_weeks,
                "demanda_media_semanal": round(y.mean(), 1),
                "previsao_proxima_semana": round(previsao, 1),
                "tendencia": "alta" if inclinacao > 0.5 else "queda" if inclinacao < -0.5 else "estavel",
                "status": "previsao_disponivel",
            }
        )

    return pd.DataFrame(linhas).sort_values(
        "previsao_proxima_semana", ascending=False, na_position="last"
    )


def evaluate_temporal(weekly: pd.DataFrame) -> pd.DataFrame:
    """Evaluate expanding-window forecasts without using future observations."""
    results = []
    absolute_errors = []
    baseline_errors = []

    for categoria, grupo in weekly.groupby("categoria"):
        valores = grupo.sort_values("date")["quantidade_saida"].to_numpy(dtype=float)
        first_test = max(MIN_TRAIN_WEEKS, len(valores) - EVALUATION_HORIZON)
        category_errors = []
        category_baseline_errors = []

        for test_index in range(first_test, len(valores)):
            history = valores[max(0, test_index - WEEKS_HISTORY):test_index]
            if len(history) < MIN_TRAIN_WEEKS:
                continue
            slope, intercept = np.polyfit(np.arange(len(history)), history, 1)
            prediction = max(0.0, slope * len(history) + intercept)
            baseline_prediction = max(0.0, float(history.mean()))
            category_errors.append(abs(float(valores[test_index]) - prediction))
            category_baseline_errors.append(abs(float(valores[test_index]) - baseline_prediction))

        absolute_errors.extend(category_errors)
        baseline_errors.extend(category_baseline_errors)
        results.append(
            {
                "categoria": categoria,
                "semanas_avaliadas": len(category_errors),
                "mae_regressao": round(float(np.mean(category_errors)), 2) if category_errors else None,
                "mae_media": round(float(np.mean(category_baseline_errors)), 2) if category_baseline_errors else None,
                "status": "avaliado" if category_errors else "historico_insuficiente",
            }
        )

    results.append(
        {
            "categoria": "__geral__",
            "semanas_avaliadas": len(absolute_errors),
            "mae_regressao": round(float(np.mean(absolute_errors)), 2) if absolute_errors else None,
            "mae_media": round(float(np.mean(baseline_errors)), 2) if baseline_errors else None,
            "status": "avaliado" if absolute_errors else "historico_insuficiente",
        }
    )
    return pd.DataFrame(results)


def main() -> None:
    print("Carregando histórico de saídas...")
    vendas = load_sales()
    print(f"{len(vendas):,} registros carregados.")

    semanal = weekly_demand(vendas)
    previsao = forecast_next_week(semanal)
    avaliacao = evaluate_temporal(semanal)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    previsao.to_csv(OUTPUT_FILE, index=False)
    avaliacao.to_csv(EVALUATION_FILE, index=False)

    print("\nPrevisão de demanda por categoria (próxima semana):\n")
    print(previsao.to_string(index=False))
    print("\nAvaliação temporal (janela expansiva):\n")
    print(avaliacao.to_string(index=False))
    print(f"\nPrevisão salva em {OUTPUT_FILE}")
    print(f"Avaliação salva em {EVALUATION_FILE}")


if __name__ == "__main__":
    main()
