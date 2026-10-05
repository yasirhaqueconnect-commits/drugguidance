"""
SQLAlchemy Models for Patient / User Module.
Dedicated tables: users, user_conversations, user_messages.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    """Registered Patient / User Accounts."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    full_name = Column(String(255), default="")
    phone = Column(String(50), default="")

    # Patient Health Profile
    age = Column(Integer, nullable=True)
    gender = Column(String(50), default="")
    height = Column(String(50), default="")
    weight = Column(String(50), default="")
    pregnancy_status = Column(String(100), default="")
    allergies = Column(Text, default="")
    medical_conditions = Column(Text, default="")
    current_medications = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("UserConversation", back_populates="user", cascade="all, delete-orphan")


class UserConversation(Base):
    """Dedicated Patient / User Chat Sessions."""
    __tablename__ = "user_conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="New Health Consultation")
    category = Column(String(100), default="General Inquiry")
    is_bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("UserMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="UserMessage.id")


class UserMessage(Base):
    """Dedicated Patient / User Chat Messages."""
    __tablename__ = "user_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("user_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    safety_alert = Column(Boolean, default=False)
    emergency = Column(Boolean, default=False)
    warnings_json = Column(Text, default="[]")
    sources_json = Column(Text, default="[]")
    disclaimer = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("UserConversation", back_populates="messages")
