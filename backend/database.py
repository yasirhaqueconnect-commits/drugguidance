import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime,
    Boolean, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_LrNx2k0CHFzw@ep-polished-frost-b59s942x-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =====================================================================
# 1. USER (PATIENT) PORTAL DATA - COMPLETELY DEDICATED TABLES
# =====================================================================

class User(Base):
    """Registered Patient / User Accounts"""
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
    """Dedicated Patient / User Chat Sessions"""
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
    """Dedicated Patient / User Chat Messages"""
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


# =====================================================================
# 2. PHARMACIST PORTAL DATA - COMPLETELY DEDICATED TABLES
# =====================================================================

class Pharmacist(Base):
    """Registered Healthcare Professional Pharmacists"""
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
    """Dedicated Pharmacist Clinical Chat Sessions"""
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
    """Dedicated Pharmacist Clinical Chat Messages"""
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
    """Pharmacist Clinical Notes & Annotations"""
    __tablename__ = "pharmacist_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("pharmacist_conversations.id", ondelete="CASCADE"), nullable=False)
    pharmacist_id = Column(Integer, ForeignKey("pharmacists.id", ondelete="CASCADE"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("PharmacistConversation", back_populates="notes")
    pharmacist = relationship("Pharmacist", back_populates="notes")


# =====================================================================
# 3. GUEST PORTAL DATA - COMPLETELY DEDICATED TABLES
# =====================================================================

class GuestConversation(Base):
    """Dedicated Guest Public Sessions"""
    __tablename__ = "guest_conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), default="Guest Session")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("GuestMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="GuestMessage.id")

class GuestMessage(Base):
    """Dedicated Guest Public Chat Messages"""
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


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
