"""
SQLAlchemy Models for Pharmacist Clinical Module.
Dedicated tables: pharmacists, pharmacist_conversations, pharmacist_messages, pharmacist_notes.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Pharmacist(Base):
    """Registered Healthcare Professional Pharmacists."""
    __tablename__ = "pharmacists"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="pharmacist")
    full_name = Column(String(255), default="")
    phone = Column(String(50), default="")
    license_number = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("PharmacistConversation", back_populates="pharmacist", cascade="all, delete-orphan")
    notes = relationship("PharmacistNote", back_populates="pharmacist", cascade="all, delete-orphan")


class PharmacistConversation(Base):
    """Dedicated Pharmacist Clinical Chat Sessions."""
    __tablename__ = "pharmacist_conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pharmacist_id = Column(Integer, ForeignKey("pharmacists.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Clinical Consultation")
    category = Column(String(100), default="Drug Interaction Matrix")
    is_bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pharmacist = relationship("Pharmacist", back_populates="conversations")
    messages = relationship("PharmacistMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="PharmacistMessage.id")
    notes = relationship("PharmacistNote", back_populates="conversation", cascade="all, delete-orphan")


class PharmacistMessage(Base):
    """Dedicated Pharmacist Clinical Chat Messages."""
    __tablename__ = "pharmacist_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("pharmacist_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    safety_alert = Column(Boolean, default=False)
    emergency = Column(Boolean, default=False)
    warnings_json = Column(Text, default="[]")
    sources_json = Column(Text, default="[]")
    disclaimer = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("PharmacistConversation", back_populates="messages")


class PharmacistNote(Base):
    """Pharmacist Private Clinical Notes & Annotations."""
    __tablename__ = "pharmacist_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("pharmacist_conversations.id", ondelete="CASCADE"), nullable=False)
    pharmacist_id = Column(Integer, ForeignKey("pharmacists.id", ondelete="CASCADE"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("PharmacistConversation", back_populates="notes")
    pharmacist = relationship("Pharmacist", back_populates="notes")
