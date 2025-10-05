from sqlalchemy.orm import Session
import tempfile
import shutil
from pathlib import Path
from app.transcribe import convert_video_to_audio, split_audio_to_patches, transcribe_patches
import os, platform
from faster_whisper import WhisperModel
from app.models import Job
import requests
import string
import json
import httpx

MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")


def load_whisper():
    preferred = os.getenv("WHISPER_DEVICE")  # cuda | metal | cpu (optional)

    if preferred:
        ct_default = {"cuda": "float16", "metal": "float16", "cpu": "int8"}.get(preferred, "int8")
        candidates = [(preferred, os.getenv("WHISPER_COMPUTE", ct_default))]
    else:
        candidates = [
            ("cuda",  "float16"),
            ("metal", "float16") if platform.system() == "Darwin" else None,
            ("cpu",   os.getenv("WHISPER_COMPUTE", "int8")),
        ]
        candidates = [c for c in candidates if c]

    last_err = None
    for device, compute in candidates:
        try:
            print(f"[INFO] Loading Whisper model: {MODEL_SIZE} (device={device}, compute={compute})")
            model = WhisperModel(MODEL_SIZE, device=device, compute_type=compute)
            print("[INFO] Whisper model loaded.")
            return model
        except Exception as e:
            print(f"[WARN] Failed on {device} ({compute}): {e}")
            last_err = e

    raise RuntimeError(f"Whisper init failed. Last error: {last_err}")


whisper_model = load_whisper()


async def process_file(original_path: str, patch_duration_sec: int, overlap_sec: int):
    # Import db session inside background task
    with tempfile.TemporaryDirectory() as tmpdir:
        # Work on a copy
        working_path = Path(tmpdir) / Path(original_path).name
        shutil.copy(original_path, working_path)

        # If video, convert to audio
        if working_path.suffix.lower() in ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm']:
            audio_path = Path(tmpdir) / (working_path.stem + '.wav')
            convert_video_to_audio(str(working_path), str(audio_path))
        else:
            audio_path = working_path

        # Split audio
        patches = await split_audio_to_patches(str(audio_path), patch_duration_sec, overlap_sec)

        # Transcribe
        all_results = await transcribe_patches(patches, whisper_model)

        return all_results


async def send_to_llm(transcribed_text: str, default_definitions: list = None, positive_examples: list = None, negative_examples: list = None):
    """Send transcribed text to LLM for analysis"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8001/detect",
            json={
                "transcription": transcribed_text,
                "default_definitions": default_definitions or [],
                "positive_examples": positive_examples or [],
                "negative_examples": negative_examples or []
            },
            timeout=1800
        )

        result = response.json()

        return result


def normalize_word(word):
    # Lowercase and strip punctuation from both ends
    return word.strip(string.punctuation).lower()


def find_matching_spans(transcribed_patches: dict, llm_spans: list):
    full_text = transcribed_patches["patch_text"].strip()
    words = full_text.split()
    norm_words = [normalize_word(w) for w in words]
    n = len(norm_words)

    processed_spans = []

    for llm_span in llm_spans:
        span_text = llm_span["text"]

        span_words = span_text.split()
        norm_span_word = [normalize_word(w) for w in span_words]
        m = len(norm_span_word)

        for i in range(n - m + 1):
            if norm_words[i:i + m] == norm_span_word:
                start_ind = i
                end_ind = i + m - 1

                processed_spans.append({
                    "start": transcribed_patches["words"][start_ind]["start"],
                    "end": transcribed_patches["words"][end_ind]["end"],
                    "text": span_text,
                    "rationale": llm_span["rationale"],
                    "confidence": llm_span.get("confidence", 0.0)
                })

    return processed_spans


async def main_background_function(job_id: str, original_path: str, patch_duration_sec: int, overlap_sec: int, db: Session, default_definitions: list = None, positive_examples: list = None, negative_examples: list = None):
    job = db.get(Job, job_id)
    job.status = "transcribing"
    db.commit()
    db.expire_all()

    transcribed_patches = await process_file(original_path, patch_duration_sec, overlap_sec)

    print(f"Got {len(transcribed_patches)} batches")
    
    cleaned_list = []

    # Save transcribed text to file
    txt_path = Path(original_path).with_suffix('.txt')
    with open(txt_path, 'w', encoding='utf-8') as f:
        for transcribed_batch in transcribed_patches:
            transcribed_text = transcribed_batch["patch_text"].strip()
            cleaned_list.append(transcribed_text)
            f.write(transcribed_text)

    job = db.get(Job, job_id)
    job.status = "analysing"
    db.commit()
    db.expire_all()

    all_processed_spans = []
    
    for i, batch in enumerate(cleaned_list):
        print(f"Evaluating {i + 1}/{len(transcribed_patches)} ")
        result_from_llm = await send_to_llm(batch, default_definitions, positive_examples, negative_examples)
        llm_spans = result_from_llm["spans"]
        processed_spans = find_matching_spans(transcribed_patches[i], llm_spans)
        all_processed_spans.extend(processed_spans)

    # Read the final transcribed text from file
    with open(Path(original_path).with_suffix('.txt'), 'r', encoding='utf-8') as f:
        transcribed_text = f.read()

    # Read the JSON dumps
    print("Done!")

    final_result = {"transcript_text": transcribed_text, "spans": all_processed_spans}

    txt_path = Path(original_path).with_suffix('.json')
    with open(txt_path, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, indent=4)

    # Save final result to file

    job = db.get(Job, job_id)
    job.status = "completed"
    db.commit()

    db.close()
