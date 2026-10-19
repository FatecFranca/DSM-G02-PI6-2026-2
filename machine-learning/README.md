# StockIQ — Machine Learning (Mineração de Dados)

Experimento de **previsão de vendas por regressão** sobre a base pública *Store Sales — Time Series Forecasting* (Kaggle, Corporación Favorita). Faz parte do componente curricular de Mineração de Dados do Projeto Integrador.

| Arquivo | Conteúdo |
|---|---|
| `Previsao_Vendas.ipynb` | Notebook: pré-processamento, seleção de atributos, Regressão Linear e Random Forest, avaliação |
| `Relatorio_Previsao_Vendas.pdf` | Relatório acadêmico (ABNT) do experimento |
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
- **Não está integrado à API.** A tela IA Analítica do sistema usa o analytics do backend (`GET /api/analytics`): média móvel, curva ABC, matriz ABC×XYZ e sugestões de compra. O backend aceita um serviço de previsão externo opcional (`ML_SERVICE_URL`); este repositório não inclui esse serviço.

## Como executar

```bash
cd machine-learning
pip install pandas numpy scikit-learn matplotlib jupyter
jupyter notebook Previsao_Vendas.ipynb
```

Baixe o dataset no Kaggle e extraia os CSVs em `store-sales-time-series-forecasting/` (os caminhos do notebook são relativos a esta pasta).
