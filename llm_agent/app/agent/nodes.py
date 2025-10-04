from langchain_core.messages import SystemMessage, HumanMessage
from .agent_state import AgentState
from typing import Optional, List, Dict
from .config import AgentConfiguration as Configuration
from langchain_core.runnables import RunnableConfig
from .utils import get_llm
import json
import logging
import re

logger = logging.getLogger(__name__)

_SENTENCE_RE = re.compile(r'.+?(?:[\.!\?;:](?=\s|$)|$)', re.DOTALL)

async def refine_criteria(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Refine user-provided custom criteria using LLM (for future use)."""
    if not state.custom_definitions:
        return {"refined_criteria": []}

    cfg = Configuration.from_runnable_config(config)
    criteria_text = "\n".join(f"- {criterion}" for criterion in state.custom_definitions)

    try:
        messages = [HumanMessage(content=cfg.criteria_refinement_prompt.format(additional_criteria=criteria_text))]
        response = await get_llm().ainvoke(messages)
        refined = json.loads(response.content).get("criteria", [])

        logger.info(f"→ REFINE: {len(state.custom_definitions)} custom criteria → {len(refined)} refined")
        return {"refined_criteria": refined}
    except Exception:
        logger.exception("Criteria refinement failed, using original")
        return {"refined_criteria": state.custom_definitions}

def _sentences(text: str) -> List[str]:
    return [m.group(0).strip() for m in _SENTENCE_RE.finditer(text) if m.group(0).strip()]

def _split_overlong(s: str, max_len: int) -> List[str]:
    """Split a single overlong segment into <= max_len chunks (prefer word boundaries)."""
    if len(s) <= max_len:
        return [s]
    parts, cur = [], ""
    for word in s.split():
        sep = "" if not cur else " "
        if len(cur) + len(sep) + len(word) <= max_len:
            cur += sep + word
        else:
            if cur:
                parts.append(cur)
                cur = ""
            # word itself may be longer than max_len -> hard-cut
            if len(word) > max_len:
                start = 0
                while start < len(word):
                    parts.append(word[start:start+max_len])
                    start += max_len
            else:
                cur = word
    if cur:
        parts.append(cur)
    return parts

def _merge(sentences: List[str], max_len: int) -> List[str]:
    chunks, cur = [], ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        candidate = s if not cur else (cur + (" " if not cur.endswith(" ") else "") + s)
        if len(candidate) <= max_len:
            cur = candidate
        else:
            if cur:
                chunks.append(cur)
                cur = ""
            # s might itself exceed max_len
            if len(s) > max_len:
                chunks.extend(_split_overlong(s, max_len))
            else:
                cur = s
    if cur:
        chunks.append(cur)
    return chunks

async def segment_transcription(state: "AgentState", *, config: Optional["RunnableConfig"] = None) -> Dict:
    """
    Segment long transcriptions into logical chunks without LLM:
    split on punctuation, then merge sequentially up to max_segment_length.
    """
    cfg = Configuration.from_runnable_config(config)
    text = (state.transcription or "").strip()
    trans_len = len(text)

    if not text:
        logger.info("→ SEGMENT: empty transcription → 0 segments")
        return {"transcription_segments": []}

    if trans_len <= cfg.max_segment_length:
        logger.info(f"→ SEGMENT: {trans_len} chars → 1 segment (threshold: {cfg.max_segment_length})")
        return {"transcription_segments": [text]}

    try:
        sents = _sentences(text)
        segments = _merge(sents, cfg.max_segment_length)
        logger.info(f"→ SEGMENT: {trans_len} chars → {len(segments)} segments (threshold: {cfg.max_segment_length})")
        return {"transcription_segments": segments}
    except Exception:
        logger.exception("Segmentation failed, using single segment")
        return {"transcription_segments": [text]}

async def content_check_node(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Detect extremist content in parallel batches."""
    cfg = Configuration.from_runnable_config(config)

    # Combine default and custom definitions
    all_criteria = state.default_definitions + state.custom_definitions
    extremism_criteria = "\n".join(f"- {c}" for c in all_criteria) if all_criteria else "None provided"

    # Format negative examples
    negative_examples = "\n".join(f"- {n}" for n in state.negative_examples) if state.negative_examples else "None provided"

    logger.info(f"→ BATCH: Processing {len(state.transcription_segments)} segments in parallel")

    try:
        # Build messages for each segment
        all_messages = [
            [
                SystemMessage(content=cfg.system_prompt),
                HumanMessage(content=cfg.human_prompt.format(
                    transcription=seg,
                    extremism_criteria=extremism_criteria,
                    negative_examples=negative_examples
                ))
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
