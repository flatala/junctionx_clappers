import uuid

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for demonstration"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String(length=100), nullable=True)
    original_file_path = Column(String(length=256), nullable=True)
    transcript_file_path = Column(String(length=256), nullable=True)
    processed_transcript_path = Column(String(length=256), nullable=True)

