"""Gera os PDFs de documentação do StockIQ em docs/ (HTML + Chrome headless).

Uso:  python3 docs/src/build.py [backend|frontend|ml|cloud]   (sem argumento: gera todos)
Requisitos: Python 3, Google Chrome/Chromium (comando `google-chrome`) e a fonte Noto Sans.
Dados usados: docs/swagger.json (npm run docs:export, no backend) e docs/src/data/tests.json (resumo da última execução do Jest).
"""
import importlib
import sys

DOCS = {"cloud": "cloud", "backend": "backend", "frontend": "frontend", "ml": "ml"}

if __name__ == "__main__":
    wanted = sys.argv[1:] or list(DOCS)
    for name in wanted:
        module = importlib.import_module(DOCS[name])
        print(module.d.build())
