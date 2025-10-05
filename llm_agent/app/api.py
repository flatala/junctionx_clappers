from fastapi import FastAPI, HTTPException
import json
import logging
from contextlib import asynccontextmanager

from .agent.graph import graph
from .agent.agent_state import AgentState
from .agent.utils import get_llm
from .models import (
    DetectionRequest,
    DetectionResponse,
    ExtremistSpan,
    CriteriaRequest,
    CriteriaResponse
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global LLM instance
llm_instance = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to pre-load the model on startup."""
    global llm_instance
    try:
        llm_instance = get_llm()
        logger.info("→ STARTUP: LLM model loaded")
    except Exception:
        logger.exception("Failed to load LLM model")
        raise
    yield
    logger.info("→ SHUTDOWN: Complete")


app = FastAPI(
    title="Extremist Content Detection API",
    description="Microservice for detecting extremist content in transcribed audio data using Ollama LLM",
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


@app.post("/refine-criteria", response_model=CriteriaResponse)
async def refine_criteria_endpoint(request: CriteriaRequest):
    """Refine user-provided criteria using LLM."""
    if llm_instance is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not request.criteria:
        return CriteriaResponse(refined_criteria=[])

    try:
        from .agent.nodes import refine_criteria
        from .agent.agent_state import AgentState

        temp_state = AgentState(transcription="", additional_criteria=request.criteria)
        result = await refine_criteria(temp_state)

        return CriteriaResponse(refined_criteria=result.get("refined_criteria", []))
    except Exception:
        logger.exception("Criteria refinement failed")
        raise HTTPException(status_code=500, detail="Criteria refinement failed")


@app.post("/detect", response_model=DetectionResponse)
async def detect_extremist_content(request: DetectionRequest):
    """Detect extremist content in transcribed text."""
    total_criteria = len(request.default_definitions) + len(request.custom_definitions)
    logger.info(f"→ REQUEST: {len(request.transcription)} chars, {total_criteria} criteria ({len(request.default_definitions)} default, {len(request.custom_definitions)} custom), {len(request.negative_examples)} negative examples")
    
    # Log detailed request information
    logger.info("\n" + "=" * 80)
    logger.info("INCOMING REQUEST TO /detect ENDPOINT:")
    logger.info("=" * 80)
    logger.info(f"\n📝 TRANSCRIPTION LENGTH: {len(request.transcription)} characters")
    logger.info(f"First 200 chars: {request.transcription[:200]}...")
    
    logger.info(f"\n📋 DEFAULT DEFINITIONS ({len(request.default_definitions)}):")
    for i, definition in enumerate(request.default_definitions, 1):
        logger.info(f"   {i}. {definition}")
    
    logger.info(f"\n🎯 CUSTOM DEFINITIONS ({len(request.custom_definitions)}):")
    if request.custom_definitions:
        for i, definition in enumerate(request.custom_definitions, 1):
            logger.info(f"   {i}. {definition}")
    else:
        logger.info("   (none - no user feedback)")
    
    logger.info(f"\n✅ NEGATIVE EXAMPLES ({len(request.negative_examples)}):")
    if request.negative_examples:
        for i, example in enumerate(request.negative_examples, 1):
            logger.info(f"   {i}. {example}")
    else:
        logger.info("   (none - no user corrections)")
    
    logger.info("=" * 80 + "\n")

    if llm_instance is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        initial_state = AgentState(
            transcription=request.transcription,
            default_definitions=request.default_definitions,
            custom_definitions=request.custom_definitions,
            negative_examples=request.negative_examples
        )

        result = await graph.ainvoke(initial_state)
        parsed_response = json.loads(result["response"])
        spans = [ExtremistSpan(**span) for span in parsed_response.get("spans", [])]

        logger.info(f"→ RESULT: {len(spans)} spans detected")
        return DetectionResponse(spans=spans)
    except json.JSONDecodeError:
        logger.exception("JSON parsing failed, returning empty spans")
        return DetectionResponse(spans=[])
    except Exception:
        logger.exception("Detection failed")
        raise HTTPException(status_code=500, detail="Detection failed")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Extremist Content Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "refine_criteria": "POST /refine-criteria",
            "detect": "POST /detect",
            "docs": "/docs"
        }
    }
