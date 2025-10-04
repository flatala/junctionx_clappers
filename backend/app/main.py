from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.test_user import router as user_router
from app.upload_api import router as upload_router
# from whisper_processing import process_audio_file


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JunctionX Clappers API",
    description="Minimal FastAPI template with MySQL database",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000", 
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(router=user_router, prefix="/users", tags=["Users"])
app.include_router(router=upload_router, prefix="/upload", tags=["Upload"])


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


# @app.post("/upload-audio")
# async def process_audio(file: UploadFile = File(...)):
#     result = await process_audio_file(file)
#
#     return result
