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


def process_file(original_path: str, patch_duration_sec: int, overlap_sec: int):
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
        patches = split_audio_to_patches(str(audio_path), patch_duration_sec, overlap_sec)

        # Transcribe
        all_results = transcribe_patches(patches, whisper_model)

        return all_results


def send_to_llm(transcribed_text: str, default_definitions: list = None, custom_definitions: list = None, negative_examples: list = None):
    """Send transcribed text to LLM for analysis"""
    print("SENDING TO LLM")
    response = requests.post(
        "http://localhost:8001/detect",
        json={
            "transcription": transcribed_text,
            "default_definitions": default_definitions or [],
            "custom_definitions": custom_definitions or [],
            "negative_examples": negative_examples or []
        }
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


def main_background_function(job_id: str, original_path: str, patch_duration_sec: int, overlap_sec: int, db: Session, default_definitions: list = None, custom_definitions: list = None, negative_examples: list = None):

    job = db.get(Job, job_id)
    job.status = "transcribing"
    db.commit()
    db.expire_all()

    transcribed_patches = process_file(original_path, patch_duration_sec, overlap_sec)

    print(transcribed_patches)

    transcribed_text = transcribed_patches[0]["patch_text"].strip()

    # Save transcribed text to file
    txt_path = Path(original_path).with_suffix('.txt')
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(transcribed_text)

    job = db.get(Job, job_id)
    job.status = "analysing"
    db.commit()
    db.expire_all()

    result_from_llm = send_to_llm(transcribed_text, default_definitions, custom_definitions, negative_examples)

    # print(result_from_llm)

    llm_spans = result_from_llm["spans"]
    processed_spans = find_matching_spans(transcribed_patches[0], llm_spans)

    final_result = {"transcript_text": transcribed_text, "spans": processed_spans}

    # Save final result to file
    processed_dir = Path("processed")

    # Check if the original path includes a zip extraction directory
    zip_extract_dir = Path(original_path).parent
    if zip_extract_dir.name.startswith(f"batch_{job.batch_id}_zip_"):
        processed_dir = processed_dir / zip_extract_dir.name

    processed_dir.mkdir(parents=True, exist_ok=True)
    processed_file_path = processed_dir / (Path(original_path).stem + "_processed_spans.json")

    with open(processed_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, indent=4)

    # print(processed_spans)

    job = db.get(Job, job_id)
    job.status = "completed"
    db.commit()
    db.close()
