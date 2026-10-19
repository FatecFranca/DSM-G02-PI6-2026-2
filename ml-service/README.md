# StockIQ — Serviço de simulação de vendas

Serviço Python (FastAPI) que **serve os modelos de regressão do notebook** [`machine-learning/Previsao_Vendas.ipynb`](../machine-learning/Previsao_Vendas.ipynb) para o backend e para a tela **Simulação de Vendas** do sistema.

> O notebook e a pasta `machine-learning/` **não são alterados**. Este serviço só *lê* as bases CSV de lá e reproduz, na mesma ordem e com os mesmos parâmetros, o pré-processamento, a divisão treino/teste (70/30, `random_state=1`), a seleção de atributos (SelectKBest e RFE, 10 atributos) e os quatro modelos. Os resultados coincidem com os do notebook — veja o teste de equivalência abaixo.

```
Frontend (/dashboard/simulacao) ──► Backend  /api/simulation/*  ──►  ml-service :8100  ──► modelos (scikit-learn)
                                      JWT + validação (Zod)            FastAPI
```

## Modelos

| id | Modelo | Seleção | R² (teste) | Origem |
|---|---|---|---|---|
| `kbest_linear` | Regressão Linear | SelectKBest | 0,6270 | notebook |
| `kbest_rf` | Random Forest | SelectKBest | 0,6279 | notebook |
| `rfe_linear` | Regressão Linear | RFE | 0,6337 | notebook |
| `rfe_rf` | Random Forest | RFE | **0,9156** | notebook |
| `rf_full` | Random Forest | 41 atributos | 0,9518 | **complementar** (não está no notebook) |

Os modelos do notebook usam loja, família e faixa de promoção — **não usam a data**. O modelo complementar (`rf_full`) enxerga dia da semana, mês e preço do petróleo, e por isso permite simular datas. Ele é identificado como complementar na API e na tela; desligue-o com `ML_EXTRA_MODELS=false`.

## Como rodar

```bash
cd backend && npm run ml:service          # ou: bash ml-service/start.sh
```

O `start.sh` instala só o que faltar (fastapi, uvicorn e, se necessário, pandas/scikit-learn) em `ml-service/.pylibs`, sem mexer no Python do sistema, e sobe em `http://127.0.0.1:8100`. Na primeira vez treina os modelos (~10–60 s) e guarda em `ml-service/artifacts/`; nas próximas, carrega do cache (refaz o treino se os CSVs ou o código mudarem). Enquanto treina, `GET /health` responde `training` e `/model` e `/predict` respondem 503.

Variáveis: `ML_PORT` (8100), `ML_DATA_DIR` (padrão `machine-learning/store-sales-time-series-forecasting`), `ML_ARTIFACTS_DIR`, `ML_EXTRA_MODELS` (`true`). No backend: `SALES_MODEL_URL` (padrão `http://localhost:8100`) e `SALES_MODEL_TIMEOUT_MS`. É independente de `ML_SERVICE_URL`, que é o contrato de previsão por série do analytics.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | `loading` · `training` · `ready` · `error` |
| GET | `/model` | Modelos, métricas (R², MAE, RMSE), atributos selecionados, importâncias, lojas, famílias, faixas de promoção, petróleo |
| POST | `/predict` | `{ scenarios: [{ store, family, date, onpromotion, oil? }], models? }` → `{ predictions: [{ modelId: unidades }] }` (até 400 cenários) |

`onpromotion` é a contagem de itens em promoção; o serviço converte para as 4 faixas do notebook (0 · 1–3 · 4–16 · >16). Lojas válidas: 1 a 5 (as do treino); famílias: as 33 da base. Previsões negativas são cortadas em 0.

O backend expõe o mesmo contrato, autenticado, em `GET /api/simulation/status`, `GET /api/simulation/model` e `POST /api/simulation/predict`.

## Teste de equivalência com o notebook

```bash
cd ml-service && python3 -m unittest -v tests.test_equivalence
```

Confere que o recorte (97.680 / 68.376 / 29.304 linhas, 41 atributos), os atributos selecionados e o R² dos quatro modelos são **idênticos** aos do notebook, e que a previsão é coerente (mercearia ≫ livros).

## Limitações

- Mesmas do notebook: divisão treino/teste **aleatória** (o R² é otimista para dias futuros), sem vendas passadas, feriados ou transações, e só 5 lojas do mesmo tipo (D).
- Como os modelos do notebook ignoram a data, a simulação por dia só varia no modelo complementar.
- As 26 famílias que a seleção de atributos (RFE) não distingue recebem a mesma previsão nos modelos com seleção.
