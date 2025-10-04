from fastapi import FastAPI, UploadFile, File
from app.database import engine, Base
from app.test_user import router as user_router
import whisper
import tempfile


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JunctionX Clappers API",
    description="Minimal FastAPI template with MySQL database",
    version="1.0.0"
)
app.include_router(router=user_router, prefix="/users", tags=["users"])


# Load model once on startup
whisper_model = whisper.load_model("small")


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


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = whisper_model.transcribe(tmp_path)

    return {
        "text": result["text"],
        "segments": result["segments"],  # includes start/end timestamps
        "language": result["language"],
    }
