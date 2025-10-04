from fastapi import File, UploadFile, Form, routing, BackgroundTasks, Depends, HTTPException
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import get_db
import shutil
from app.models import Job
from app.background_tasks import main_background_function
import zipfile
import tempfile
from typing import List

router = routing.APIRouter()


@router.post("")
async def transcribe(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    patch_duration_sec: int = Form(120),
    overlap_sec: int = Form(30),
    db: Session = Depends(get_db)
):
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    job_ids = []
    print(f"[INFO] Received {len(files)} files for transcription.")

    for file in files:
        print(f"[INFO] Processing file: {file.filename}")
        if file.filename.endswith(".zip"):
            print(f"[INFO] Handling zip file: {file.filename}")
            # Handle zip file: extract and process each file inside
            with tempfile.TemporaryDirectory() as tmpdirname:
                zip_path = Path(tmpdirname) / file.filename
                with open(zip_path, "wb") as f:
                    shutil.copyfileobj(file.file, f)
                
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    # Extract all files to temporary directory
                    zip_ref.extractall(tmpdirname)
                    
                    # Get all files from the zip (excluding directories)
                    for file_info in zip_ref.infolist():
                        if not file_info.is_dir() \
                            and not file_info.filename.startswith('._') \
                            and not file_info.filename.startswith('__'):
                            
                            # Get the filename without path
                            extracted_filename = Path(file_info.filename).name
                            print(f"[INFO] Found extracted file: {extracted_filename}")
                            
                            # Copy extracted file to uploads directory
                            extracted_file_path = Path(tmpdirname) / file_info.filename
                            dest_path = uploads_dir / extracted_filename
                            shutil.copy(str(extracted_file_path), dest_path)
                            
                            # Create job for this file
                            job = Job(original_file_path=str(dest_path), status="transcribing")
                            db.add(job)
                            db.commit()
                            db.refresh(job)
                            background_tasks.add_task(
                                main_background_function,
                                job.id,
                                str(dest_path),
                                patch_duration_sec,
                                overlap_sec,
                                db
                            )
                            job_ids.append(job.id)
        else:
            # Handle regular file
            original_path = uploads_dir / file.filename
            with open(original_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            job = Job(original_file_path=str(original_path), status="transcribing")
            db.add(job)
            db.commit()
            db.refresh(job)
            background_tasks.add_task(
                main_background_function,
                job.id,
                str(original_path),
                patch_duration_sec,
                overlap_sec,
                db
            )
            job_ids.append(job.id)

    if not job_ids:
        raise HTTPException(status_code=400, detail="No valid files provided.")

    return {"job_ids": job_ids}
