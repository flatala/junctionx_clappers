from sqlalchemy.orm import Session
import tempfile
import shutil
from pathlib import Path
from app.transcribe import convert_video_to_audio, split_audio_to_patches, transcribe_patches
import os
import whisper
from app.models import Job


# Load Whisper model only once
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
print(f"[INFO] Loading Whisper model: {MODEL_SIZE}")
whisper_model = whisper.load_model(MODEL_SIZE)
print("[INFO] Whisper model loaded.")


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


def main_background_function(job_id: str, original_path: str, patch_duration_sec: int, overlap_sec: int, db: Session):

    transcribed_patches = process_file(original_path, patch_duration_sec, overlap_sec)

    # Update job in DB
    job = db.get(Job, job_id)
    job.status = "transcribed"
    db.commit()

    print(transcribed_patches)

    db.close()