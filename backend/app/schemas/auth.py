"""
Pydantic Request & Response Schemas for Authentication & User Accounts.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr


class UserSignupReq(BaseModel):
    """Schema for Patient / User Registration."""
    email: EmailStr
    password: str
    full_name: str


class PharmacistSignupReq(BaseModel):
    """Schema for Licensed Clinical Pharmacist Registration."""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = ""
    license_number: Optional[str] = ""


class LoginReq(BaseModel):
    """Schema for Account Login."""
    email: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    email: str
    role: str
    full_name: str
    phone: Optional[str] = ""


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
