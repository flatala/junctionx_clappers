from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import json
from contextlib import asynccontextmanager

from agent.graph import graph
from agent.agent_state import AgentState
from agent.utils import get_llm


# Global LLM instance
llm_instance = None


class DetectionRequest(BaseModel):
    """Request model for extremist content detection."""
    transcription: str = Field(..., description="Transcribed text to analyze")
    additional_criteria: List[str] = Field(
        default_factory=list,
        description="Additional criteria for extremist content detection"
    )


class ExtremistSpan(BaseModel):
    """Model for a detected extremist content span."""
    text: str = Field(..., description="The exact text span identified as extremist")
    rationale: str = Field(..., description="Explanation of why this span is extremist")


class DetectionResponse(BaseModel):
    """Response model for extremist content detection."""
    spans: List[ExtremistSpan] = Field(..., description="List of detected extremist spans")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to pre-load the model on startup."""
    global llm_instance
    print("Starting up: Loading Qwen model...")
    try:
        llm_instance = get_llm()
        print("Qwen model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise
    yield
    print("Shutting down...")


app = FastAPI(
    title="Extremist Content Detection API",
    description="Microservice for detecting extremist content in transcribed audio data using Qwen LLM",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "extremist-content-detection",
        "model_loaded": llm_instance is not None
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_extremist_content(request: DetectionRequest):
    """
    Detect extremist content in transcribed text.

    Args:
        request: Detection request with transcription and optional additional criteria

    Returns:
        Detection response with identified extremist spans
    """
    if llm_instance is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    try:
        # Initialize state
        initial_state = AgentState(
            transcription=request.transcription,
            additional_criteria=request.additional_criteria
        )

        # Run the graph
        result = graph.invoke(initial_state)

        # Parse the response
        try:
            parsed_response = json.loads(result["response"])

            # Validate and convert to response model
            spans = [
                ExtremistSpan(**span) for span in parsed_response.get("spans", [])
            ]

            return DetectionResponse(spans=spans)
        except json.JSONDecodeError:
            # If JSON parsing fails, return empty spans
            return DetectionResponse(spans=[])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during detection: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Extremist Content Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "detect": "POST /detect",
            "docs": "/docs"
        }
    }
