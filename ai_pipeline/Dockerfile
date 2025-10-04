FROM python:3.10-slim

# Set working directory
WORKDIR /app

COPY ai_pipeline/requirements.txt /app/requirements.txt

# Install dependencies (cached unless requirements.txt changes)
RUN pip install --no-cache-dir -r /app/requirements.txt

# Install ffmpeg system binary
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

COPY ai_pipeline /app/ai_pipeline

# Robust entrypoint: if the app crashes, keep the container running for debugging
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["uvicorn ai_pipeline.api:app --host 0.0.0.0 --port 8000 || tail -f /dev/null"]
