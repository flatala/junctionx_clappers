from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import engine, get_db, Base
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.test_user import router as user_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JunctionX Clappers API",
    description="Minimal FastAPI template with MySQL database",
    version="1.0.0"
)
app.include_router(router=user_router, prefix="/users")


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


