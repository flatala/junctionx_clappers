#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== Stopping All Services ===="
echo ""

# Stop Frontend (port 5173)
echo "[1/4] Stopping Frontend..."
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "Frontend stopped" || echo "Frontend not running"
echo ""

# Stop Backend (port 8000)
echo "[2/4] Stopping Backend..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "Backend stopped" || echo "Backend not running"
echo ""

# Stop LLM Agent (port 8001)
echo "[3/4] Stopping LLM Agent..."
lsof -ti:8001 | xargs kill -9 2>/dev/null && echo "LLM Agent stopped" || echo "LLM Agent not running"
echo ""

# Stop MySQL Docker
echo "[4/4] Stopping MySQL..."
cd ${SCRIPT_DIR}
docker-compose stop mysql 2>/dev/null && echo "MySQL stopped" || echo "MySQL not running"
echo ""

# Clean up PIDs file
rm -f ${SCRIPT_DIR}/.pids

echo "===================================="
echo "All services stopped!"
echo "===================================="
