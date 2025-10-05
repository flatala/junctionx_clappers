from langchain_core.messages import SystemMessage, HumanMessage
from .agent_state import AgentState
from typing import Optional, List, Dict, Tuple
from .config import AgentConfiguration as Configuration
from langchain_core.runnables import RunnableConfig
from .utils import get_llm
import json
import logging
import re

logger = logging.getLogger(__name__)

# _SENTENCE_RE = re.compile(r'.+?(?:[\.!\?;:](?=\s|$)|$)', re.DOTALL)
_SENTENCE_RE = re.compile(
    r"""
    (?:[^.!?;"]+?|"(?:[^"]+)"|\([^)]+\)|\[[^\]]+\])+?
    (?:[.!?;]+(?=\s|$)|$)                                 
    """,
    re.VERBOSE | re.UNICODE
)

def _sentences(text: str) -> List[str]:
    """Regex-based sentence splitter; trims empties."""
    return [m.group(0).strip() for m in _SENTENCE_RE.finditer(text or "") if m.group(0).strip()]

def _ws_split_prefix(s: str, limit: int) -> Optional[Tuple[str, str]]:
    """
    Longest prefix of s with length <= limit that ends on whitespace.
    Returns (head, tail) or None if no whitespace boundary within limit.
    """
    s = s.rstrip()
    if len(s) <= limit:
        return s, ""
    window = s[:limit + 1]
    i = max((j for j, ch in enumerate(window) if ch.isspace()), default=-1)
    if i <= 0:
        return None
    return s[:i].rstrip(), s[i+1:].lstrip()

def _split_overlong(s: str, max_len: int) -> List[str]:
    """
    Split s into <= max_len chunks, preferring whitespace; last resort: hard cuts.
    """
    s = s.strip()
    if not s:
        return []
    out: List[str] = []
    cur = s
    while cur:
        if len(cur) <= max_len:
            out.append(cur)
            break
        ws = _ws_split_prefix(cur, max_len)
        if ws:
            head, tail = ws
            out.append(head)
            cur = tail
        else:
            # hard cut
            out.append(cur[:max_len])
            cur = cur[max_len:].lstrip()
    return out

def _pack_sentences_stable(sents: List[str], max_len: int, max_extension: int) -> List[str]:
    """
    Stable-order packing:
      1) Greedily append sentences while <= max_len.
      2) If overflow and current chunk has >=2 sentences:
           finalize all but the last; start new chunk with that last; retry pending sentence.
      3) If overflow and chunk has <2 sentences:
           a) allow if overflow <= max_extension (then finalize immediately),
           b) else try whitespace split to fill,
           c) else hard cut.
    Never reorders sentences.
    """
    chunks: List[str] = []
    cur_sents: List[str] = []

    def cur_text() -> str:
        return " ".join(cur_sents).strip()

    i = 0
    while i < len(sents):
        s = sents[i].strip()
        if not s:
            i += 1
            continue

        cur = cur_text()
        sep = "" if not cur else " "
        candidate = s if not cur else (cur + sep + s)

        # Fits → take it
        if len(candidate) <= max_len:
            cur_sents.append(s)
            i += 1
            continue

        # Overflow handling
        if len(cur_sents) >= 2:
            # Finalize all except last; carry last forward as new head; retry same sentence
            last = cur_sents.pop()
            kept = cur_text()
            if kept:
                chunks.append(kept)
            cur_sents = [last]
            continue

        # len(cur_sents) is 0 or 1
        if cur and len(candidate) <= max_len + max_extension:
            # Allow small overflow; finalize immediately (no cascading)
            cur_sents.append(s)
            chunks.append(cur_text())
            cur_sents.clear()
            i += 1
            continue

        # Try whitespace split of pending sentence to fill remaining
        remaining = max_len - len(cur) - (0 if not cur else 1)
        if remaining > 0:
            ws = _ws_split_prefix(s, remaining)
            if ws:
                head, tail = ws
                if head:
                    if cur:
                        cur_sents.append(head)
                        chunks.append(cur_text())
                        cur_sents.clear()
                    else:
                        chunks.append(head)
                    if tail:
                        # Replace current sentence with its tail; retry without advancing i
                        sents = sents[:i] + [tail] + sents[i+1:]
                    else:
                        i += 1
                    continue

        # Hard cut fallback
        if cur:
            # Flush current and retry sentence with fresh space
            chunks.append(cur_text())
            cur_sents.clear()
            continue

        # cur is empty → cut s
        head = s[:max_len]
        tail = s[max_len:].lstrip()
        chunks.append(head)
        if tail:
            sents = sents[:i] + [tail] + sents[i+1:]
        else:
            i += 1

    if cur_sents:
        chunks.append(cur_text())

    # Remove accidental empties
    return [c for c in (x.strip() for x in chunks) if c]

# === Public entrypoint ===
async def segment_transcription(state: "AgentState", *, config: Optional["RunnableConfig"] = None) -> Dict:
    """
    Segment long transcriptions for extremist-content scanning:
      - Split into sentences,
      - Greedily pack up to max_segment_length,
      - On overflow: stable-order backoff, optional small extension, whitespace split, then hard cut.
    Expects config to provide:
      - max_segment_length: int
      - max_extension: int (optional, default 100)
    """
    cfg = Configuration.from_runnable_config(config)
    text = (state.transcription or "").strip()
    max_len = int(cfg.max_segment_length)
    max_ext = int(cfg.max_extension)

    if not text:
        logger.info("→ SEGMENT: empty transcription → 0 segments")
        return {"transcription_segments": []}

    if len(text) <= max_len:
        logger.info(f"→ SEGMENT: {len(text)} chars → 1 segment (threshold: {max_len})")
        return {"transcription_segments": [text]}

    try:
        sents = _sentences(text)
        segments = _pack_sentences_stable(sents, max_len, max_ext)
        logger.info(
            f"→ SEGMENT: {len(text)} chars → {len(segments)} segments "
            f"(max_len: {max_len}, max_ext: {max_ext})"
        )
        logger.info(f"\n segments: {' '.join(f'{i}) {seg}' for i, seg in enumerate(segments))}")
        return {"transcription_segments": segments}
    except Exception:
        logger.exception("Segmentation failed, using single segment")
        return {"transcription_segments": [text]}

async def content_check_node(state: AgentState, *, config: Optional[RunnableConfig] = None) -> dict:
    """Detect extremist content in parallel batches."""
    cfg = Configuration.from_runnable_config(config)

    # Format extremism criteria (only default definitions - abstract rules)
    extremism_criteria = "\n".join(f"- {c}" for c in state.default_definitions) if state.default_definitions else "None provided"

    # Format positive examples (concrete examples TO flag)
    positive_examples = "\n".join(f"- {p}" for p in state.positive_examples) if state.positive_examples else "None provided"

    # Format negative examples (concrete examples NOT to flag)
    negative_examples = "\n".join(f"- {n}" for n in state.negative_examples) if state.negative_examples else "None provided"

    logger.info(f"→ BATCH: Processing {len(state.transcription_segments)} segments in parallel")
    
    # Print detailed information about criteria and examples
    logger.info("=" * 80)
    logger.info("CRITERIA AND EXAMPLES BEING SENT TO LLM:")
    logger.info("=" * 80)
    logger.info(f"\n📋 EXTREMISM CRITERIA ({len(state.default_definitions)}):")
    for i, criterion in enumerate(state.default_definitions, 1):
        logger.info(f"   {i}. {criterion}")

    logger.info(f"\n✅ POSITIVE EXAMPLES ({len(state.positive_examples)}):")
    if state.positive_examples:
        for i, example in enumerate(state.positive_examples, 1):
            logger.info(f"   {i}. {example}")
    else:
        logger.info("   (none)")

    logger.info(f"\n❌ NEGATIVE EXAMPLES ({len(state.negative_examples)}):")
    if state.negative_examples:
        for i, example in enumerate(state.negative_examples, 1):
            logger.info(f"   {i}. {example}")
    else:
        logger.info("   (none)")

    logger.info("=" * 80)

    try:
        # Build messages for each segment
        all_messages = [
            [
                SystemMessage(content=cfg.system_prompt),
                HumanMessage(content=cfg.human_prompt.format(
                    transcription=seg,
                    extremism_criteria=extremism_criteria,
                    positive_examples=positive_examples,
                    negative_examples=negative_examples
                ))
            ]
            for seg in state.transcription_segments
        ]
        
        # Print the complete prompt for the first segment
        if all_messages:
            logger.info("\n" + "=" * 80)
            logger.info("COMPLETE PROMPT SENT TO LLM (FIRST SEGMENT):")
            logger.info("=" * 80)
            logger.info("\n🔧 SYSTEM PROMPT:")
            logger.info("-" * 80)
            logger.info(cfg.system_prompt)
            logger.info("-" * 80)
            logger.info("\n💬 HUMAN PROMPT:")
            logger.info("-" * 80)
            formatted_prompt = cfg.human_prompt.format(
                transcription=state.transcription_segments[0],
                extremism_criteria=extremism_criteria,
                positive_examples=positive_examples,
                negative_examples=negative_examples
            )
            logger.info(formatted_prompt)
            logger.info("-" * 80)
            logger.info("=" * 80 + "\n")

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
