#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== Frontend Setup & Start ===="
echo ""

# Check Node.js
echo "[1/3] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not installed"
    exit 1
fi
echo "Node $(node --version)"
echo ""

# Install deps
echo "[2/3] Installing dependencies..."
cd ${SCRIPT_DIR}
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed"
fi
echo ""

# Kill port and start
echo "[3/3] Starting frontend..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
echo ""
echo "Frontend: http://localhost:5173"
echo ""
npm run dev
