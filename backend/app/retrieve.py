from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job
import os
import mimetypes
import json

router = APIRouter()


@router.get("/file/{job_id}")
async def retrieve_file(job_id: str):
    """
    Retrieve a file based on job ID.
    """
    
    # Find file with any extension
    if not os.path.exists("uploads"):
        raise HTTPException(status_code=404, detail="Uploads directory not found")
    
    # Search for files matching the job_id
    matching_files = [f for f in os.listdir("uploads") if f.startswith(f"{job_id}.") and (not f.endswith(".txt")) and (not f.endswith(".json"))]
    
    if not matching_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Use the first matching file
    filename = matching_files[0]
    file_path = os.path.join("uploads", filename)

    # Guess the content type based on the file extension
    media_type, _ = mimetypes.guess_type(file_path)

    # Fallback if mimetypes can't guess it
    if media_type is None:
        media_type = "application/octet-stream"
    
    # Return the file
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


@router.get("/{job_id}")
async def retrieve_status_and_processed(job_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a transcription file based on job ID.
    """

    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    to_return = {"status": job.status}

    if job.status == "transcribing":
        return to_return

    transcription_path = os.path.join("uploads", f"{job_id}.txt")
    if os.path.exists(transcription_path):
        with open(transcription_path, "r") as f:
            to_return["transcript_text"] = f.read()
    else:
        to_return["transcript_text"] = ""

    if job.status == "analysing":
        return to_return

    json_path = os.path.join("uploads", f"{job_id}.json")
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            to_return["spans"] = json.load(f)
    else:
        to_return["spans"] = []

    return to_return

