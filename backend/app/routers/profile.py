"""
Profile Management API Router.
Handles clinical background profiles for Patients and professional licensing details for Pharmacists.
"""

from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import get_db, get_current_user_required
from app.schemas.profile import UserProfileUpdateReq, PharmacistProfileUpdateReq

router = APIRouter(prefix="/profile", tags=["Profile Management"])


@router.get("/me", summary="Fetch Caller Profile")
def get_my_profile(current_user: Any = Depends(get_current_user_required)):
    """Retrieves full medical or clinical profile attributes for current caller."""
    if getattr(current_user, "role", "user") == "pharmacist":
        return {
            "profile": {
                "id": current_user.id,
                "user_id": current_user.id,
                "full_name": current_user.full_name,
                "email": current_user.email,
                "role": "pharmacist",
                "license_number": getattr(current_user, "license_number", ""),
                "phone": getattr(current_user, "phone", "")
            }
        }

    return {
        "profile": {
            "id": current_user.id,
            "user_id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": "user",
            "age": current_user.age,
            "gender": current_user.gender,
            "height": current_user.height,
            "weight": current_user.weight,
            "pregnancy_status": current_user.pregnancy_status,
            "allergies": current_user.allergies,
            "medical_conditions": current_user.medical_conditions,
            "current_medications": current_user.current_medications,
            "phone": current_user.phone
        }
    }


@router.put("/user", summary="Update Patient Profile")
def update_user_profile(
    req: UserProfileUpdateReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Updates personalized patient health profile parameters."""
    if req.age is not None:
        current_user.age = req.age
    if req.gender is not None:
        current_user.gender = req.gender
    if req.height is not None:
        current_user.height = req.height
    if req.weight is not None:
        current_user.weight = req.weight
    if req.pregnancy_status is not None:
        current_user.pregnancy_status = req.pregnancy_status
    if req.allergies is not None:
        current_user.allergies = req.allergies
    if req.medical_conditions is not None:
        current_user.medical_conditions = req.medical_conditions
    if req.current_medications is not None:
        current_user.current_medications = req.current_medications

    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Patient profile updated successfully."}


@router.put("/pharmacist", summary="Update Pharmacist Profile")
def update_pharmacist_profile(
    req: PharmacistProfileUpdateReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Updates practitioner credentials and contact numbers."""
    if req.license_number is not None:
        current_user.license_number = req.license_number
    if req.phone is not None:
        current_user.phone = req.phone

    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Pharmacist profile updated."}
