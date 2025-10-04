from pydantic import BaseModel, Field
from typing import List


class DetectionRequest(BaseModel):
    """Request model for extremist content detection."""
    transcription: str = Field(..., description="Transcribed text to analyze")
    default_definitions: List[str] = Field(
        default_factory=list,
        description="Selected default extremism definitions"
    )
    custom_definitions: List[str] = Field(
        default_factory=list,
        description="User-provided custom extremism definitions (may be refined by AI later)"
    )
    negative_examples: List[str] = Field(
        default_factory=list,
        description="Examples of what is NOT considered extremist"
    )


class ExtremistSpan(BaseModel):
    """Model for a detected extremist content span."""
    text: str = Field(..., description="The exact text span identified as extremist")
    rationale: str = Field(..., description="Explanation of why this span is extremist")
    confidence: float = Field(..., description="Confidence score 0.0-1.0")


class DetectionResponse(BaseModel):
    """Response model for extremist content detection."""
    spans: List[ExtremistSpan] = Field(..., description="List of detected extremist spans")


class CriteriaRequest(BaseModel):
    """Request model for criteria refinement."""
    criteria: List[str] = Field(..., description="List of raw criteria to refine")


class CriteriaResponse(BaseModel):
    """Response model for criteria refinement."""
    refined_criteria: List[str] = Field(..., description="List of refined criteria")
