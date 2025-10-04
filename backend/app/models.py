import uuid
import json

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """User model for demonstration"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Batch(Base):
    """Batch model for grouping multiple file processing jobs"""
    __tablename__ = "batches"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    extremism_definition = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="processing")  # processing, completed, failed
    
    # Relationship to jobs
    jobs = relationship("Job", back_populates="batch")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(length=36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    status = Column(String(length=100), default="pending")  # pending, processing, completed, failed
    original_filename = Column(String(255), nullable=True)
    original_file_path = Column(String(length=256), nullable=True)
    transcript_text = Column(Text, nullable=True)
    analysis_result = Column(Text, nullable=True)  # JSON string of analysis spans
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship to batch
    batch = relationship("Batch", back_populates="jobs")
    
    def get_analysis_result_dict(self):
        """Parse analysis_result JSON string to dict"""
        if self.analysis_result:
            try:
                return json.loads(self.analysis_result)
            except json.JSONDecodeError:
                return None
        return None
    
    def set_analysis_result_dict(self, data):
        """Set analysis_result from dict"""
        if data:
            self.analysis_result = json.dumps(data)
        else:
            self.analysis_result = None

