from fastapi import File, UploadFile, Form, routing, BackgroundTasks, Depends, HTTPException
from fastapi import File, UploadFile, Form, routing, BackgroundTasks, Depends, HTTPException
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import get_db
import shutil
import zipfile
import tempfile
from typing import List, Optional
from app.models import Job, Batch
from app.background_tasks import main_background_function
import zipfile
import tempfile
from typing import List

router = routing.APIRouter()


def extract_audio_from_zip(zip_file: UploadFile, extract_dir: Path) -> List[Path]:
    """Extract audio/video files from a ZIP archive"""
    audio_video_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'}
    extracted_files = []
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_zip:
        shutil.copyfileobj(zip_file.file, temp_zip)
        temp_zip.flush()
        
        with zipfile.ZipFile(temp_zip.name, 'r') as zip_ref:
            for file_info in zip_ref.filelist:
                if not file_info.is_dir():
                    file_path = Path(file_info.filename)
                    if file_path.suffix.lower() in audio_video_extensions:
                        # Extract to a safe filename
                        safe_filename = file_path.name.replace(" ", "_")
                        extract_path = extract_dir / safe_filename
                        
                        with zip_ref.open(file_info) as source, open(extract_path, 'wb') as target:
                            shutil.copyfileobj(source, target)
                        
                        extracted_files.append(extract_path)
    
    Path(temp_zip.name).unlink()  # Clean up temp zip file
    return extracted_files


@router.post("")
async def upload_batch(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    extremism_definition: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    patch_duration_sec: int = Form(120),
    overlap_sec: int = Form(30),
    db: Session = Depends(get_db)
):
    """Upload multiple files as a batch for processing"""
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Create uploads directory
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    # Create batch
    batch = Batch(
        name=name,
        description=description,
        extremism_definition=extremism_definition
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    all_files_to_process = []
    
    # Process each uploaded file
    for uploaded_file in files:
        if not uploaded_file.filename:
            continue
            
        file_path = Path(uploaded_file.filename)
        
        # Check if it's a ZIP file
        if file_path.suffix.lower() == '.zip':
            # Extract audio/video files from ZIP
            zip_extract_dir = uploads_dir / f"batch_{batch.id}_zip_{file_path.stem}"
            zip_extract_dir.mkdir(exist_ok=True)
            
            try:
                extracted_files = extract_audio_from_zip(uploaded_file, zip_extract_dir)
                for extracted_file in extracted_files:
                    all_files_to_process.append((extracted_file.name, extracted_file))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to extract ZIP file {uploaded_file.filename}: {str(e)}")
        else:
            # Regular audio/video file
            file_ext = file_path.suffix
            temp_filename = f"batch_{batch.id}_{file_path.stem}_{len(all_files_to_process)}{file_ext}"
            temp_path = uploads_dir / temp_filename
            
            with open(temp_path, "wb") as f:
                shutil.copyfileobj(uploaded_file.file, f)
            
            all_files_to_process.append((uploaded_file.filename, temp_path))
    
    if not all_files_to_process:
        db.delete(batch)
        db.commit()
        raise HTTPException(status_code=400, detail="No valid audio/video files found")
    
    # Create jobs for each file
    for original_filename, file_path in all_files_to_process:
        job = Job(
            batch_id=batch.id,
            original_filename=original_filename,
            original_file_path=str(file_path),
            status="pending"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Launch background task for each job
        background_tasks.add_task(
            main_background_function,
            str(job.id),
            str(file_path),
            patch_duration_sec,
            overlap_sec,
            db,
            extremism_definition
        )
    
    return {"batch_id": batch.id}


# Legacy endpoint for backward compatibility
@router.post("/single")
async def transcribe_single(
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
                str(job.id),
                str(original_path),
                patch_duration_sec,
                overlap_sec,
                db
            )
            job_ids.append(job.id)

    if not job_ids:
        raise HTTPException(status_code=400, detail="No valid files provided.")

    return {"job_ids": job_ids}
