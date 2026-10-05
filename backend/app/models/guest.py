"""
SQLAlchemy Models for Guest Public Inquiries.
Dedicated tables: guest_conversations, guest_messages.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class GuestConversation(Base):
    """Dedicated Guest Public Sessions."""
    __tablename__ = "guest_conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), default="Guest Session")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("GuestMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="GuestMessage.id")


class GuestMessage(Base):
    """Dedicated Guest Public Chat Messages."""
    __tablename__ = "guest_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("guest_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    safety_alert = Column(Boolean, default=False)
    emergency = Column(Boolean, default=False)
    warnings_json = Column(Text, default="[]")
    sources_json = Column(Text, default="[]")
    disclaimer = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("GuestConversation", back_populates="messages")
