from pydantic import BaseModel, Field
from typing import List


class AgentState(BaseModel):
    """State passed between nodes in the graph."""

    transcription: str = ""
    transcription_segments: List[str] = Field(default_factory=list)
    default_definitions: List[str] = Field(default_factory=list)
    positive_examples: List[str] = Field(default_factory=list)
    negative_examples: List[str] = Field(default_factory=list)
    messages: list = Field(default_factory=list)
    response: str = ""
