#!/bin/bash
set -e

echo "======================================"
echo " IZZIMA Installation"
echo "======================================"

echo ""
echo "[1/3] AI dependencies"

cd project/ai

if command -v conda >/dev/null 2>&1; then
    eval "$(conda shell.bash hook)"
    conda activate izzima
    pip install -r requirements.txt
else
    echo "Conda is not installed. Skip AI dependency installation."
fi

cd ../..


echo ""
echo "[2/3] Backend dependencies"

cd project/backend

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

. .venv/bin/activate
pip install -r requirements.txt

cd ../..


echo ""
echo "[3/3] Frontend dependencies"

cd project/frontend
npm install

cd ../..


echo ""
echo "======================================"
echo " Installation completed."
echo " Configure each .env file before running IZZIMA."
echo "======================================"