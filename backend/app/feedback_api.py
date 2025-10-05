from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserFeedback, Batch, Job
from app.schemas import UserFeedbackCreate, UserFeedbackResponse, BatchFeedbackSummary
from typing import List

router = APIRouter()


@router.post("/feedback", response_model=UserFeedbackResponse)
async def create_user_feedback(
    feedback: UserFeedbackCreate, 
    db: Session = Depends(get_db)
):
    """
    Create user feedback for a job.
    feedback_type: "positive" means user marked this as extremist (negative example)
                   "negative" means user unmarked this as normal (positive example)
    """
    # Validate job and batch exist
    job = db.get(Job, feedback.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    batch = db.get(Batch, feedback.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if job.batch_id != feedback.batch_id:
        raise HTTPException(status_code=400, detail="Job does not belong to this batch")
    
    # Create feedback
    db_feedback = UserFeedback(
        job_id=feedback.job_id,
        batch_id=feedback.batch_id,
        text=feedback.text,
        feedback_type=feedback.feedback_type,
        original_confidence=feedback.original_confidence
    )
    
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    return db_feedback


@router.get("/feedback/batch/{batch_id}", response_model=List[UserFeedbackResponse])
async def get_batch_feedback(batch_id: str, db: Session = Depends(get_db)):
    """Get all user feedback for a batch"""
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    feedback_list = db.query(UserFeedback).filter(
        UserFeedback.batch_id == batch_id
    ).all()
    
    return feedback_list


@router.get("/feedback/batch/{batch_id}/summary", response_model=BatchFeedbackSummary)
async def get_batch_feedback_summary(batch_id: str, db: Session = Depends(get_db)):
    """
    Get summary of user feedback for a batch.
    positive_examples: Newly marked phrases (marked as extremist by user)
    negative_examples: Unmarked phrases (marked as normal by user)
    """
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    feedback_list = db.query(UserFeedback).filter(
        UserFeedback.batch_id == batch_id
    ).all()
    
    positive_examples = []
    negative_examples = []
    
    for feedback in feedback_list:
        if feedback.feedback_type == "positive":
            # User marked this as extremist (negative example for training)
            negative_examples.append(feedback.text)
        elif feedback.feedback_type == "negative":
            # User unmarked this as normal (positive example for training)
            positive_examples.append(feedback.text)
    
    return BatchFeedbackSummary(
        positive_examples=positive_examples,
        negative_examples=negative_examples
    )


@router.get("/feedback/job/{job_id}", response_model=List[UserFeedbackResponse])
async def get_job_feedback(job_id: str, db: Session = Depends(get_db)):
    """Get all user feedback for a specific job"""
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    feedback_list = db.query(UserFeedback).filter(
        UserFeedback.job_id == job_id
    ).all()
    
    return feedback_list


@router.delete("/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str, db: Session = Depends(get_db)):
    """Delete a user feedback entry"""
    feedback = db.get(UserFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    db.delete(feedback)
    db.commit()
    
    return {"message": "Feedback deleted successfully"}
