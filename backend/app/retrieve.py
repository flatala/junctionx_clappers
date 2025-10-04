from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

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

