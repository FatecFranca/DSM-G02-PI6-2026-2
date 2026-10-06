# Machine Learning — Previsão de Demanda

Módulo de mineração de dados do StockIQ (componente **Mineração de Dados**, ver
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#mineração-de-dados)). Ele treina um modelo de previsão
de demanda diária e o expõe por uma API HTTP que o backend usa na tela **IA Analítica**
(previsão semanal, ponto de pedido, estoque de segurança e sugestões de compra).

```
 Postgres ──movements──▶ backend (Node) ──POST /forecast──▶ serviço ML (FastAPI) ──▶ modelo (.joblib)
                              ▲                                      │
                              └──── previsão + metadados do modelo ◀─┘
                      (se o serviço estiver fora, o backend usa média móvel e avisa na tela)
```

## Visão geral do que existe aqui

| Caminho | O que é |
|---|---|
| `stockiq_ml/` | Pacote novo: features, modelo, avaliação, treino e serviço HTTP |
| `src/forecast_demand.py` | **Baseline legado** (regressão linear semanal por categoria). Mantido como referência e testado |
| `tests/` | Testes unitários (`unittest`) |
| `artifacts/` | Saída do treino: `demand_model.joblib`, `metrics.json` (não versionado) |
| `store-sales-time-series-forecasting/` | Dataset do Kaggle (não versionado) |

## O dataset (Store Sales – Time Series Forecasting, Corporación Favorita)

54 lojas × 33 famílias = **1.782 séries diárias**, de 2013‑01‑01 a 2017‑08‑15. ~31 % dos dias têm
venda zero (demanda **intermitente**, como a de produtos de um armazém). Mapeamento para o StockIQ:

| Dataset | StockIQ |
|---|---|
| `date` | `Movement.createdAt` (dia) |
| `family` | `Category` |
| `store_nbr` × `family` (uma série) | `Product` (uma série de saídas diárias) |
| `sales` | soma de `Movement.quantity` com `type = 'exit'` |

Usamos só `train.csv`. `oil`, `holidays_events`, `transactions` e `onpromotion` **não** entram no
modelo de produção: o StockIQ não tem esses dados, e um modelo que dependesse deles não poderia ser
aplicado aos produtos reais.

## Como o modelo funciona

**Um único modelo global** (gradient boosting) para todas as séries — melhor do que um modelo por
produto quando cada produto tem pouco histórico.

1. **Previsão direta multi‑horizonte.** Para cada série, *origem* (último dia observado) e
   *horizonte* `h` (1…28 dias), prevê‑se a demanda do dia `origem + h`. Sem recursão, então o erro não
   se acumula.
2. **Atributos independentes de escala** (`stockiq_ml/features.py`): médias móveis (7/14/28/56 dias,
   em log), tendências, fração de dias zerados, coeficiente de variação, o **mesmo dia da semana** nas
   últimas 4/8 semanas, e calendário do dia‑alvo (dia da semana, dia do mês, fim de mês, dia de
   pagamento). Por serem relativos ao nível da série, o modelo treinado nos dados do Kaggle serve para
   produtos com volumes bem diferentes.
3. **Alvo** = demanda futura ÷ (média dos últimos 28 dias + 1), limitado a 5× (reaberturas de loja após
   meses paradas são imprevisíveis e quebravam o treino — ver *Decisões* abaixo).
4. **Três regressores** compartilham os atributos: média (perda de **Poisson**, adequada a contagens e
   sem o viés de subestimar demanda intermitente que uma regressão em log teria) e quantis **15 %/85 %**
   (faixa de incerteza, usada no estoque de segurança).
5. **Sem vazamento:** os atributos usam só dados até a origem (há um teste que altera o futuro e verifica
   que nada muda) e o treino de validação usa só origens cujo alvo é anterior ao período de teste.

### Avaliação (backtest)

4 origens semanais no fim do histórico, previsão de 1–14 dias, 1.782 séries. Baselines:
*naïve* sazonal (mesmo dia da semana passada), média de 28 dias e **média do mesmo dia da semana nas
últimas 8 semanas** (o baseline forte). Métricas: **RMSLE** (a do Kaggle), **WAPE** (erro absoluto ÷
total vendido), WAPE agregado por categoria e viés. Os números do último treino ficam em
`artifacts/metrics.json` e aparecem na tela IA Analítica.

#### Resultados (treino de 2026-10-05, origens de teste 2017-07-03 → 2017-07-24, previsão 1–14 dias)

| Previsor | RMSLE ↓ | WAPE ↓ | WAPE por categoria ↓ | Viés |
|---|---:|---:|---:|---:|
| **Modelo (gradient boosting)** | **0,445** | **13,5 %** | **7,2 %** | +0,8 % |
| Média do mesmo dia da semana (8 sem.) | 0,469 | 15,4 % | 9,2 % | +2,2 % |
| Média de 28 dias | 0,491 | 21,9 % | 15,6 % | +1,0 % |
| *Naïve* sazonal (7 dias) | 0,559 | 17,7 % | 10,1 % | +0,5 % |

Por horizonte, o modelo também vence o melhor baseline (1–7 dias: RMSLE 0,422 vs 0,449; 8–14 dias:
0,467 vs 0,489). A faixa 15 %–85 % cobre **86 %** dos valores reais (nominal 80 % — levemente conservadora,
o que é seguro para estoque de segurança). Resultados valem para este dataset; não garantem o mesmo
desempenho nos produtos do StockIQ.

## Como rodar

```bash
cd machine-learning
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1) baixe o dataset do Kaggle e extraia em machine-learning/store-sales-time-series-forecasting/
#    (ou aponte com STORE_SALES_DIR=/caminho)

# 2) treina, avalia e salva o modelo em artifacts/  (~2–3 min)
python -m stockiq_ml.train            # --quick faz um treino reduzido para testar o pipeline

# 3) sobe a API de previsão
uvicorn stockiq_ml.service:app --port 8000

# 4) liga o backend ao serviço (backend/.env)
#    ML_SERVICE_URL="http://localhost:8000"
```

> Debian/Ubuntu sem `python3-venv`: `python3 -m venv --without-pip .venv` e instale o pip com
> `get-pip.py` dentro do venv.

Testes: `python -m unittest discover -s tests -t .`

### Contrato da API

`POST /forecast`

```json
{
  "asOf": "2026-10-04",
  "horizon": 28,
  "series": [
    { "id": "<productId>", "history": [ { "date": "2026-09-30", "quantity": 12 } ] }
  ]
}
```

`history` é esparso (dias ausentes = 0). Resposta, por série: `method` (`gbm` = modelo, `mean` = histórico
< 28 dias, média simples), `daily[] {date, mean, low, high}`, `next7`, `next14`, `total`. Séries com
28–56 dias são completadas à esquerda com a própria média. Também: `GET /health` e `GET /model`
(metadados + métricas do backtest).

## Integração com o backend

* `backend/src/services/ml.service.ts` — cliente HTTP com timeout (`ML_TIMEOUT_MS`) e **fallback**: se
  `ML_SERVICE_URL` não está definido ou o serviço falha, usa a média dos últimos 28 dias e informa em
  `model.source = "baseline"` (a tela mostra um aviso). O sistema nunca fica sem previsão.
* `backend/src/services/analytics.service.ts` — monta o histórico diário de saídas por produto (SQL
  agregado sobre `movements`), pede a previsão de 28 dias e calcula:
  * **dias de cobertura** (quando a demanda prevista esgota o estoque),
  * **estoque de segurança** = banda superior − média, no prazo de reposição,
  * **ponto de pedido** = demanda do prazo + segurança,
  * **quantidade sugerida** = demanda prevista de 28 dias + segurança − estoque atual.
  O prazo de reposição é uma preferência do sistema (Configurações → Preferências, `leadTimeDays`).
* `GET /api/analytics` (previsão, matriz ABC×XYZ, sugestões, insights) e `GET /api/analytics/model`
  (origem da previsão e métricas) — documentados no Swagger.

## Decisões e limitações (leia antes de confiar nos números)

* **Treino em dados do Kaggle, aplicação em produtos do StockIQ.** É transferência de *dinâmica* de
  demanda (sazonalidade semanal, tendência, intermitência), não de volume. O seed do StockIQ é
  sintético, então as métricas relevantes são as do backtest no Kaggle. Com histórico real, o passo
  natural é **retreinar (ou ajustar) com as movimentações do próprio sistema**.
* O ganho sobre o melhor baseline (média do mesmo dia da semana) é **real, porém moderado** (≈ 5 % em
  RMSLE, ≈ 2 p.p. em WAPE): nesse dataset o padrão semanal domina e o baseline já o captura bem. O
  valor do modelo está em suavizar ruído, ajustar tendência e fornecer a faixa de incerteza.
* Winsorização do alvo em 5×: sem ela, um pequeno grupo de séries que "reabrem" (razão > 400×) levava a
  perda de Poisson a prever infinito. Esses saltos são imprevisíveis para qualquer modelo.
* Promoções, feriados e preço do petróleo do dataset ficam de fora de propósito (não existem no StockIQ).
  Um calendário de feriados do Brasil e um campo de promoção em `Movement` seriam o próximo ganho.
* O serviço carrega o modelo em memória na primeira chamada; ao retreinar, reinicie o serviço.

## Próximos passos

1. Retreino periódico com `movements` reais (job + comparação automática com o modelo vigente).
2. Calendário de feriados/promoções como atributos opcionais.
3. Cache da previsão no backend (hoje calculada a cada abertura da tela).
4. Empacotar o serviço em container para a infraestrutura AWS descrita em `docs/ARCHITECTURE.md`.
