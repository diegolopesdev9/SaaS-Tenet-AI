
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class MensagemBase(BaseModel):
    role: MessageRole
    content: str
    tokens_used: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class MensagemCreate(MensagemBase):
    conversa_id: UUID

class MensagemResponse(MensagemBase):
    id: UUID
    conversa_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class MensagemList(BaseModel):
    mensagens: list[MensagemResponse]
    total: int
