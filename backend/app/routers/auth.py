"""
Authentication & Authorization API Router.
Handles Patient and Pharmacist registration, credential verification, JWT session tokens,
and self-service Account Recovery (Forgot Password via Email OTP, Forgot Email via Phone).
"""

import re
import secrets
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session


from app.core import (
    get_db,
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_required
)
from app.models import User, Pharmacist, PasswordResetOTP
from app.schemas.auth import (
    UserSignupReq,
    PharmacistSignupReq,
    LoginReq,
    ForgotPasswordOtpReq,
    ResetPasswordVerifyReq,
    ForgotEmailReq,
)
from app.services.email_service import (
    send_password_reset_otp_email,
    send_email_recovery_notification
)

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

    clean_phone = req.phone.strip() if req.phone else ""
    new_user = User(
        email=clean_email,
        password_hash=get_password_hash(req.password),
        role="user",
        full_name=req.full_name.strip(),
        phone=clean_phone
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
            "full_name": new_user.full_name,
            "phone": new_user.phone
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
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pharmacist Registration Failed: {str(e)}"
        )


@router.post("/pharmacist/login", summary="Pharmacist Login")
def pharmacist_login(req: LoginReq, db: Session = Depends(get_db)):
    """Authenticates licensed pharmacist and returns clinical session token."""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pharmacist Login Failed: {str(e)}"
        )


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


# ----------------- 4. ACCOUNT RECOVERY (FORGOT PASSWORD & FORGOT EMAIL) -----------------

@router.post("/forgot-password/send-otp", summary="Send Password Reset OTP")
def forgot_password_send_otp(
    req: ForgotPasswordOtpReq,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generates a secure 6-digit OTP and emails it asynchronously to the user's or pharmacist's registered address.
    Returns HTTP 200 immediately (<100ms) without blocking on SMTP socket communication.
    """
    clean_email = req.email.strip().lower()
    target_role = "pharmacist" if req.role.strip().lower() == "pharmacist" else "user"

    if target_role == "pharmacist":
        account = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    else:
        account = db.query(User).filter(User.email == clean_email).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {target_role} account found registered with email '{clean_email}'. Please check your email or register a new account."
        )

    # Invalidate previous unexpired OTPs for this email and role
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == clean_email,
        PasswordResetOTP.role == target_role,
        PasswordResetOTP.is_used == False
    ).update({"is_used": True})

    # Generate 6-digit cryptographically random OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    otp_record = PasswordResetOTP(
        email=clean_email,
        role=target_role,
        otp_code=otp_code,
        is_used=False,
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()

    # Dispatch email asynchronously in background so response returns instantaneously
    full_name = getattr(account, "full_name", "") or ("Pharmacist" if target_role == "pharmacist" else "User")
    background_tasks.add_task(
        send_password_reset_otp_email,
        to_email=clean_email,
        recipient_name=full_name,
        otp_code=otp_code,
        role=target_role
    )

    return {
        "status": "success",
        "message": f"A 6-digit verification code has been dispatched to {clean_email}."
    }



@router.post("/forgot-password/verify-and-reset", summary="Verify OTP and Set New Password")
def forgot_password_verify_and_reset(req: ResetPasswordVerifyReq, db: Session = Depends(get_db)):
    """
    Verifies the one-time code and resets the account password.
    """
    clean_email = req.email.strip().lower()
    target_role = "pharmacist" if req.role.strip().lower() == "pharmacist" else "user"
    clean_otp = req.otp_code.strip()

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    # Check for matching active OTP
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == clean_email,
        PasswordResetOTP.role == target_role,
        PasswordResetOTP.otp_code == clean_otp,
        PasswordResetOTP.is_used == False,
        PasswordResetOTP.expires_at > datetime.utcnow()
    ).order_by(PasswordResetOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check the code or request a new one."
        )

    # Mark OTP as consumed
    otp_record.is_used = True

    # Retrieve account and update hash
    if target_role == "pharmacist":
        account = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    else:
        account = db.query(User).filter(User.email == clean_email).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    account.password_hash = get_password_hash(req.new_password)
    db.commit()

    return {
        "status": "success",
        "message": "Password reset successfully. You can now log in with your new credentials."
    }


@router.post("/forgot-email/find", summary="Find Account Email by Phone Number")
def forgot_email_find(
    req: ForgotEmailReq,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Finds and displays the user's registered email address using their phone number.
    Also dispatches a recovery notice to that email asynchronously.
    """
    input_digits = re.sub(r"\D", "", req.phone)
    if len(input_digits) < 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid contact number (at least 7 digits)."
        )

    target_role = "pharmacist" if req.role.strip().lower() == "pharmacist" else "user"

    if target_role == "pharmacist":
        accounts = db.query(Pharmacist).filter(Pharmacist.phone != "", Pharmacist.phone.isnot(None)).all()
    else:
        accounts = db.query(User).filter(User.phone != "", User.phone.isnot(None)).all()

    matched_account = None
    for acc in accounts:
        acc_digits = re.sub(r"\D", "", acc.phone or "")
        if not acc_digits:
            continue
        # Compare if digits match or last 7-10 digits match (handling country code prefixes like +92 vs 03)
        if acc_digits == input_digits:
            matched_account = acc
            break
        elif len(input_digits) >= 7 and len(acc_digits) >= 7:
            # Check last 7 digits or last 9 digits suffix match
            min_len = min(len(input_digits), len(acc_digits), 9)
            if input_digits[-min_len:] == acc_digits[-min_len:]:
                matched_account = acc
                break

    if not matched_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registered {target_role} account found matching phone number '{req.phone}'."
        )

    # Dispatch email notice to the account address asynchronously in background
    background_tasks.add_task(
        send_email_recovery_notification,
        to_email=matched_account.email,
        recipient_name=getattr(matched_account, "full_name", ""),
        phone=req.phone,
        role=target_role
    )


    return {
        "status": "success",
        "email": matched_account.email,
        "full_name": matched_account.full_name or "",
        "role": target_role,
        "message": f"Registered email account found: {matched_account.email}"
    }

