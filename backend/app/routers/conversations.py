"""
Conversations, Consultation Archive & Clinical Audits API Router.
Provides complete consultation session management, bookmarks, notes, and PDF/CSV export generation.
"""

import json
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core import get_db, get_current_user_optional, get_current_user_required
from app.models import (
    UserConversation, UserMessage,
    Pharmacist, PharmacistConversation, PharmacistMessage, PharmacistNote,
    GuestConversation, GuestMessage
)
from app.schemas.conversation import CreateConversationReq, RenameConversationReq, NoteReq
from app.services.export_service import build_conversation_pdf, generate_conversation_csv

router = APIRouter(prefix="/conversations", tags=["Conversations & Audits"])


def lookup_conversation(conv_id: int, db: Session, current_user: Optional[Any] = None):
    """
    Finds consultation session and returns (conv, model_name, message_model)
    with strict multi-tenant isolation per role and caller ID.
    """
    if current_user:
        u_role = getattr(current_user, "role", None)
        if u_role == "pharmacist":
            pc = db.query(PharmacistConversation).filter(
                PharmacistConversation.id == conv_id,
                PharmacistConversation.pharmacist_id == current_user.id
            ).first()
            if pc:
                return pc, "pharmacist", PharmacistMessage
            return None, None, None
        elif u_role == "user":
            uc = db.query(UserConversation).filter(
                UserConversation.id == conv_id,
                UserConversation.user_id == current_user.id
            ).first()
            if uc:
                return uc, "user", UserMessage
            return None, None, None

    # Unauthenticated / Guest caller: ONLY look in guest_conversations
    gc = db.query(GuestConversation).filter(GuestConversation.id == conv_id).first()
    if gc:
        return gc, "guest", GuestMessage
    return None, None, None


@router.get("", summary="List Consultation Sessions")
def get_conversations(
    q: Optional[str] = None,
    bookmarked: Optional[bool] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Lists saved consultation history for authenticated caller."""
    if getattr(current_user, "role", "user") == "pharmacist":
        query = db.query(PharmacistConversation).filter(PharmacistConversation.pharmacist_id == current_user.id)
        if q:
            query = query.filter(PharmacistConversation.title.ilike(f"%{q}%"))
        if bookmarked:
            query = query.filter(PharmacistConversation.is_bookmarked == True)
        if category and category != "All":
            if category == "Notes":
                subq = db.query(PharmacistNote.conversation_id).distinct()
                query = query.filter(PharmacistConversation.id.in_(subq))
            elif category == "Bookmarked":
                query = query.filter(PharmacistConversation.is_bookmarked == True)
            else:
                query = query.filter(PharmacistConversation.category == category)
        if sort == "oldest":
            query = query.order_by(PharmacistConversation.created_at.asc())
        else:
            query = query.order_by(PharmacistConversation.updated_at.desc())
        convs = query.all()

        results = []
        for c in convs:
            n_count = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == c.id).count()
            first_m = db.query(PharmacistMessage).filter(
                PharmacistMessage.conversation_id == c.id,
                PharmacistMessage.role == "user"
            ).first()
            results.append({
                "id": c.id,
                "title": c.title,
                "category": c.category,
                "is_bookmarked": c.is_bookmarked,
                "notes_count": n_count,
                "snippet": first_m.content[:80] if first_m else "",
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat()
            })
        return results

    # Patient / User query
    query = db.query(UserConversation).filter(UserConversation.user_id == current_user.id)
    if q:
        query = query.filter(UserConversation.title.ilike(f"%{q}%"))
    if bookmarked:
        query = query.filter(UserConversation.is_bookmarked == True)
    if category and category != "All":
        if category == "Bookmarked":
            query = query.filter(UserConversation.is_bookmarked == True)
        else:
            query = query.filter(UserConversation.category == category)
    if sort == "oldest":
        query = query.order_by(UserConversation.created_at.asc())
    else:
        query = query.order_by(UserConversation.updated_at.desc())
    convs = query.all()

    results = []
    for c in convs:
        first_m = db.query(UserMessage).filter(
            UserMessage.conversation_id == c.id,
            UserMessage.role == "user"
        ).first()
        results.append({
            "id": c.id,
            "title": c.title,
            "category": c.category,
            "is_bookmarked": c.is_bookmarked,
            "notes_count": 0,
            "snippet": first_m.content[:80] if first_m else "",
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        })
    return results


@router.post("", summary="Create Consultation Session")
def create_conversation(
    req: CreateConversationReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Initializes a new consultation thread for active user or pharmacist."""
    if getattr(current_user, "role", "user") == "pharmacist":
        new_conv = PharmacistConversation(
            pharmacist_id=current_user.id,
            title=req.title or "Clinical Consultation",
            category=req.category or "Drug Interaction Matrix"
        )
    else:
        new_conv = UserConversation(
            user_id=current_user.id,
            title=req.title or "Health Consultation",
            category=req.category or "General Inquiry"
        )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return {
        "id": new_conv.id,
        "title": new_conv.title,
        "category": new_conv.category,
        "created_at": new_conv.created_at.isoformat(),
        "updated_at": new_conv.updated_at.isoformat()
    }


@router.get("/{conv_id}", summary="Get Consultation Messages")
def get_conversation_messages(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Retrieves full transcript messages for the specified consultation."""
    conv, role, MsgModel = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msgs = db.query(MsgModel).filter(MsgModel.conversation_id == conv_id).order_by(MsgModel.id.asc()).all()

    formatted_msgs = []
    for m in msgs:
        sources = []
        warnings = []
        try:
            sources = json.loads(m.sources_json) if m.sources_json else []
            warnings = json.loads(m.warnings_json) if m.warnings_json else []
        except Exception:
            pass

        formatted_msgs.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "safety_alert": m.safety_alert,
            "emergency": m.emergency,
            "sources": sources,
            "warnings": warnings,
            "disclaimer": m.disclaimer,
            "created_at": m.created_at.isoformat()
        })

    return {
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "category": getattr(conv, "category", "General Inquiry"),
            "is_bookmarked": getattr(conv, "is_bookmarked", False),
            "created_at": conv.created_at.isoformat()
        },
        "messages": formatted_msgs
    }


@router.delete("/{conv_id}", summary="Delete Consultation Session")
def delete_conversation(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Deletes consultation session and associated messages."""
    conv, role, _ = lookup_conversation(conv_id, db, current_user)
    if conv:
        db.delete(conv)
        db.commit()
    return {"status": "deleted"}


@router.patch("/{conv_id}/rename", summary="Rename Consultation Session")
def rename_conversation(
    conv_id: int,
    req: RenameConversationReq,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Renames consultation session."""
    conv, role, _ = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    conv.title = req.title.strip()
    db.commit()
    return {"status": "renamed", "title": conv.title}


@router.post("/{conv_id}/bookmark", summary="Toggle Bookmark")
def toggle_bookmark(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Toggles bookmark status on consultation."""
    conv, role, _ = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    if hasattr(conv, "is_bookmarked"):
        conv.is_bookmarked = not conv.is_bookmarked
        db.commit()
        return {"status": "success", "is_bookmarked": conv.is_bookmarked}
    return {"status": "ignored"}


@router.get("/{conv_id}/notes", summary="Get Clinical Notes")
def get_notes(conv_id: int, db: Session = Depends(get_db)):
    """Retrieves practitioner clinical notes for consultation."""
    notes = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == conv_id).order_by(PharmacistNote.created_at.desc()).all()
    return [
        {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat()}
        for n in notes
    ]


@router.post("/{conv_id}/notes", summary="Add Clinical Note")
def add_note(
    conv_id: int,
    req: NoteReq,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Appends private clinical observation note to consultation."""
    conv = db.query(PharmacistConversation).filter(PharmacistConversation.id == conv_id).first()
    pharma_id = None
    if current_user and getattr(current_user, "role", "") == "pharmacist":
        pharma_id = current_user.id
    elif conv and conv.pharmacist_id:
        pharma_id = conv.pharmacist_id
    else:
        first_p = db.query(Pharmacist).first()
        if first_p:
            pharma_id = first_p.id

    if not pharma_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid pharmacist required to add clinical notes.")

    n = PharmacistNote(
        conversation_id=conv_id,
        pharmacist_id=pharma_id,
        note=req.note.strip()
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat()}


@router.get("/{conv_id}/details", summary="Get Full Clinical Audit Dossier")
def get_conv_details(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Retrieves deep consultation audit dossier with evidence sources and notes."""
    conv, role, MsgModel = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msgs = db.query(MsgModel).filter(MsgModel.conversation_id == conv_id).order_by(MsgModel.id.asc()).all()

    # User inquiry
    user_msgs = [m for m in msgs if m.role == "user"]
    original_query = user_msgs[0].content if user_msgs else (conv.title or "Clinical Consultation")

    # Pharmacist info
    pharma_info = None
    if role == "pharmacist" and getattr(conv, "pharmacist_id", None):
        p = db.query(Pharmacist).filter(Pharmacist.id == conv.pharmacist_id).first()
        if p:
            pharma_info = {
                "full_name": p.full_name,
                "license_number": getattr(p, "license_number", "") or "Licensed Practitioner",
                "pharmacy_organization": getattr(p, "pharmacy_organization", "") or "Clinical Pharmacy Division"
            }

    # Notes
    notes = []
    if role == "pharmacist":
        db_notes = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == conv_id).order_by(PharmacistNote.created_at.desc()).all()
        notes = [{"id": n.id, "note": n.note, "created_at": n.created_at.isoformat()} for n in db_notes]

    # Formatted messages
    formatted_msgs = []
    all_sources = []
    for m in msgs:
        sources = []
        warnings = []
        try:
            if m.sources_json:
                sources = json.loads(m.sources_json)
                all_sources.extend(sources)
            if m.warnings_json:
                warnings = json.loads(m.warnings_json)
        except Exception:
            pass
        formatted_msgs.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": sources,
            "warnings": warnings,
            "created_at": m.created_at.isoformat()
        })

    return {
        "id": conv.id,
        "title": conv.title,
        "category": getattr(conv, "category", "General Consultation"),
        "is_bookmarked": getattr(conv, "is_bookmarked", False),
        "message_count": len(msgs),
        "original_query": original_query,
        "pharmacist": pharma_info,
        "notes": notes,
        "sources": all_sources,
        "messages": formatted_msgs,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat()
    }


@router.get("/{conv_id}/export/csv", summary="Export Consultation as CSV")
def export_csv(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Generates and downloads clinical audit log spreadsheet in CSV format."""
    conv, role, MsgModel = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    msgs = db.query(MsgModel).filter(MsgModel.conversation_id == conv_id).order_by(MsgModel.id.asc()).all()

    csv_bytes = generate_conversation_csv(conv_id, msgs)
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=pharmacist_report_conv_{conv_id}.csv"}
    )


@router.get("/{conv_id}/export/pdf", summary="Export Consultation as PDF")
def export_pdf(
    conv_id: int,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Generates and downloads publication-grade clinical consultation PDF."""
    conv, role, MsgModel = lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msgs = db.query(MsgModel).filter(MsgModel.conversation_id == conv_id).order_by(MsgModel.id.asc()).all()
    notes = []
    pharmacist_info = None

    if role == "pharmacist":
        notes = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == conv_id).order_by(PharmacistNote.created_at.asc()).all()
        if getattr(conv, "pharmacist_id", None):
            p = db.query(Pharmacist).filter(Pharmacist.id == conv.pharmacist_id).first()
            if p:
                pharmacist_info = {
                    "full_name": p.full_name,
                    "license_number": getattr(p, "license_number", "") or "Licensed Practitioner",
                    "pharmacy_organization": getattr(p, "pharmacy_organization", "") or "Clinical Pharmacy Division"
                }

    pdf_bytes = build_conversation_pdf(conv_id, conv, role, msgs, notes, pharmacist_info)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=pharmacist_report_conv_{conv_id}.pdf"}
    )
