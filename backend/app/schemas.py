from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

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
