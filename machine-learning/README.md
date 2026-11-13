# StockIQ — Machine Learning (Mineração de Dados)

Experimento de **previsão de vendas por regressão** sobre a base pública *Store Sales — Time Series Forecasting* (Kaggle, Corporación Favorita). Faz parte do componente curricular de Mineração de Dados do Projeto Integrador.

| Arquivo | Conteúdo |
|---|---|
| `ML-Gabriel-Livia.ipynb` | **Notebook completo (entrega):** Parte 1 (Kaggle, o notebook abaixo sem alterações) + Parte 2 (dados do próprio sistema, validação temporal, baseline, ablação e integração) |
| `Previsao_Vendas.ipynb` | Notebook original da Parte 1: pré-processamento, seleção de atributos, Regressão Linear e Random Forest, avaliação |
| `Relatorio_Previsao_Vendas.pdf` | Relatório acadêmico (ABNT): Parte 1 (seções 1 a 7, texto original) + Parte 2 (seção 8) e considerações finais |
| `dados_sistema/` | Movimentações e produtos exportados do banco do sistema (dados de demonstração gerados pelo `seed`), usados na Parte 2 |
| `figuras/` | Figuras da Parte 2, gravadas pelo notebook e usadas no relatório |
| `store-sales-time-series-forecasting/` | Bases CSV do Kaggle (não versionadas: `train.csv` tem ~120 MB) |
| [../docs/StockIQ-Machine-Learning.pdf](../docs/StockIQ-Machine-Learning.pdf) | Documentação técnica do módulo |

## O que o notebook faz

1. **Pré-processamento:** remove o período anterior à abertura de cada loja; recorte (lojas 1–5, a partir de 2016: 97.680 linhas); confere duplicados/vazios; junta tipo/cluster da loja e preço do petróleo; mantém os valores extremos (diagnóstico por IQR); agrupa `onpromotion` em 4 faixas; extrai dia da semana, dia do mês e mês; codifica família e tipo em colunas 0/1 → 41 atributos.
2. **Divisão:** 70% treino / 30% teste (aleatória, `random_state=1`).
3. **Seleção de atributos** (só no treino): `SelectKBest` (teste F) e `RFE` (regressão linear padronizada), 10 atributos cada.
4. **Modelos:** Regressão Linear (com padronização) e Random Forest (50 árvores).
5. **Avaliação (teste):** R², MAE e RMSE.

| Seleção | Algoritmo | R² | MAE | RMSE |
|---|---|---|---|---|
| SelectKBest | Regressão Linear | 0,6270 | 311,80 | 857,40 |
| SelectKBest | Random Forest | 0,6279 | 312,22 | 856,27 |
| RFE | Regressão Linear | 0,6337 | 345,62 | 849,67 |
| **RFE** | **Random Forest** | **0,9156** | **172,82** | **407,87** |

## Limitações

- A divisão treino/teste é aleatória (não cronológica): o R² é otimista para prever dias futuros.
- Não usa vendas passadas (*lags*), feriados nem transações; só 5 lojas do mesmo tipo.
- O `test.csv` não é usado: o notebook avalia, mas não gera a previsão dos dias futuros.
- **Integração com o sistema:** os modelos da Parte 1 continuam servidos por [`ml-service/`](../ml-service/README.md) (`/api/simulation/*`), mas a tela **Previsão de Vendas** e a **IA Analítica** agora usam o modelo da Parte 2, treinado com as saídas do próprio sistema (`GET /api/analytics/products-forecast`).

## Parte 2 — dados do próprio sistema

O `ML-Gabriel-Livia.ipynb` aplica o mesmo método aos dados do **StockIQ**: prever quantas unidades de cada produto saem do estoque por dia. Pré-processamento (só saídas, qualidade, agregação produto-dia, calendário completo, IQR, histórico por produto), atributos sem vazamento, **validação temporal** (4 janelas de 14 dias), comparação com uma **referência simples** (média do mesmo dia da semana), SelectKBest + Regressão Linear, Random Forest, ablação (dia do mês e mês), teste de sanidade com padrão conhecido e a conversão da previsão em reposição.

| Método (produto × semana, 200 amostras) | R² | MAE | RMSE | WAPE |
|---|---|---|---|---|
| Random Forest | 0,173 | 14,83 | 27,14 | 82,4% |
| Regressão Linear (SelectKBest) | 0,203 | 14,97 | 26,65 | 83,1% |
| Média do mesmo dia da semana | 0,199 | 14,30 | 26,70 | 79,4% |

Os dados do sistema são **simulados** (script de demonstração) e não têm padrão semanal, então a Random Forest não supera a referência; o teste de sanidade mostra que o algoritmo recupera o padrão quando ele existe. O mesmo código roda no sistema ([`ml-service/wms_forecast.py`](../ml-service/README.md#previsão-de-demanda-dos-produtos-do-sistema-wms)) e reproduz exatamente essas métricas com a mesma base.

## Como executar

```bash
cd machine-learning
pip install pandas numpy scikit-learn matplotlib jupyter
jupyter notebook ML-Gabriel-Livia.ipynb   # ~3 min; a Parte 1 precisa dos CSV do Kaggle (abaixo)
```

O relatório é gerado por `relatorio/gerar_relatorio.py` (`pip install reportlab pillow`): `python3 relatorio/gerar_relatorio.py figuras Relatorio_Previsao_Vendas.pdf`.

Baixe o dataset no Kaggle e extraia os CSVs em `store-sales-time-series-forecasting/` (os caminhos do notebook são relativos a esta pasta).
