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

    human_prompt: str = field(
        default=prompts.HUMAN_PROMPT,
        metadata={
            "description": "The human prompt for the agent.",
            "parameters": "Takes two string parameters: additional criteria and transcription."
        },
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "AgentConfiguration":
        cfg = ensure_config(config or {})
        data = cfg.get("configurable", {})
        return cls(**{k: v for k, v in data.items() if k in {f.name for f in fields(cls)}})
