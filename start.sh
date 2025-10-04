#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==== Starting All Services ===="
echo ""

# Create logs directory
mkdir -p ${SCRIPT_DIR}/logs

# Start LLM Agent
echo "[1/3] Starting LLM Agent..."
cd ${SCRIPT_DIR}/llm_agent
./start.sh > ${SCRIPT_DIR}/logs/llm_agent.log 2>&1 &
LLM_PID=$!
echo "LLM Agent started (PID: $LLM_PID)"
echo ""

# Wait a bit for LLM to initialize
sleep 3

# Start Backend
echo "[2/3] Starting Backend..."
cd ${SCRIPT_DIR}/backend
./start.sh > ${SCRIPT_DIR}/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to initialize
sleep 3

# Start Frontend
echo "[3/3] Starting Frontend..."
cd ${SCRIPT_DIR}/frontend
./start.sh > ${SCRIPT_DIR}/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
echo ""

# Save PIDs
echo "LLM_PID=$LLM_PID" > ${SCRIPT_DIR}/.pids
echo "BACKEND_PID=$BACKEND_PID" >> ${SCRIPT_DIR}/.pids
echo "FRONTEND_PID=$FRONTEND_PID" >> ${SCRIPT_DIR}/.pids

echo "===================================="
echo "All services started!"
echo ""
echo "Services:"
echo "  - LLM Agent:  http://localhost:8001"
echo "  - Backend:    http://localhost:8000"
echo "  - Frontend:   http://localhost:5173"
echo ""
echo "Logs:"
echo "  - tail -f logs/llm_agent.log"
echo "  - tail -f logs/backend.log"
echo "  - tail -f logs/frontend.log"
echo ""
echo "To stop all services:"
echo "  ./stop.sh"
echo "===================================="
