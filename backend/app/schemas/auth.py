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
    phone: Optional[str] = ""


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


class ForgotPasswordOtpReq(BaseModel):
    """Request to generate and send OTP for password reset."""
    email: EmailStr
    role: str = "user"  # "user" or "pharmacist"


class VerifyOtpReq(BaseModel):
    """Request to verify OTP code before allowing password change."""
    email: EmailStr
    role: str = "user"
    otp_code: str


class ResetPasswordVerifyReq(BaseModel):
    """Request to verify OTP and set a new password."""
    email: EmailStr
    role: str = "user"  # "user" or "pharmacist"
    otp_code: str
    new_password: str


class ForgotEmailReq(BaseModel):
    """Request to retrieve registered email using phone number."""
    phone: str
    role: str = "user"  # "user" or "pharmacist"


class ForgotEmailSendOtpReq(BaseModel):
    """Request to verify phone and dispatch OTP to linked account email."""
    phone: str
    role: str = "user"


class ForgotEmailVerifyOtpReq(BaseModel):
    """Request to verify OTP and deliver the recovered email address."""
    phone: str
    role: str = "user"
    otp_code: str


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

