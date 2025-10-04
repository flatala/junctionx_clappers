#!/bin/bash

set -e

ENV_NAME="llm_agent"
MODEL_NAME="${OLLAMA_MODEL:-qwen3:8b}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== LLM Agent Setup & Start ===="
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
    mamba create -n ${ENV_NAME} python=3.11 -y
fi
echo ""

# Install deps
echo "[2/4] Installing dependencies..."
cd ${SCRIPT_DIR}
mamba run -n ${ENV_NAME} pip install -q -r requirements.txt
echo ""

# Check Ollama
echo "[3/4] Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    echo "Error: Ollama not installed"
    echo "Install from: https://ollama.com"
    exit 1
fi

# Start Ollama if not running
if ! pgrep -x ollama > /dev/null; then
    echo "Starting Ollama service..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
else
    echo "Ollama already running"
fi

# Pull model if needed
if ! ollama list | grep -q "${MODEL_NAME}"; then
    echo "Pulling model ${MODEL_NAME}..."
    ollama pull ${MODEL_NAME}
fi
echo ""

# Kill port and start
echo "[4/4] Starting LLM Agent..."
cd ${SCRIPT_DIR}
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
echo ""
echo "LLM Agent: http://localhost:8001"
echo "Docs: http://localhost:8001/docs"
echo ""
mamba run -n ${ENV_NAME} uvicorn api:app --host 0.0.0.0 --port 8001 --reload
