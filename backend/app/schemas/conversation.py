"""
Pydantic Schemas for Conversation Management, Renaming, and Clinical Notes.
"""

from typing import Optional
from pydantic import BaseModel


class CreateConversationReq(BaseModel):
    """Schema to initialize a new consultation session."""
    title: Optional[str] = "New Consultation"
    category: Optional[str] = "General Inquiry"


class RenameConversationReq(BaseModel):
    """Schema to update consultation title."""
    title: str


class NoteReq(BaseModel):
    """Schema to attach clinical notes to a consultation."""
    note: str
