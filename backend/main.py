import os
import sys

# Ensure backend directory is in sys.path when invoked from root (Render / uvicorn backend.main:app)
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import json
import html
import io
from datetime import datetime
from typing import Optional, List, Any
from fastapi import FastAPI, Depends, HTTPException, status, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from database import (
    get_db, init_db,
    User, UserConversation, UserMessage,
    Pharmacist, PharmacistConversation, PharmacistMessage, PharmacistNote,
    GuestConversation, GuestMessage
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_optional,
    get_current_user_required
)
from rag_engine import rag_engine
from groq_service import generate_medical_response

load_dotenv()

app = FastAPI(
    title="DrugGuide Clinical Medical RAG API",
    description="FastAPI Backend with Completely Dedicated Tables for Patients, Pharmacists, and Guests",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

@app.on_event("startup")
def on_startup():
    init_db()
    print("DrugGuide API started on port 8001 with 1,987 verified medical chunks loaded!")

@app.get("/")
def root_health():
    return {
        "status": "online",
        "system": "DrugGuide Clinical Assistant RAG API",
        "version": "2.1.0"
    }

# ----------------- PYDANTIC SCHEMAS -----------------

class UserSignupReq(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class PharmacistSignupReq(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = ""
    license_number: Optional[str] = ""

class LoginReq(BaseModel):
    email: str
    password: str

class UserProfileUpdateReq(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    pregnancy_status: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    current_medications: Optional[str] = None

class PharmacistProfileUpdateReq(BaseModel):
    license_number: Optional[str] = None
    phone: Optional[str] = None

class ChatMessageReq(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class CreateConversationReq(BaseModel):
    title: Optional[str] = "New Consultation"
    category: Optional[str] = "General Inquiry"

class RenameConversationReq(BaseModel):
    title: str

class NoteReq(BaseModel):
    note: str

# ----------------- 1. AUTH ROUTES (PATIENT / USER) -----------------

@app.post("/auth/user/signup")
def user_signup(req: UserSignupReq, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user account with this email already exists.")

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

@app.post("/auth/user/login")
def user_login(req: LoginReq, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

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

# ----------------- 2. AUTH ROUTES (PHARMACIST) -----------------

@app.post("/auth/pharmacist/signup")
def pharmacist_signup(req: PharmacistSignupReq, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    existing = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A pharmacist account with this email already exists.")

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

@app.post("/auth/pharmacist/login")
def pharmacist_login(req: LoginReq, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    pharma = db.query(Pharmacist).filter(Pharmacist.email == clean_email).first()
    if not pharma or not verify_password(req.password, pharma.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

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

@app.get("/auth/me")
def get_auth_me(current_user: Any = Depends(get_current_user_required)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "phone": current_user.phone
    }

# ----------------- 3. PROFILE ROUTES -----------------

@app.get("/profile/me")
def get_my_profile(current_user: Any = Depends(get_current_user_required)):
    if getattr(current_user, "role", "user") == "pharmacist":
        return {
            "profile": {
                "id": current_user.id,
                "user_id": current_user.id,
                "full_name": current_user.full_name,
                "email": current_user.email,
                "role": "pharmacist",
                "license_number": current_user.license_number,
                "phone": current_user.phone
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

@app.put("/profile/user")
def update_user_profile(
    req: UserProfileUpdateReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
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

@app.put("/profile/pharmacist")
def update_pharmacist_profile(
    req: PharmacistProfileUpdateReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    if req.license_number is not None:
        current_user.license_number = req.license_number
    if req.phone is not None:
        current_user.phone = req.phone

    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Pharmacist profile updated."}

# ----------------- 4. CONVERSATION ROUTES (DEDICATED PER ROLE) -----------------

@app.get("/conversations")
def get_conversations(
    q: Optional[str] = None,
    bookmarked: Optional[bool] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
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
            first_m = db.query(PharmacistMessage).filter(PharmacistMessage.conversation_id == c.id, PharmacistMessage.role == "user").first()
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
    else:
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
            first_m = db.query(UserMessage).filter(UserMessage.conversation_id == c.id, UserMessage.role == "user").first()
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

@app.post("/conversations")
def create_conversation(
    req: CreateConversationReq,
    current_user: Any = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
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

def _lookup_conversation(conv_id: int, db: Session, current_user: Optional[Any] = None):
    """Finds conversation and returns (conv, model_name, message_model) accurately per role/caller."""
    if current_user:
        u_role = getattr(current_user, "role", None)
        if u_role == "pharmacist":
            pc = db.query(PharmacistConversation).filter(PharmacistConversation.id == conv_id).first()
            if pc:
                return pc, "pharmacist", PharmacistMessage
        elif u_role == "user":
            uc = db.query(UserConversation).filter(UserConversation.id == conv_id).first()
            if uc:
                return uc, "user", UserMessage

    # Heuristic if caller token not passed: check if pharmacist note exists or pharmacist conversation matches
    pc = db.query(PharmacistConversation).filter(PharmacistConversation.id == conv_id).first()
    if pc:
        # If user also exists with same ID, check if pharmacist notes exist
        has_pharma_notes = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == conv_id).first()
        if has_pharma_notes:
            return pc, "pharmacist", PharmacistMessage

    uc = db.query(UserConversation).filter(UserConversation.id == conv_id).first()
    if uc:
        return uc, "user", UserMessage
    if pc:
        return pc, "pharmacist", PharmacistMessage
    gc = db.query(GuestConversation).filter(GuestConversation.id == conv_id).first()
    if gc:
        return gc, "guest", GuestMessage
    return None, None, None

@app.get("/conversations/{conv_id}")
def get_conversation_messages(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, MsgModel = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

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

@app.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, _ = _lookup_conversation(conv_id, db, current_user)
    if conv:
        db.delete(conv)
        db.commit()
    return {"status": "deleted"}

@app.patch("/conversations/{conv_id}/rename")
def rename_conversation(conv_id: int, req: RenameConversationReq, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, _ = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    conv.title = req.title.strip()
    db.commit()
    return {"status": "renamed", "title": conv.title}

@app.post("/conversations/{conv_id}/bookmark")
def toggle_bookmark(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, _ = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if hasattr(conv, "is_bookmarked"):
        conv.is_bookmarked = not conv.is_bookmarked
        db.commit()
        return {"status": "success", "is_bookmarked": conv.is_bookmarked}
    return {"status": "ignored"}

@app.get("/conversations/{conv_id}/notes")
def get_notes(conv_id: int, db: Session = Depends(get_db)):
    notes = db.query(PharmacistNote).filter(PharmacistNote.conversation_id == conv_id).order_by(PharmacistNote.created_at.desc()).all()
    return [
        {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat()}
        for n in notes
    ]

@app.post("/conversations/{conv_id}/notes")
def add_note(
    conv_id: int,
    req: NoteReq,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
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
        raise HTTPException(status_code=400, detail="Valid pharmacist required to add clinical notes.")

    n = PharmacistNote(
        conversation_id=conv_id,
        pharmacist_id=pharma_id,
        note=req.note.strip()
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat()}

@app.get("/conversations/{conv_id}/details")
def get_conv_details(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, MsgModel = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

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

@app.get("/conversations/{conv_id}/export/csv")
def export_csv(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, MsgModel = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    msgs = db.query(MsgModel).filter(MsgModel.conversation_id == conv_id).order_by(MsgModel.id.asc()).all()
    csv_rows = ["Role,Timestamp,Content"]
    for m in msgs:
        clean_content = m.content.replace('"', '""').replace("\n", " ")
        csv_rows.append(f'"{m.role}","{m.created_at}","{clean_content}"')
    csv_data = "\n".join(csv_rows)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pharmacist_report_conv_{conv_id}.csv"}
    )

def build_conversation_pdf(conv_id: int, conv: Any, role: str, msgs: list, notes: list, pharmacist_info: Optional[dict] = None) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f766e')
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )
    user_bubble_style = ParagraphStyle(
        'UserBubble',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#0f172a')
    )
    assistant_bubble_style = ParagraphStyle(
        'AssistantBubble',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1e293b')
    )
    note_style = ParagraphStyle(
        'NoteText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#78350f')
    )

    story = []

    # Title & Header
    story.append(Paragraph("Clinical Consultation Audit Report", title_style))
    story.append(Spacer(1, 4))

    created_str = conv.created_at.strftime('%B %d, %Y - %H:%M:%S') if hasattr(conv, 'created_at') and conv.created_at else ""
    meta_text = f"<b>Case ID:</b> #{conv_id} &nbsp;|&nbsp; <b>Date:</b> {created_str} &nbsp;|&nbsp; <b>Category:</b> {html.escape(getattr(conv, 'category', 'Clinical Consultation') or 'Clinical Consultation')}"
    if pharmacist_info:
        p_name = html.escape(pharmacist_info.get('full_name', '') or 'Practitioner')
        p_lic = html.escape(pharmacist_info.get('license_number', '') or 'Licensed')
        p_org = html.escape(pharmacist_info.get('pharmacy_organization', '') or 'Clinical Pharmacy Division')
        meta_text += f"<br/><b>Pharmacist:</b> {p_name} &nbsp;|&nbsp; <b>License:</b> {p_lic} &nbsp;|&nbsp; <b>Organization:</b> {p_org}"

    story.append(Paragraph(meta_text, meta_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0d9488'), spaceBefore=8, spaceAfter=12))

    # Topic Banner
    topic_title = html.escape(conv.title or 'Consultation')
    topic_data = [[
        Paragraph(f"<b>Case Inquiry Topic:</b> {topic_title}", user_bubble_style)
    ]]
    topic_table = Table(topic_data, colWidths=[540])
    topic_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdfa')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#99f6e4')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(topic_table)
    story.append(Spacer(1, 10))

    # Pharmacist Notes (if any)
    if notes:
        story.append(Paragraph(f"Private Practitioner Notes ({len(notes)})", section_title_style))
        for n in notes:
            n_date = n.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(n, 'created_at') and n.created_at else ""
            escaped_note = html.escape(n.note or '').replace('\n', '<br/>')
            note_content = [
                Paragraph(f"<b>[Note Added: {n_date}]</b><br/>{escaped_note}", note_style)
            ]
            note_table = Table([[note_content]], colWidths=[540])
            note_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fffbeb')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fde68a')),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ]))
            story.append(note_table)
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 6))

    # Transcript
    story.append(Paragraph("Clinical Consultation Transcript", section_title_style))

    for m in msgs:
        role_label = "Pharmacist Inquiry" if m.role == "user" else "DrugGuide Clinical Evidence Synthesis"
        role_color = '#0d9488' if m.role == "user" else '#0284c7'
        bg_color = '#f8fafc' if m.role == "user" else '#f1f5f9'
        border_color = '#cbd5e1'

        m_time = m.created_at.strftime('%H:%M:%S') if hasattr(m, 'created_at') and m.created_at else ""
        header_para = Paragraph(f"<b><font color='{role_color}'>{role_label}</font></b> &nbsp;&nbsp;<font size=8 color='#94a3b8'>[{m_time}]</font>", meta_style)

        body_text = html.escape(m.content or '').replace('\n', '<br/>')
        body_para = Paragraph(body_text, user_bubble_style if m.role == "user" else assistant_bubble_style)

        card_content = [header_para, Spacer(1, 4), body_para]

        msg_table = Table([[card_content]], colWidths=[540])
        msg_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(msg_table)
        story.append(Spacer(1, 8))

    # Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceBefore=6, spaceAfter=8))
    footer_text = "<b>Confidential Medical Record.</b> DrugGuide AI Assistant &bull; Authorized clinical documentation."
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=meta_style, alignment=1, fontSize=8, textColor=colors.HexColor('#94a3b8'))))

    doc.build(story)
    return buffer.getvalue()

@app.get("/conversations/{conv_id}/export/pdf")
def export_pdf(conv_id: int, current_user: Optional[Any] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    conv, role, MsgModel = _lookup_conversation(conv_id, db, current_user)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

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

# ----------------- 5. CHAT / RAG ROUTE (STRICTLY DISPATCHES TO DEDICATED TABLES) -----------------

@app.post("/api/chat")
def chat_api(
    req: ChatMessageReq,
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = req.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

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
                "gender": current_user.gender
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
        if not conv_id:
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
            pc = db.query(PharmacistConversation).filter(PharmacistConversation.id == conv_id).first()
            if pc:
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
            sources_json=json.dumps(ai_result.get("sources", [])),
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    elif role_mode == "user":
        # Patient / User Dedicated Table
        if not conv_id:
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
            uc = db.query(UserConversation).filter(UserConversation.id == conv_id).first()
            if uc:
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
            sources_json=json.dumps(ai_result.get("sources", [])),
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    else:
        # Guest Dedicated Table
        if not conv_id:
            title = query[:40] + ("..." if len(query) > 40 else "")
            new_conv = GuestConversation(title=title)
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conv_id = new_conv.id
        else:
            gc = db.query(GuestConversation).filter(GuestConversation.id == conv_id).first()
            if gc:
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
            sources_json=json.dumps(ai_result.get("sources", [])),
            disclaimer=ai_result.get("disclaimer", "")
        ))
        db.commit()

    return {
        "conversation_id": conv_id,
        "answer": ai_result["answer"],
        "safety_alert": ai_result.get("safety_alert", False),
        "emergency": ai_result.get("emergency", False),
        "warnings": ai_result.get("warnings", []),
        "sources": ai_result.get("sources", []),
        "disclaimer": ai_result.get("disclaimer", "")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
