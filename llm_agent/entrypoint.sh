#!/bin/bash
set -e

echo "Starting Ollama service..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 5

# Check if Ollama is responding
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama is ready!"
        break
    fi
    echo "Waiting for Ollama... ($i/30)"
    sleep 2
done

# Pull the LLM model
echo "Pulling model ${OLLAMA_MODEL}..."
ollama pull ${OLLAMA_MODEL}

echo "Model ready! Starting FastAPI server..."

# Start FastAPI with uvicorn
cd /app
exec uvicorn api:app --host 0.0.0.0 --port 8001
