#!/bin/bash

set -e

ENV_NAME="backend"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== Backend Setup & Start ===="
echo ""

# Check mamba
if ! command -v mamba &> /dev/null; then
    echo "Error: mamba not installed"
    exit 1
fi

# Check/create env
echo "[1/4] Checking mamba env '${ENV_NAME}'..."
if mamba run -n ${ENV_NAME} python --version > /dev/null 2>&1; then
    echo "Environment exists"
else
    echo "Creating environment..."
    mamba create -n ${ENV_NAME} python=3.10 -y
fi
echo ""

# Install deps
echo "[2/4] Installing dependencies..."
cd ${SCRIPT_DIR}
mamba run -n ${ENV_NAME} pip install -q -r requirements.txt
echo ""

# Start MySQL
echo "[3/4] Starting MySQL..."
cd ${SCRIPT_DIR}/..
docker-compose up -d mysql
sleep 5
echo ""

# Kill port and start backend
echo "[4/4] Starting backend..."
cd ${SCRIPT_DIR}
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
echo ""
echo "Backend: http://localhost:8000"
echo "Docs: http://localhost:8000/docs"
echo ""
mamba run -n ${ENV_NAME} uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
