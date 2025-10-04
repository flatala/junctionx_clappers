from langchain_core.messages import SystemMessage, HumanMessage
from .agent_state import AgentState
from typing import Optional
from .config import AgentConfiguration as Configuration
from langchain_core.runnables import RunnableConfig
from .utils import get_llm
import json
import logging
import traceback

logger = logging.getLogger(__name__)

async def refine_criteria(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """
    Node that refines user-provided additional criteria using LLM.

    Args:
        state: Current agent state with additional_criteria
        config: Optional runnable config

    Returns:
        Updated state with refined_criteria
    """
    cfg = Configuration.from_runnable_config(config)

    if state.additional_criteria:
        criteria_text = "\n".join(f"- {criterion}" for criterion in state.additional_criteria)
        logger.info(f"Additional criteria specified ({len(state.additional_criteria)} items)")
        logger.debug(f"Criteria: {criteria_text}")

        criteria_prompt = cfg.criteria_refinement_prompt.format(
            additional_criteria=criteria_text
        )

        messages = [
            HumanMessage(content=criteria_prompt)
        ]

        logger.info("Invoking LLM to refine criteria...")
        try:
            llm = get_llm()
            response = await llm.ainvoke(messages)
            logger.debug(f"LLM response for criteria refinement: {response.content[:500]}")
            parsed_response = json.loads(response.content)
            refined = parsed_response.get("criteria", [])
            logger.info(f"Successfully refined {len(state.additional_criteria)} criteria into {len(refined)} criteria")
            logger.debug(f"Refined criteria: {refined}")
            return {"refined_criteria": refined}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse criteria refinement JSON: {e}")
            logger.warning("Falling back to original criteria")
            return {"refined_criteria": state.additional_criteria}

    else:
        logger.info("No additional criteria provided, skipping refinement")
        return {"refined_criteria": []}




async def content_check_node(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """
    Node that calls LLM to detect extremist content.

    Args:
        state: Current agent state with transcription and refined criteria
        config: Optional runnable config

    Returns:
        Updated state with response
    """
    cfg = Configuration.from_runnable_config(config)

    # Format refined criteria (use refined if available, fallback to additional)
    criteria = state.refined_criteria if state.refined_criteria else state.additional_criteria
    if criteria:
        criteria_text = "\n".join(f"- {criterion}" for criterion in criteria)
        logger.info(f"Using {len(criteria)} criteria for content check")
        logger.debug(f"Criteria: {criteria_text}")
    else:
        criteria_text = "None"
        logger.info("No criteria specified for content check")

    human_prompt_formatted = cfg.human_prompt.format(
        transcription=state.transcription,
        additional_criteria=criteria_text
    )

    # Build messages from config prompts
    messages = [
        SystemMessage(content=cfg.system_prompt),
        HumanMessage(content=human_prompt_formatted)
    ]

    logger.info("Invoking LLM for content check...")
    logger.debug(f"Transcription length: {len(state.transcription)} characters")

    try:
        llm = get_llm()
        response = await llm.ainvoke(messages)
        logger.info("LLM content check completed")
        logger.debug(f"LLM response preview: {response.content[:500]}")

        return {
            "messages": messages + [response],
            "response": response.content
        }
    except Exception as e:
        logger.error(f"Error during LLM invocation in content_check_node: {e}")
        logger.error(traceback.format_exc())
        raise
