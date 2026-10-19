"""
SQLAlchemy Model for Password Reset OTP verification.
Stores time-limited, single-use security codes for both Patient and Pharmacist portals.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.database import Base


class PasswordResetOTP(Base):
    """Temporary one-time passcode for password recovery."""
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), index=True, nullable=False)
    role = Column(String(50), nullable=False)  # 'user' or 'pharmacist'
    otp_code = Column(String(10), nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
