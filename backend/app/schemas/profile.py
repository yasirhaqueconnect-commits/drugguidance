"""
Pydantic Schemas for Patient and Pharmacist Health Profiles.
"""

from typing import Optional
from pydantic import BaseModel


class UserProfileUpdateReq(BaseModel):
    """Schema for updating patient health profile attributes."""
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    pregnancy_status: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    current_medications: Optional[str] = None


class PharmacistProfileUpdateReq(BaseModel):
    """Schema for updating clinical pharmacist credentials."""
    license_number: Optional[str] = None
    phone: Optional[str] = None
