from fastapi import File, UploadFile, Form, routing, BackgroundTasks, Depends
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import get_db
import shutil
from app.models import Job
from app.background_tasks import main_background_function

router = routing.APIRouter()


@router.post("")
async def transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    patch_duration_sec: int = Form(120),
    overlap_sec: int = Form(30),
    db: Session = Depends(get_db)
):
    # Save the uploaded file permanently (original copy)
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    job = Job(status="transcribing")
    db.add(job)
    db.commit()
    db.refresh(job)

    # Get file extension
    file_ext = Path(file.filename).suffix if file.filename else ""
    original_path = uploads_dir / f"{job.id}{file_ext}"
    
    with open(str(original_path), "wb") as f:
        shutil.copyfileobj(file.file, f)

    job.original_file_path = str(original_path)

    # Launch background task
    background_tasks.add_task(
        main_background_function,
        str(job.id),
        str(original_path),
        patch_duration_sec,
        overlap_sec,
        db
    )

    return str(job.id)


