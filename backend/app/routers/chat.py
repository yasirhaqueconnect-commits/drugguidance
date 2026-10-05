"""
Clinical Assistant RAG & AI Chat API Router.
Coordinates sub-millisecond in-memory vector search with Groq LLM clinical evidence synthesis.
"""

import json
from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import get_db, get_current_user_optional
from app.models import (
    UserConversation, UserMessage,
    PharmacistConversation, PharmacistMessage,
    GuestConversation, GuestMessage
)
from app.services.rag_engine import rag_engine
from app.services.groq_service import generate_medical_response
from app.schemas.chat import ChatMessageReq

router = APIRouter(prefix="/api", tags=["Clinical Assistant Chat"])


@router.post("/chat", summary="Query Clinical Assistant Engine")
def chat_api(
    req: ChatMessageReq,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Unified clinical guidance endpoint:
    - Automatically identifies caller context (Patient, Pharmacist, or Guest).
    - Performs sub-millisecond multi-collection medical RAG vector retrieval.
    - Synthesizes authoritative evidence using Groq LLM.
    - Persists query and guidance into isolated, role-dedicated tables.
    """
    query = req.message.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    # Determine mode & profile
    role_mode = "guest"
    user_profile = None

    if current_user:
        if getattr(current_user, "role", "user") == "pharmacist":
            role_mode = "pharmacist"
        else:
            role_mode = "user"
            user_profile = {
                "allergies": current_user.allergies,
                "current_medications": current_user.current_medications,
                "medical_conditions": current_user.medical_conditions,
                "pregnancy_status": current_user.pregnancy_status,
                "age": current_user.age,
                "gender": current_user.gender,
                "height": current_user.height,
                "weight": current_user.weight
            }

    # 1. Ultra-fast in-memory RAG search (<1ms)
    top_chunks = rag_engine.search(query, top_k=5, user_profile=user_profile)

    # 2. Call Groq AI (strictly in ENGLISH)
    ai_result = generate_medical_response(
        query=query,
        chunks=top_chunks,
        role_mode=role_mode,
        user_profile=user_profile
    )

    # 3. Persistence into DEDICATED TABLES based on role
    conv_id = req.conversation_id

    if role_mode == "pharmacist":
        # Pharmacist Dedicated Table
        pc = None
        if conv_id:
            pc = db.query(PharmacistConversation).filter(
                PharmacistConversation.id == conv_id,
                PharmacistConversation.pharmacist_id == current_user.id
            ).first()

        if not pc:
            title = query[:40] + ("..." if len(query) > 40 else "")
            new_conv = PharmacistConversation(
                pharmacist_id=current_user.id,
                title=title,
                category="Clinical Consultation"
            )
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conv_id = new_conv.id
        else:
            pc.updated_at = datetime.utcnow()
            db.commit()

        # Save into pharmacist_messages
        db.add(PharmacistMessage(conversation_id=conv_id, role="user", content=query))
        db.add(PharmacistMessage(
            conversation_id=conv_id,
            role="assistant",
            content=ai_result["answer"],
            safety_alert=ai_result.get("safety_alert", False),
            emergency=ai_result.get("emergency", False),
            warnings_json=json.dumps(ai_result.get("warnings", [])),
            sources_json="[]",
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    elif role_mode == "user":
        # Patient / User Dedicated Table
        uc = None
        if conv_id:
            uc = db.query(UserConversation).filter(
                UserConversation.id == conv_id,
                UserConversation.user_id == current_user.id
            ).first()

        if not uc:
            title = query[:40] + ("..." if len(query) > 40 else "")
            new_conv = UserConversation(
                user_id=current_user.id,
                title=title,
                category="Medication Inquiry"
            )
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conv_id = new_conv.id
        else:
            uc.updated_at = datetime.utcnow()
            db.commit()

        # Save into user_messages
        db.add(UserMessage(conversation_id=conv_id, role="user", content=query))
        db.add(UserMessage(
            conversation_id=conv_id,
            role="assistant",
            content=ai_result["answer"],
            safety_alert=ai_result.get("safety_alert", False),
            emergency=ai_result.get("emergency", False),
            warnings_json=json.dumps(ai_result.get("warnings", [])),
            sources_json="[]",
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    else:
        # Guest Dedicated Table
        gc = None
        if conv_id:
            gc = db.query(GuestConversation).filter(GuestConversation.id == conv_id).first()

        if not gc:
            title = query[:40] + ("..." if len(query) > 40 else "")
            new_conv = GuestConversation(title=title)
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conv_id = new_conv.id
        else:
            gc.updated_at = datetime.utcnow()
            db.commit()

        # Save into guest_messages
        db.add(GuestMessage(conversation_id=conv_id, role="user", content=query))
        db.add(GuestMessage(
            conversation_id=conv_id,
            role="assistant",
            content=ai_result["answer"],
            safety_alert=ai_result.get("safety_alert", False),
            emergency=ai_result.get("emergency", False),
            warnings_json=json.dumps(ai_result.get("warnings", [])),
            sources_json="[]",
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    return {
        "conversation_id": conv_id,
        "answer": ai_result["answer"],
        "safety_alert": ai_result.get("safety_alert", False),
        "emergency": ai_result.get("emergency", False),
        "warnings": ai_result.get("warnings", []),
        "sources": [],
        "disclaimer": ai_result.get("disclaimer", "")
    }
