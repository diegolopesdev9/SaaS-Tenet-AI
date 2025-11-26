
"""Agency data model."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class Agency(BaseModel):
    """Agency model representing the agencias table."""
    
    id: UUID
    nome: str
    email: str
    prompt_config: str
    modo_prospeccao: bool = False
    token_rdstation_encrypted: Optional[str] = None
    whatsapp_token_encrypted: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    rag_enabled: bool = False
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
