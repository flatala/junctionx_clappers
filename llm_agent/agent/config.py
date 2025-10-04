from dataclasses import dataclass, field, fields
from typing import Optional
from langchain_core.runnables import RunnableConfig, ensure_config
from . import prompts


@dataclass(kw_only=True)
class AgentConfiguration:
    """Configuration for the agent."""

    # PROMPTS
    system_prompt: str = field(
        default=prompts.SYSTEM_PROMPT,
        metadata={
            "description": "The system prompt for the agent."
        },
    )

    criteria_refinement_prompt: str = field(
        default=prompts.REFINE_CRITERIA,
        metadata={
            "description": "The prompt for refining additional criteria.",
            "parameters": "Takes a string parameter: additional_criteria"
        },
    )

    human_prompt: str = field(
        default=prompts.HUMAN_PROMPT,
        metadata={
            "description": "The human prompt for the agent.",
            "parameters": "Takes two string parameters: additional criteria and transcription."
        },
    )

    segmentation_prompt: str = field(
        default=prompts.SEGMENT_PROMPT,
        metadata={
            "description": "The prompt for segmenting long transcriptions.",
            "parameters": "Takes a string parameter: transcription"
        },
    )

    # PARAMETERS
    max_segment_length: int = field(
        default=500,
        metadata={
            "description": "Maximum character length before segmenting transcription"
        },
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "AgentConfiguration":
        cfg = ensure_config(config or {})
        data = cfg.get("configurable", {})
        return cls(**{k: v for k, v in data.items() if k in {f.name for f in fields(cls)}})
