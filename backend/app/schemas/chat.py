"""
Pydantic Schemas for Clinical Assistant Chat & RAG Inquiries.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ChatMessageReq(BaseModel):
    """Incoming user inquiry for clinical RAG analysis."""
    message: str
    conversation_id: Optional[int] = None
    role: Optional[str] = None


class ChatResponse(BaseModel):
    """Clinical assistant response payload with safety metadata."""
    conversation_id: int
    answer: str
    safety_alert: bool = False
    emergency: bool = False
    warnings: List[str] = []
    sources: List[Dict[str, Any]] = []
    disclaimer: str = ""
