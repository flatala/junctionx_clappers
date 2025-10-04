# LLM Agent - Extremist Content Detection API

A FastAPI microservice for detecting extremist content in transcribed audio data using the Qwen LLM via Ollama.

## Overview

This service analyzes transcribed text and identifies potential extremist content spans, providing detailed rationale for each detection. It uses LangGraph for orchestrating the detection pipeline with the Qwen 3 8B model.

## Prerequisites

- **Python 3.11+**
- **Mamba/Conda** (for local environment setup)
- **Ollama** (for running the Qwen model locally)
- **Docker** (for containerized deployment)

## Local Setup with Mamba

### 1. Create Mamba Environment

```bash
# Create a new environment with Python 3.11
mamba create -n llm_agent python=3.11

# Activate the environment
mamba activate llm_agent
```

### 2. Install Dependencies

```bash
cd llm_agent
pip install -r requirements.txt
```

### 3. Install and Start Ollama

Download and install Ollama from [https://ollama.com](https://ollama.com) or use:

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Start the Ollama service:

```bash
ollama serve
```

### 4. Pull the Qwen Model

In a new terminal (with Ollama running):

```bash
ollama pull qwen3:8b
```

## Running Locally with FastAPI/Uvicorn

Ensure Ollama is running with the qwen3:8b model pulled, then start the FastAPI server:

```bash
cd llm_agent
uvicorn api:app --host 0.0.0.0 --port 8001
```

The API will be available at:
- **API**: http://localhost:8001
- **Interactive docs**: http://localhost:8001/docs
- **Health check**: http://localhost:8001/health

## Running with Docker

### Build the Docker Image

```bash
cd llm_agent
docker build -t llm-agent .
```

### Run the Container

```bash
docker run -p 8001:8001 llm-agent
```

**Note**: The Docker container automatically:
- Installs and starts Ollama service
- Pulls the qwen3:8b model on startup
- Starts the FastAPI server on port 8001

The container may take a few minutes to start while downloading the model (~4.5GB).

## API Endpoints

### `GET /health`
Health check endpoint to verify service and model status.

**Response:**
```json
{
  "status": "healthy",
  "service": "extremist-content-detection",
  "model_loaded": true
}
```

### `POST /detect`
Detect extremist content in transcribed text.

**Request:**
```json
{
  "transcription": "Your transcribed text here",
  "additional_criteria": ["optional", "custom", "criteria"]
}
```

**Response:**
```json
{
  "spans": [
    {
      "text": "detected extremist text span",
      "rationale": "explanation of why this is extremist content"
    }
  ]
}
```

### `GET /docs`
Interactive API documentation (Swagger UI).

### `GET /`
Root endpoint with API information.

## Example Usage

### Using curl

```bash
# Health check
curl http://localhost:8001/health

# Detect extremist content
curl -X POST http://localhost:8001/detect \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Sample text to analyze for extremist content",
    "additional_criteria": []
  }'
```

### Using Python

```python
import requests

# Detect extremist content
response = requests.post(
    "http://localhost:8001/detect",
    json={
        "transcription": "Sample text to analyze for extremist content",
        "additional_criteria": []
    }
)

result = response.json()
print(result["spans"])
```

## Project Structure

```
llm_agent/
├── agent/
│   ├── agent_state.py      # State management for the agent
│   ├── agentic_pipeline.py # Pipeline orchestration
│   ├── config.py           # Configuration settings
│   ├── graph.py            # LangGraph workflow definition
│   ├── nodes.py            # Graph node implementations
│   ├── prompts.py          # LLM prompt templates
│   └── utils.py            # Utility functions (LLM initialization)
├── api.py                  # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker configuration
├── entrypoint.sh           # Docker entrypoint script
└── README.md               # This file
```

## Dependencies

- **langgraph**: Workflow orchestration
- **langchain-ollama**: Ollama integration for LangChain
- **langchain-core**: Core LangChain functionality
- **pydantic**: Data validation
- **fastapi**: Web framework
- **uvicorn**: ASGI server

## Troubleshooting

### Model Not Loading
- Ensure Ollama is running: `ollama serve`
- Verify the model is pulled: `ollama list`
- Check Ollama is accessible: `curl http://localhost:11434/api/tags`

### Port Already in Use
Change the port when running uvicorn:
```bash
uvicorn api:app --host 0.0.0.0 --port 8002
```

Or when running Docker:
```bash
docker run -p 8002:8001 llm-agent
```

### Docker Container Timeout
The first run may take several minutes to download the qwen3:8b model. Check logs:
```bash
docker logs <container_id>
```
