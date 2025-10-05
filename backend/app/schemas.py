from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    """Base user schema"""
    name: str
    email: EmailStr

class UserCreate(UserBase):
    """Schema for creating a user"""
    pass

class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchCreate(BaseModel):
    """Schema for creating a batch"""
    name: str
    description: Optional[str] = None
    extremism_definition: Optional[str] = None


class JobInfo(BaseModel):
    """Schema for job information within a batch"""
    job_id: str
    filename: str
    status: str

    class Config:
        from_attributes = True


class BatchResponse(BaseModel):
    """Schema for batch response"""
    name: str
    batch_id: str  # Added batch_id field
    description: Optional[str] = None
    jobs: List[JobInfo]

    class Config:
        from_attributes = True


class AnalysisSpan(BaseModel):
    """Schema for analysis span"""
    start: str
    end: str
    text: str
    rationale: str


class JobAnalysisResult(BaseModel):
    """Schema for job analysis result"""
    audio_file_id: str
    transcript_text: str
    spans: List[AnalysisSpan]

    class Config:
        from_attributes = True


class JobStatus(BaseModel):
    """Schema for job status"""
    job_id: str
    name: str
    status: str

    class Config:
        from_attributes = True
