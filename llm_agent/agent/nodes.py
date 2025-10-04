from langchain_core.messages import SystemMessage, HumanMessage
from .agent_state import AgentState
from typing import Optional
from .config import AgentConfiguration as Configuration
from langchain_core.runnables import RunnableConfig
from .utils import get_llm


def qwen_node(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """
    Node that calls Qwen LLM to detect extremist content.

    Args:
        state: Current agent state with transcription and criteria
        config: Optional runnable config

    Returns:
        Updated state with response
    """
    cfg = Configuration.from_runnable_config(config)
    llm = get_llm()

    # Format additional criteria
    if state.additional_criteria:
        criteria_text = "\n".join(f"- {criterion}" for criterion in state.additional_criteria)
        print(f"additional criteria specified: {criteria_text}")
    else:
        criteria_text = "None"

    human_prompt_formatted = cfg.human_prompt.format(
        transcription=state.transcription,
        additional_criteria=criteria_text
    )

    # Build messages from config prompts
    messages = [
        SystemMessage(content=cfg.system_prompt),
        HumanMessage(content=human_prompt_formatted)
    ]

    print("invoking the LLM...")
    response = llm.invoke(messages)

    return {
        "messages": messages + [response],
        "response": response.content
    }
