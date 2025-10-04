from langchain_core.messages import SystemMessage, HumanMessage
from .agent_state import AgentState
from typing import Optional
from .config import AgentConfiguration as Configuration
from langchain_core.runnables import RunnableConfig
from .utils import get_llm
import json
import logging

logger = logging.getLogger(__name__)

async def refine_criteria(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Refine user-provided criteria using LLM."""
    if not state.additional_criteria:
        return {"refined_criteria": []}

    cfg = Configuration.from_runnable_config(config)
    criteria_text = "\n".join(f"- {criterion}" for criterion in state.additional_criteria)

    try:
        messages = [HumanMessage(content=cfg.criteria_refinement_prompt.format(additional_criteria=criteria_text))]
        response = await get_llm().ainvoke(messages)
        refined = json.loads(response.content).get("criteria", [])

        logger.info(f"→ REFINE: {len(state.additional_criteria)} criteria → {len(refined)} refined")
        return {"refined_criteria": refined}
    except Exception:
        logger.exception("Criteria refinement failed, using original")
        return {"refined_criteria": state.additional_criteria}

async def segment_transcription(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Segment long transcriptions into logical chunks."""
    cfg = Configuration.from_runnable_config(config)
    trans_len = len(state.transcription)

    if trans_len <= cfg.max_segment_length:
        logger.info(f"→ SEGMENT: {trans_len} chars → 1 segment (threshold: {cfg.max_segment_length})")
        return {"transcription_segments": [state.transcription]}

    try:
        messages = [HumanMessage(content=cfg.segmentation_prompt.format(transcription=state.transcription))]
        response = await get_llm().ainvoke(messages)
        segments = json.loads(response.content).get("segments", [state.transcription])

        logger.info(f"→ SEGMENT: {trans_len} chars → {len(segments)} segments (threshold: {cfg.max_segment_length})")
        return {"transcription_segments": segments}
    except Exception:
        logger.exception("Segmentation failed, using single segment")
        return {"transcription_segments": [state.transcription]}

async def content_check_node(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Detect extremist content in parallel batches."""
    cfg = Configuration.from_runnable_config(config)
    criteria_text = "\n".join(f"- {c}" for c in state.additional_criteria) if state.additional_criteria else "None"

    logger.info(f"→ BATCH: Processing {len(state.transcription_segments)} segments in parallel")

    try:
        # Build messages for each segment
        all_messages = [
            [
                SystemMessage(content=cfg.system_prompt),
                HumanMessage(content=cfg.human_prompt.format(transcription=seg, additional_criteria=criteria_text))
            ]
            for seg in state.transcription_segments
        ]

        # Batch process all segments in parallel
        responses = await get_llm().abatch(all_messages)

        # Parse and concatenate all spans
        all_spans = []
        span_counts = []
        for response in responses:
            spans = json.loads(response.content).get("spans", [])
            all_spans.extend(spans)
            span_counts.append(len(spans))

        logger.info(f"→ BATCH: Completed - found {len(all_spans)} spans total ({', '.join(f'seg{i+1}: {c}' for i, c in enumerate(span_counts))})")

        return {
            "messages": all_messages[0] + [responses[0]] if responses else [],
            "response": json.dumps({"spans": all_spans})
        }
    except Exception:
        logger.exception("Batch content check failed")
        raise
