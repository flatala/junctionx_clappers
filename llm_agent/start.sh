#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV_NAME="llm_agent"
MODEL_NAME="qwen2.5:3b"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}==== LLM Agent Setup & Start ====${NC}"
echo ""

# Check if mamba is installed
if ! command -v mamba &> /dev/null; then
    echo -e "${RED}Error: mamba is not installed${NC}"
    echo "Please install mamba first: https://mamba.readthedocs.io/en/latest/installation.html"
    exit 1
fi

# Check if environment exists
echo -e "${GREEN}[1/5] Checking mamba environment '${ENV_NAME}'...${NC}"
if mamba env list | grep -q "^${ENV_NAME} "; then
    echo "Environment '${ENV_NAME}' already exists"
else
    echo "Creating environment '${ENV_NAME}' with Python 3.11..."
    mamba create -n ${ENV_NAME} python=3.11 -y
fi
echo ""

# Install dependencies
echo -e "${GREEN}[2/5] Installing Python dependencies...${NC}"
cd ${SCRIPT_DIR}
mamba run -n ${ENV_NAME} pip install -r requirements.txt
echo ""

# Check Ollama
echo -e "${GREEN}[3/5] Checking Ollama installation...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}Error: Ollama is not installed${NC}"
    echo ""
    echo "Please install Ollama:"
    echo "  macOS/Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo "  Or download from: https://ollama.com"
    exit 1
fi
echo "Ollama is installed"
echo ""

# Start Ollama service if not running
echo -e "${GREEN}[4/5] Starting Ollama service...${NC}"
if ! pgrep -x ollama > /dev/null; then
    echo "Starting Ollama service..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
else
    echo "Ollama service already running"
fi

# Check if model exists, if not pull it
if ollama list | grep -q "${MODEL_NAME}"; then
    echo "Model ${MODEL_NAME} already exists"
else
    echo "Pulling model ${MODEL_NAME} (this may take a few minutes)..."
    ollama pull ${MODEL_NAME}
fi
echo ""

# Start LLM Agent
echo -e "${GREEN}[5/5] Starting LLM Agent API...${NC}"
cd ${SCRIPT_DIR}
echo ""
echo -e "${BLUE}LLM Agent starting at http://localhost:8001${NC}"
echo -e "${BLUE}API Docs: http://localhost:8001/docs${NC}"
echo ""
mamba run -n ${ENV_NAME} uvicorn api:app --host 0.0.0.0 --port 8001 --reload
