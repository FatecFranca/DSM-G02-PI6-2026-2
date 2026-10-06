"""StockIQ demand-forecasting package (CRISP-DM: modelagem e implantação).

Módulos
-------
config      caminhos e constantes compartilhadas
data        carga do dataset Store Sales e conversão para matriz dia × série
features    engenharia de atributos (usada igual no treino e no serviço)
baselines   previsores simples para comparação
model       modelo global de demanda (gradient boosting) + persistência
evaluate    validação temporal (holdout) e métricas
train       CLI: avalia, treina e salva o modelo em artifacts/
service     API HTTP (FastAPI) consumida pelo backend do StockIQ
"""

__version__ = "1.0.0"
