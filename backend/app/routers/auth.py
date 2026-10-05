"""
Authentication & Authorization API Router.
Handles Patient and Pharmacist registration, credential verification, and JWT session tokens.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import (
    get_db,
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_required
)
from app.models import User, Pharmacist
from app.schemas.auth import UserSignupReq, PharmacistSignupReq, LoginReq

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ----------------- 1. PATIENT / USER AUTH -----------------

@router.post("/user/signup", summary="Patient Registration")
def user_signup(req: UserSignupReq, db: Session = Depends(get_db)):
    """Registers a new patient account with encrypted credentials."""
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user account with this email already exists."
        )

    new_user = User(
        email=clean_email,
        password_hash=get_password_hash(req.password),
        role="user",
        full_name=req.full_name.strip()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "role": "user"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "full_name": new_user.full_name
        }
    }


@router.post("/user/login", summary="Patient Login")
def user_login(req: LoginReq, db: Session = Depends(get_db)):
    """Authenticates patient and returns a signed JWT bearer token."""
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "role": "user"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    }


# ----------------- 2. PHARMACIST AUTH -----------------

@router.post("/pharmacist/signup", summary="Pharmacist Registration")
def pharmacist_signup(req: PharmacistSignupReq, db: Session = Depends(get_db)):
    """Registers a licensed clinical pharmacist account."""
    clean_email = req.email.strip().lower()
    existing = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pharmacist account with this email already exists."
        )

    new_pharma = Pharmacist(
        email=clean_email,
        password_hash=get_password_hash(req.password),
        role="pharmacist",
        full_name=req.full_name.strip(),
        phone=req.phone or "",
        license_number=req.license_number or ""
    )
    db.add(new_pharma)
    db.commit()
    db.refresh(new_pharma)

    token = create_access_token({"sub": str(new_pharma.id), "role": "pharmacist"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_pharma.id,
            "email": new_pharma.email,
            "role": new_pharma.role,
            "full_name": new_pharma.full_name,
            "phone": new_pharma.phone
        }
    }


@router.post("/pharmacist/login", summary="Pharmacist Login")
def pharmacist_login(req: LoginReq, db: Session = Depends(get_db)):
    """Authenticates licensed pharmacist and returns clinical session token."""
    clean_email = req.email.strip().lower()
    pharma = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    if not pharma or not verify_password(req.password, pharma.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(pharma.id), "role": "pharmacist"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": pharma.id,
            "email": pharma.email,
            "role": pharma.role,
            "full_name": pharma.full_name,
            "phone": pharma.phone
        }
    }


# ----------------- 3. ACTIVE USER CONTEXT -----------------

@router.get("/me", summary="Current Active Identity")
def get_auth_me(current_user: Any = Depends(get_current_user_required)):
    """Retrieves session identity for the authorized caller."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "phone": getattr(current_user, "phone", "")
    }
