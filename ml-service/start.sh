#!/usr/bin/env bash
# Sobe o serviço de simulação de vendas (porta 8100 por padrão).
# Instala só o que faltar, em ml-service/.pylibs (não mexe no Python do sistema).
set -euo pipefail
cd "$(dirname "$0")"
LIBS=.pylibs
need=()
python3 -c "import pandas, numpy, sklearn, joblib" 2>/dev/null || need+=(pandas numpy scikit-learn joblib)
PYTHONPATH="$LIBS" python3 -c "import fastapi, uvicorn" 2>/dev/null || need+=(fastapi uvicorn)
if [ ${#need[@]} -gt 0 ]; then
  echo "Instalando dependências: ${need[*]}"
  python3 -m pip install --quiet --target "$LIBS" "${need[@]}"
fi
export PYTHONPATH="$LIBS"
exec python3 -m uvicorn app:app --host 127.0.0.1 --port "${ML_PORT:-8100}"
