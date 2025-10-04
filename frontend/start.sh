#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}==== Frontend Setup & Start ====${NC}"
echo ""

# Check if Node.js is installed
echo -e "${GREEN}[1/3] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js:"
    echo "  macOS: brew install node"
    echo "  Or download from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js ${NODE_VERSION} is installed"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "npm ${NPM_VERSION} is installed"
echo ""

# Install dependencies if needed
echo -e "${GREEN}[2/3] Checking npm dependencies...${NC}"
cd ${SCRIPT_DIR}
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "Dependencies already installed"
fi
echo ""

# Start frontend
echo -e "${GREEN}[3/3] Starting Frontend...${NC}"
echo ""
echo -e "${BLUE}Frontend starting at http://localhost:5173${NC}"
echo ""
npm run dev
