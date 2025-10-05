from fastapi import File, UploadFile, Form, routing, BackgroundTasks, Depends, HTTPException
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import get_db
import shutil
import zipfile
import tempfile
import json
from typing import List, Optional
from app.models import Job, Batch
from app.background_tasks import main_background_function

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
                    
                    # Skip macOS metadata files and hidden files
                    if file_path.name.startswith('._') or file_path.name.startswith('.'):
                        continue
                    
                    # Skip __MACOSX directory files
                    if '__MACOSX' in file_path.parts:
                        continue
                    
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
    default_definitions: str = Form("[]"),
    positive_examples: str = Form("[]"),
    negative_examples: str = Form("[]"),
    files: List[UploadFile] = File(...),
    patch_duration_sec: int = Form(1800),
    overlap_sec: int = Form(30),
    db: Session = Depends(get_db)
):
    """Upload multiple files as a batch for processing"""

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Create uploads directory
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Parse JSON strings to lists
    try:
        default_defs_list = json.loads(default_definitions)
        positive_examples_list = json.loads(positive_examples)
        negative_examples_list = json.loads(negative_examples)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in definitions: {str(e)}")

    # Create batch
    batch = Batch(
        name=name,
        description=description
    )
    batch.set_default_definitions(default_defs_list)
    batch.set_positive_examples(positive_examples_list)
    batch.set_negative_examples(negative_examples_list)
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
            default_defs_list,
            positive_examples_list,
            negative_examples_list
        )
    
    return {"batch_id": batch.id}
