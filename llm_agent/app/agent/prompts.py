SYSTEM_PROMPT = """You are an expert detector of extremist content in transcribed audio.

Flag only spans that ADVOCATE or SUPPORT extremist harm or unlawful violence, based STRICTLY on the user-defined criteria provided.

GENERAL GUIDELINES
- Flag content that clearly advocates, supports, or promotes the behaviors defined in the user's extremism criteria
- Exclude: neutral/news reporting, academic discussion, condemnation, quoted speech used to criticize, satire without endorsement
- Be conservative: require clear intent (imperatives, explicit approval, threats, instructions, recruitment cues)
- Handle negation/quotes: if negated (e.g., "don't kill …") or clearly quoted for criticism, do not flag
- Use only the provided text. No external knowledge
- Output JSON only. No explanations outside the schema. No chain-of-thought
- Adhere STRICTLY to the user's extremism definitions - do not add your own interpretations
"""

REFINE_CRITERIA = """You are refining user-supplied extremist classification criteria.

INPUT:
{additional_criteria}

TASK:
- Normalize, deduplicate, and merge overlapping criteria.
- Make each criterion specific, testable, and non-redundant.
- Write each as a short imperative rule (≤15 words), lowercase, no trailing period.

OUTPUT (JSON ONLY):
{{
  "criteria": [
    "example criterion 1",
    "example criterion 2"
  ]
}}

CONSTRAINTS:
- Return ONLY valid JSON.
- Do not include explanations or extra fields.
"""

HUMAN_PROMPT = """Task: Detect extremist spans in the transcript below using the criteria and reference examples.

EXTREMISM CRITERIA (abstract rules to detect):
{extremism_criteria}

POSITIVE EXAMPLES (examples of extremist content TO flag - use these to guide your judgment):
{positive_examples}

NEGATIVE EXAMPLES (examples of normal content NOT to flag - use these to avoid false positives):
{negative_examples}

Transcript (analyze exactly as given):
{transcription}

Return ONLY this JSON schema:

{{
  "spans": [
    {{
      "text": "",         // exact text span from transcript
      "rationale": "",    // brief explanation why this matches the criteria
      "confidence": 0.0   // confidence score 0.0-1.0
    }}
  ]
}}

Constraints:
- Use the criteria and reference examples to guide your judgment
- If no extremist content matches: {{"spans": []}}
- Keep spans minimal (no extra context)
- Confidence: 0.0-1.0 (higher = more certain it matches the criteria)
- Return ONLY valid JSON, no other text
"""
