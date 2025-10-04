from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from typing import List
import os

from app.database import get_db
from app.models import Batch, Job
from app.schemas import BatchResponse, JobAnalysisResult, AnalysisSpan, JobInfo

router = APIRouter()


@router.get("/file/{job_id}")
async def retrieve_file(job_id: str):
    """
    Retrieve a file based on job ID.
    """
    
    # Construct the file path
    file_path = os.path.join("uploads", f"{job_id}")
    
    # Find file with any extension
    if not os.path.exists("uploads"):
        raise HTTPException(status_code=404, detail="Uploads directory not found")
    
    # Search for files matching the job_id
    matching_files = [f for f in os.listdir("uploads") if f.startswith(f"{job_id}.")]
    
    if not matching_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Use the first matching file
    filename = matching_files[0]
    file_path = os.path.join("uploads", filename)
    
    # Determine media type based on extension
    extension = filename.split('.')[-1].lower()
    media_types = {
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'mkv': 'video/x-matroska',
        'flv': 'video/x-flv',
        'wmv': 'video/x-ms-wmv',
        'webm': 'video/webm',
    }
    media_type = media_types.get(extension, 'application/octet-stream')
    
    # Return the file
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


@router.get("/transcription/{job_id}")
async def retrieve_transcription(job_id: str):
    """
    Retrieve a transcription file based on job ID.
    """
    
    # Construct the file path for transcription
    transcription_filename = f"{job_id}.txt"
    file_path = os.path.join("uploads", transcription_filename)
    
    # Check if transcription file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    # Return the file
    return FileResponse(
        path=file_path,
        media_type='text/plain',
        filename=transcription_filename
    )


@router.get("/batch/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str, db: Session = Depends(get_db)):
    """Get batch details including job information"""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
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


@router.get("/batch/{batch_id}/{job_id}", response_model=JobAnalysisResult)
async def get_job_analysis(batch_id: str, job_id: str, db: Session = Depends(get_db)):
    """Get job analysis results"""
    job = db.query(Job).filter(Job.id == job_id, Job.batch_id == batch_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed yet. Current status: {job.status}")
    
    # Parse analysis result
    analysis_data = job.get_analysis_result_dict()
    if not analysis_data:
        # Fallback: return basic structure if no analysis data
        return JobAnalysisResult(
            audio_file_id=job.original_filename or job.id,
            transcript_text=job.transcript_text or "",
            spans=[]
        )
    
    # Convert analysis data to response format
    spans = []
    if "spans" in analysis_data:
        for span in analysis_data["spans"]:
            spans.append(AnalysisSpan(
                start=span.get("start", "00:00:00.000"),
                end=span.get("end", "00:00:00.000"),
                text=span.get("text", ""),
                rationale=span.get("rationale", "")
            ))
    
    return JobAnalysisResult(
        audio_file_id=job.original_filename or job.id,
        transcript_text=job.transcript_text or "",
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
    
    file_path = Path(job.original_file_path)
    
    # Determine media type based on extension
    extension = file_path.suffix.lower()
    media_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.flv': 'video/x-flv',
        '.wmv': 'video/x-ms-wmv',
        '.webm': 'video/webm',
    }
    media_type = media_types.get(extension, 'application/octet-stream')
    
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=job.original_filename or file_path.name
    )

