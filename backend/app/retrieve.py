from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Batch, Job
from app.schemas import BatchResponse, JobAnalysisResult, AnalysisSpan, JobInfo
import os
import mimetypes
import json
from pathlib import Path

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

    if not job.original_file_path:
        return to_return

    transcription_path = Path(job.original_file_path).with_suffix('.txt')
    if transcription_path.exists():
        with open(transcription_path, "r") as f:
            to_return["transcript_text"] = f.read()
    else:
        to_return["transcript_text"] = ""

    if job.status == "analysing":
        return to_return

    json_path = Path(job.original_file_path).with_suffix('.json')
    if json_path.exists():
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


@router.get("/batch/{batch_id}/{job_id}", response_model=JobAnalysisResult)
async def get_job_analysis(batch_id: str, job_id: str, db: Session = Depends(get_db)):
    """Get job analysis results"""
    job = db.query(Job).filter(Job.id == job_id, Job.batch_id == batch_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed yet. Current status: {job.status}")

    # Read analysis results from JSON file
    if not job.original_file_path:
        raise HTTPException(status_code=404, detail="Original file path not found")

    json_path = Path(job.original_file_path).with_suffix('.json')
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Analysis results file not found")

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read analysis results: {str(e)}")

    # Convert analysis data to response format
    spans = []
    if "spans" in analysis_data:
        for span in analysis_data["spans"]:
            # Convert start/end to strings if they are floats
            start = span.get("start", "00:00:00.000")
            end = span.get("end", "00:00:00.000")
            
            # Convert float timestamps to string format
            if isinstance(start, (int, float)):
                start = str(start)
            if isinstance(end, (int, float)):
                end = str(end)
            
            spans.append(AnalysisSpan(
                start=start,
                end=end,
                text=span.get("text", ""),
                rationale=span.get("rationale", ""),
                confidence=span.get("confidence", 0.0)
            ))

    return JobAnalysisResult(
        audio_file_id=job.original_filename or job.id,
        transcript_text=analysis_data.get("transcript_text", ""),
        spans=spans
    )


@router.get("/batch/{batch_id}/{job_id}/file")
async def get_job_file(batch_id: str, job_id: str, db: Session = Depends(get_db)):
    """Get the original audio file for a job"""
    job = db.query(Job).filter(Job.id == job_id, Job.batch_id == batch_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.original_file_path or not os.path.exists(job.original_file_path):
        raise HTTPException(status_code=404, detail="Original file not found")

    # Determine media type based on extension
    media_type, _ = mimetypes.guess_type(job.original_file_path)
    if media_type is None:
        media_type = "application/octet-stream"

    return FileResponse(
        path=job.original_file_path,
        media_type=media_type,
        filename=job.original_filename or Path(job.original_file_path).name
    )

