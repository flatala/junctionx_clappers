from fastapi import FastAPI, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job
from pathlib import Path
from typing import List, Optional
import json
from moviepy import VideoFileClip, concatenate_videoclips
from pydub import AudioSegment
import zipfile
from fastapi.responses import FileResponse

app = FastAPI()

def process_remove(file_path: Path, spans: List[dict]) -> Path:
    clip = VideoFileClip(str(file_path))
    processed_clips = []

    start = 0
    for span in spans:
        processed_clips.append(clip.subclip(start, span['start']))
        start = span['end']
    processed_clips.append(clip.subclip(start, clip.duration))

    final_clip = concatenate_videoclips(processed_clips)
    output_path = file_path.parent / f"cleaned_{file_path.name}"
    final_clip.write_videofile(str(output_path), codec="libx264")
    return output_path

def process_silence(file_path: Path, spans: List[dict]) -> Path:
    audio = AudioSegment.from_file(file_path)
    for span in spans:
        start_ms = int(span['start'] * 1000)
        end_ms = int(span['end'] * 1000)
        audio = audio[:start_ms] + AudioSegment.silent(duration=(end_ms - start_ms)) + audio[end_ms:]

    output_path = file_path.parent / f"silenced_{file_path.name}"
    audio.export(output_path, format="mp4")
    return output_path

def process_beep(file_path: Path, spans: List[dict]) -> Path:
    audio = AudioSegment.from_file(file_path)
    beep = AudioSegment.sine(frequency=1000, duration=500)

    for span in spans:
        start_ms = int(span['start'] * 1000)
        end_ms = int(span['end'] * 1000)
        duration = end_ms - start_ms
        repeated_beep = beep * (duration // len(beep))
        audio = audio[:start_ms] + repeated_beep + audio[end_ms:]

    output_path = file_path.parent / f"beeped_{file_path.name}"
    audio.export(output_path, format="mp4")
    return output_path

@app.post("/clean")
def clean(
    batch_id: Optional[str] = Query(None),
    job_ids: Optional[List[str]] = Query(None),
    processing_method: str = Query("remove", regex="^(remove|silence|beep)$"),
    db: Session = Depends(get_db)
):
    if not batch_id and not job_ids:
        # Clean all batches and jobs
        jobs = db.query(Job).all()
    elif batch_id and not job_ids:
        # Clean all jobs in the given batch
        jobs = db.query(Job).filter(Job.batch_id == batch_id).all()
    elif job_ids:
        # Clean specific jobs
        jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid parameters. Provide either batch_id or job_ids.")

    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found for the given parameters.")

    processed_files = []
    for job in jobs:
        file_path = Path(job.original_file_path)
        if not file_path.exists():
            print(f"[WARNING] File not found: {file_path}")
            continue

        spans_path = file_path.parent / f"{job.batch_id}-{job.id}-processed_span.json"
        if not spans_path.exists():
            print(f"[WARNING] Processed spans file not found: {spans_path}")
            continue

        with open(spans_path, "r") as f:
            spans = json.load(f)

        if processing_method == "remove":
            output_path = process_remove(file_path, spans)
        elif processing_method == "silence":
            output_path = process_silence(file_path, spans)
        elif processing_method == "beep":
            output_path = process_beep(file_path, spans)

        processed_files.append(output_path)

        # Update job status
        job.status = "cleaned"
        job.cleaned_file_path = str(output_path)
        db.commit()

    # Create a zip file with all processed files
    zip_path = Path("uploads/cleaned_data.zip")
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file in processed_files:
            zipf.write(file, arcname=file.name)

    return FileResponse(zip_path, media_type="application/zip", filename="cleaned_data.zip")