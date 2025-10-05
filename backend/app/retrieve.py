from typing import Tuple
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Batch, Job
from app.schemas import BatchResponse, JobAnalysisResult, AnalysisSpan, JobInfo, Optional, List
import os
import tempfile
import asyncio
import zipfile
import mimetypes
import json
from pathlib import Path

router = APIRouter()
PROCESSED_ROOT = Path("processed")

@router.get("/all_batches", response_model=list[BatchResponse])
async def get_all_batches(db: Session = Depends(get_db)):
    """Get all batches with their jobs"""
    batches = db.query(Batch).all()
    response = []
    for batch in batches:
        jobs = []
        for job in batch.jobs:
            jobs.append(JobInfo(
                job_id=job.id,
                filename=job.original_filename or f"job_{job.id}",
                status=job.status
            ))
        response.append(BatchResponse(
            name=batch.name,
            batch_id=batch.id,
            description=batch.description,
            jobs=jobs,
        ))
    return response

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
        batch_id=batch.id,
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

@router.post("/get_processed_spans")
async def get_job_processed_spans(
    batch_id: str,
    job_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """
    Get processed spans for a job or batch. Always returns a ZIP file.
    If job_id is provided -> ZIP contains only that job's processed JSON.
    If job_id omitted -> ZIP contains all processed JSONs in the batch.
    """
    def find_processed(original_path: str, batch_id: str) -> Optional[Path]:
        p = Path(original_path)
        stem_file = p.stem + "_processed_spans.json"
        zip_dir = p.parent

        # Prefer processed/<zip_extract_dir>/... when parent looks like batch_<batch_id>_zip_*
        if zip_dir.name.startswith(f"batch_{batch_id}_zip_"):
            cand = PROCESSED_ROOT / zip_dir.name / stem_file
            if cand.exists():
                return cand

        # Fallback to processed/<stem>_processed_spans.json
        cand = PROCESSED_ROOT / stem_file
        return cand if cand.exists() else None

    print(f"[DEBUG] batch_id: {batch_id}, job_id: {job_id}")

    # ---- collect processed files ----
    if job_id:
        job = db.query(Job).filter(Job.id == job_id, Job.batch_id == batch_id).one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not job.original_file_path:
            raise HTTPException(status_code=404, detail="Original file path not found")

        proc = find_processed(job.original_file_path, job.batch_id)
        if not proc:
            raise HTTPException(status_code=404, detail="Processed spans file not found")

        found = [(proc, f"{job.id}_{proc.name}")]

    else:
        jobs = db.query(Job).filter(Job.batch_id == batch_id).all()
        print("Jobs in batch:", len(jobs))
        if not jobs:
            raise HTTPException(status_code=404, detail="Batch not found or no jobs in batch")

        found: List[Tuple[Path, str]] = []
        for job in jobs:
            if not job.original_file_path:
                continue
            p = find_processed(job.original_file_path, job.batch_id)
            if p:
                found.append((p, f"{job.id}_{p.name}"))

        if not found:
            raise HTTPException(status_code=404, detail="No processed spans JSON files found for this batch")

    # ---- write ZIP ----
    tmp = tempfile.NamedTemporaryFile(suffix=f"_batch_{batch_id}_processed_spans.zip", delete=False)
    tmp_path = tmp.name
    tmp.close()

    def write_zip(zip_path: str, items: List[Tuple[Path, str]]):
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for p, arc in items:
                zf.write(p, arcname=arc)
        return zip_path

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, write_zip, tmp_path, found)

    # cleanup after response
    background_tasks.add_task(lambda p=tmp_path: os.unlink(p) if os.path.exists(p) else None)

    friendly_name = f"{'job' if job_id else 'batch'}_{batch_id}_processed_spans.zip"
    return FileResponse(path=tmp_path, media_type="application/zip", filename=friendly_name)
