from pydantic import BaseModel, Field
from typing import List


class AgentState(BaseModel):
    """State passed between nodes in the graph."""

    transcription: str = ""
    additional_criteria: List[str] = Field(default_factory=list)
    messages: list = Field(default_factory=list)
    response: str = ""
