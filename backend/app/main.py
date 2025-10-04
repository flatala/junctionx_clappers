from fastapi import FastAPI, UploadFile, File
from app.database import engine, Base
from app.test_user import router as user_router
from app.whisper_processing import process_audio_file


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JunctionX Clappers API",
    description="Minimal FastAPI template with MySQL database",
    version="1.0.0"
)
app.include_router(router=user_router, prefix="/users", tags=["users"])


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to JunctionX Clappers API",
        "status": "active"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected"
    }


@app.post("/upload-audio")
async def process_audio(file: UploadFile = File(...)):
    result = await process_audio_file(file)

    return result
