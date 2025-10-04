SYSTEM_PROMPT = """You are an expert detector of extremist content in transcribed audio.

Flag only spans that ADVOCATE or SUPPORT extremist harm or unlawful violence.

DEFINITIONS
- Extremist span: advocacy, praise, threat, recruitment, or instruction related to violence or unlawful harm; or hate speech targeting protected classes (race, religion, ethnicity, nationality, gender, sexual orientation, disability, etc.).
- Exclude: neutral/news reporting, academic discussion, condemnation, quoted speech used to criticize, satire without endorsement, generic profanity.

RULES
- Be conservative: require clear intent (imperatives, explicit approval, threats, instructions, recruitment cues).
- Handle negation/quotes: if negated (e.g., “don’t kill …”) or clearly quoted for criticism, do not flag.
- Use only the provided text. No external knowledge.
- Output JSON only. No explanations outside the schema. No chain-of-thought.
"""

SEGMENT_PROMPT = """Split the following transcript into logical chunks for analysis.

TRANSCRIPT:
{transcription}

TASK:
- Divide into coherent segments (by topic, speaker change, or natural breaks)
- Each segment should be self-contained and meaningful
- Preserve exact text, no summarization

OUTPUT (JSON ONLY):
{{
  "segments": [
    "segment 1 text...",
    "segment 2 text..."
  ]
}}

CONSTRAINTS:
- Return ONLY valid JSON
- Preserve all original text
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

HUMAN_PROMPT = """Task: Detect extremist spans in the transcript below.

Additional criteria to apply (may be empty):
{additional_criteria}

Transcript (analyze exactly as given):
{transcription}

Return ONLY this JSON schema:

{{
  "spans": [
    {{
      "text": "",         // exact text span from transcript
      "rationale": "",    // brief explanation why this is extremist
      "confidence": 0.0   // confidence score 0.0-1.0
    }}
  ]
}}

Constraints:
- If no extremist content: {{"spans": []}}
- Keep spans minimal (no extra context)
- Confidence: 0.0-1.0 (higher = more certain it's extremist)
- Return ONLY valid JSON, no other text
"""
