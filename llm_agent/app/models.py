from pydantic import BaseModel, Field
from typing import List


class DetectionRequest(BaseModel):
    """Request model for extremist content detection."""
    transcription: str = Field(..., description="Transcribed text to analyze")
    default_definitions: List[str] = Field(
        default_factory=list,
        description="Abstract extremism criteria rules"
    )
    positive_examples: List[str] = Field(
        default_factory=list,
        description="Concrete examples of extremist content TO flag"
    )
    negative_examples: List[str] = Field(
        default_factory=list,
        description="Concrete examples of normal content NOT to flag"
    )


class ExtremistSpan(BaseModel):
    """Model for a detected extremist content span."""
    text: str = Field(..., description="The exact text span identified as extremist")
    rationale: str = Field(..., description="Explanation of why this span is extremist")
    confidence: float = Field(..., description="Confidence score 0.0-1.0")


class DetectionResponse(BaseModel):
    """Response model for extremist content detection."""
    spans: List[ExtremistSpan] = Field(..., description="List of detected extremist spans")
