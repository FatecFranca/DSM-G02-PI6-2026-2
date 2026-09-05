# Machine Learning — Previsão de Demanda

Módulo de mineração de dados do StockIQ, referente ao componente curricular
**Mineração de Dados** (ver [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#mineração-de-dados)
na raiz do projeto). Contém o primeiro protótipo de **previsão de demanda por
categoria de produto**, etapa 4 (Modelagem) do plano CRISP-DM descrito lá.

## Por que um dataset externo?

O banco de produção do StockIQ (Postgres, ver [backend/prisma/schema.prisma](../backend/prisma/schema.prisma))
ainda não acumulou histórico real de movimentações suficiente para treinar
um modelo. Enquanto a massa de dados simulada do próprio sistema não é
gerada (próximo passo do CRISP-DM), este módulo usa o dataset público
[Store Sales - Time Series Forecasting](https://www.kaggle.com/competitions/store-sales-time-series-forecasting)
(Corporación Favorita) como massa de dados equivalente, só para validar o
pipeline de previsão ponta a ponta.

O dataset é estruturalmente muito parecido com o domínio do StockIQ (venda
diária por loja e por categoria de produto), o que facilita a migração
posterior para dados reais. O mapeamento de colunas é:

| Coluna do dataset | Conceito equivalente no StockIQ |
|---|---|
| `date` | `Movement.createdAt` |
| `family` | `Category.name` (via `Product.categoryId`) |
| `store_nbr` | `WarehouseAddress` (endereço físico do estoque) |
| `sales` | `Movement.quantity`, somado nas movimentações do tipo `exit` |
| `onpromotion` | aproximação futura de `Movement.exitReason` |

Quando o banco tiver histórico real, basta trocar a função `load_sales()`
em [src/forecast_demand.py](src/forecast_demand.py) por uma consulta SQL na
tabela `movements` — o resto do pipeline (agregação semanal + previsão) não
muda.

## Estrutura

```
machine-learning/
├── data/
│   ├── databases.zip     # dataset original (não versionado)
│   ├── raw/               # CSVs extraídos do zip (não versionado)
│   └── previsao_demanda.csv  # saída gerada pelo script (não versionado)
├── src/
│   └── forecast_demand.py # script principal
├── requirements.txt
└── README.md
```

`data/` está no `.gitignore` — os CSVs somam mais de 100 MB e são
regeneráveis a partir do zip, então não fazem sentido no controle de
versão.

## Algoritmo

Propositalmente simples, para servir de baseline:

1. Carrega o histórico diário de saídas (`data/raw/train.csv`).
2. Agrega a quantidade por categoria em janelas semanais.
3. Descarta a última semana (sempre incompleta no dataset).
4. Para cada categoria, ajusta uma **regressão linear simples** (`numpy.polyfit`,
   grau 1) sobre as últimas 12 semanas e projeta a demanda da semana seguinte.
5. Classifica a tendência em alta / queda / estável e salva o resultado em
   `data/previsao_demanda.csv`.

Não há validação cruzada, tuning de hiperparâmetros nem comparação entre
modelos — isso fica para uma próxima sprint, depois que o pipeline básico
estiver validado com dados reais do StockIQ.

## Como rodar

```bash
cd machine-learning
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# extrair o dataset (uma vez)
cd data && unzip databases.zip -d raw && cd ..

python src/forecast_demand.py
```

## Próximos passos

1. Gerar massa de dados simulada representativa a partir do schema do
   StockIQ (produtos, categorias, movimentações) para substituir o dataset
   externo.
2. Trocar `load_sales()` por uma consulta direta ao Postgres (tabela
   `movements`, `type = 'exit'`) via `SQLAlchemy`/`psycopg2`, usando o mesmo
   `DATABASE_URL` do backend.
3. Comparar o baseline de regressão linear com um modelo de média móvel e
   com suavização exponencial simples.
4. Ligar a previsão ao endpoint de curva ABC/XYZ do backend, para sugerir
   reposição de estoque com base em `Product.minStock`/`maxStock`.
