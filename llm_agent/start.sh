#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="llm_agent"
MODEL_NAME="${OLLAMA_MODEL:-qwen3:8b}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== LLM Agent Setup & Start ===="
echo ""

# [1/4] Check mamba
if ! command -v mamba >/dev/null 2>&1; then
  echo "Error: mamba not installed"; exit 1
fi

# [2/4] Env create/check
echo "[1/4] Checking mamba env '${ENV_NAME}'..."
if mamba run -n "${ENV_NAME}" python --version >/dev/null 2>&1; then
  echo "Environment exists"
else
  echo "Creating environment..."
  mamba create -n "${ENV_NAME}" python=3.11 -y
fi
echo ""

# Install deps
echo "[2/4] Installing dependencies..."
cd "${SCRIPT_DIR}"
mamba run -n "${ENV_NAME}" pip install -q -r requirements.txt
echo ""

# [3/4] Ollama checks
echo "[3/4] Checking Ollama..."
if ! command -v ollama >/dev/null 2>&1; then
  echo "Error: Ollama not installed (https://ollama.com)"; exit 1
fi

# ---- Performance-oriented server env (adjust as needed) ----
# Concurrency (per model) and queue size:
export OLLAMA_NUM_PARALLEL="${OLLAMA_NUM_PARALLEL:-4}"     # try 2–8; depends on RAM/VRAM
export OLLAMA_MAX_QUEUE="${OLLAMA_MAX_QUEUE:-2048}"
# Allow a couple of models in memory if you swap models:
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-2}"
# Listen address (optional):
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
# Optional: set a default keep-alive for the daemon (client can still override per request)
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-24h}"

# Start Ollama if not running and wait for health
if ! pgrep -x "ollama" >/dev/null 2>&1; then
  echo "Starting Ollama service..."
  nohup ollama serve >/dev/null 2>&1 &
  # health check loop
  HEALTH_URL="http://${OLLAMA_HOST}/api/tags"
  for i in {1..40}; do
    if curl -fsS --max-time 1 "$HEALTH_URL" >/dev/null; then
      echo "Ollama API is up."; break
    fi
    sleep 0.25
    if [[ $i -eq 40 ]]; then
      echo "Error: Ollama API not healthy in time"; exit 1
    fi
  done
else
  echo "Ollama already running"
fi

# Pull model if needed
if ! ollama show "${MODEL_NAME}" >/dev/null 2>&1; then
  echo "Pulling model ${MODEL_NAME}..."
  ollama pull "${MODEL_NAME}"
else
  echo "Model ${MODEL_NAME} already present."
fi
echo ""

# [4/4] Start API
echo "[4/4] Starting LLM Agent..."
cd "${SCRIPT_DIR}"
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
echo ""
echo "LLM Agent: http://localhost:8001"
echo "Docs:      http://localhost:8001/docs"
echo ""
mamba run -n "${ENV_NAME}" uvicorn app.api:app --host 0.0.0.0 --port 8001 --reload
