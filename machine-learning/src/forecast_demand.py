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
        grupo = grupo.sort_values("date").tail(WEEKS_HISTORY)
        if len(grupo) < 2:
            continue

        x = np.arange(len(grupo))
        y = grupo["quantidade_saida"].to_numpy()
        inclinacao, intercepto = np.polyfit(x, y, 1)
        previsao = max(0.0, inclinacao * len(grupo) + intercepto)

        linhas.append(
            {
                "categoria": categoria,
                "demanda_media_semanal": round(y.mean(), 1),
                "previsao_proxima_semana": round(previsao, 1),
                "tendencia": "alta" if inclinacao > 0.5 else "queda" if inclinacao < -0.5 else "estavel",
            }
        )

    return pd.DataFrame(linhas).sort_values("previsao_proxima_semana", ascending=False)


def main() -> None:
    print("Carregando histórico de saídas...")
    vendas = load_sales()
    print(f"{len(vendas):,} registros carregados.")

    semanal = weekly_demand(vendas)
    previsao = forecast_next_week(semanal)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    previsao.to_csv(OUTPUT_FILE, index=False)

    print("\nPrevisão de demanda por categoria (próxima semana):\n")
    print(previsao.to_string(index=False))
    print(f"\nResultado salvo em {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
