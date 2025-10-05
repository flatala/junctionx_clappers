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
    default_definitions: List[str] = []
    positive_examples: List[str] = []
    negative_examples: List[str] = []


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
    confidence: float


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


class UserFeedbackCreate(BaseModel):
    """Schema for creating user feedback"""
    job_id: str
    batch_id: str
    text: str
    feedback_type: str  # "positive" (newly marked as extremist) or "negative" (unmarked as normal)
    original_confidence: Optional[float] = None


class UserFeedbackResponse(BaseModel):
    """Schema for user feedback response"""
    id: str
    job_id: str
    batch_id: str
    text: str
    feedback_type: str
    original_confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BatchFeedbackSummary(BaseModel):
    """Schema for batch feedback summary"""
    positive_examples: List[str]  # Newly marked as extremist
    negative_examples: List[str]  # Unmarked as normal

    class Config:
        from_attributes = True
