#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV_NAME="backend"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}==== Backend Setup & Start ====${NC}"
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
    echo "Creating environment '${ENV_NAME}' with Python 3.10..."
    mamba create -n ${ENV_NAME} python=3.10 -y
fi
echo ""

# Install dependencies
echo -e "${GREEN}[2/5] Installing Python dependencies...${NC}"
cd ${SCRIPT_DIR}
mamba run -n ${ENV_NAME} pip install -r requirements.txt
echo ""

# Check Docker
echo -e "${GREEN}[3/5] Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop first"
    exit 1
fi
echo "Docker is running"
echo ""

# Start MySQL
echo -e "${GREEN}[4/5] Starting MySQL container...${NC}"
cd ${SCRIPT_DIR}/..
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until docker exec junctionx_mysql mysqladmin ping -h localhost --silent 2>/dev/null; do
    printf '.'
    sleep 1
done
echo ""
echo "MySQL is ready!"
echo ""

# Start backend
echo -e "${GREEN}[5/5] Starting Backend API...${NC}"
cd ${SCRIPT_DIR}
echo ""
echo -e "${BLUE}Backend starting at http://localhost:8000${NC}"
echo -e "${BLUE}API Docs: http://localhost:8000/docs${NC}"
echo ""
mamba run -n ${ENV_NAME} uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
