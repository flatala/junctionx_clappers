# junctionx_clappers

A full-stack application with FastAPI backend, React frontend, and LLM-powered extremist content detection.

## Quick Start

### Local Development (Recommended)

**Start all services:**
```bash
./start.sh
```

**Stop all services:**
```bash
./stop.sh
```

Services will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **LLM Agent**: http://localhost:8001

### Docker

**Start all services with Docker:**
```bash
docker-compose up --build
```

**Stop all services:**
```bash
docker-compose down
```

## Project Structure

```
junctionx_clappers/
├── backend/               # FastAPI backend application
│   ├── app/              # Application code
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React + Vite frontend
│   ├── src/              # React components and logic
│   ├── Dockerfile
│   └── package.json
├── llm_agent/            # LLM-based content detection service
│   ├── agent/            # Detection agent logic
│   ├── Dockerfile
│   ├── entrypoint.sh     # Ollama setup script
│   └── requirements.txt
├── docker-compose.yml    # Main Docker orchestration
├── start.sh              # Start all services locally
└── stop.sh               # Stop all services
```

## Features

### Backend
- FastAPI web framework
- MySQL database with SQLAlchemy ORM
- Audio file upload and processing
- Integration with LLM agent for content detection

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui component library
- Audio upload and transcription interface

### LLM Agent
- Qwen 3 8B language model via Ollama
- Extremist content detection
- LangGraph-based agent architecture
- FastAPI service with health checks

## Prerequisites

### For Local Development (start.sh)
- **mamba** (conda alternative)
- **Ollama** (https://ollama.com)
- **Node.js** 18+
- **Docker** (for MySQL)

### For Docker (docker-compose)
- **Docker** and **Docker Compose**

## Manual Setup (Optional)

If you prefer to run services individually instead of using `./start.sh`:

### Backend
```bash
cd backend
mamba create -n backend python=3.10 -y
mamba run -n backend pip install -r requirements.txt
docker-compose up -d mysql  # Start MySQL only
mamba run -n backend uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### LLM Agent
```bash
cd llm_agent
mamba create -n llm_agent python=3.11 -y
mamba run -n llm_agent pip install -r requirements.txt
ollama serve &  # Start Ollama
ollama pull qwen3:8b  # Pull model
mamba run -n llm_agent uvicorn api:app --port 8001
```

## API Documentation

Once services are running, visit:
- **Backend**: http://localhost:8000/docs
- **LLM Agent**: http://localhost:8001/docs

## API Endpoints

### Backend (Port 8000)
- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /upload-audio` - Upload audio file for transcription

### LLM Agent (Port 8001)
- `GET /` - Service information
- `GET /health` - Health check
- `POST /detect` - Detect extremist content in text

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **MySQL**: Database
- **Uvicorn**: ASGI server

### Frontend
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component library

### LLM Agent
- **Ollama**: Local LLM inference
- **Qwen 3 8B**: Language model
- **LangGraph**: Agent orchestration framework
- **FastAPI**: Service API

## Gen AI Usage

To make the application in the short time span we relied heavily on various AI tools, such as LLM webchats, Github Copilot and Claude Code.

## License

MIT
