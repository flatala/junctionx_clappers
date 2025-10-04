from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from typing import List
import os
import mimetypes
import json

from app.database import get_db
from app.models import Batch, Job
from app.schemas import BatchResponse, JobAnalysisResult, AnalysisSpan, JobInfo

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


@router.get("/batch/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str, db: Session = Depends(get_db)):
    """Get batch details including job information"""
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    jobs = []
    for job in batch.jobs:
        jobs.append(JobInfo(
            job_id=job.id,
            filename=job.original_filename or f"job_{job.id}",
            status=job.status
        ))
    
    return BatchResponse(
        name=batch.name,
        description=batch.description,
        jobs=jobs
    )


@router.get("/batch/{batch_id}/status")
async def get_batch_status(batch_id: str, db: Session = Depends(get_db)):
    """Get status of all jobs in a batch"""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    jobs_status = []
    for job in batch.jobs:
        jobs_status.append({
            "job_id": job.id,
            "name": job.original_filename or job.id,
            "status": job.status
        })
    
    return {
        "batch_id": batch.id,
        "batch_status": batch.status,
        "jobs": jobs_status
    }

