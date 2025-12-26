
"""Tenet data model."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class Tenet(BaseModel):
    """Tenet model representing the tenets table."""
    
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
    
    # Meta WhatsApp Cloud API
    meta_phone_number_id: Optional[str] = None
    meta_access_token_encrypted: Optional[str] = None
    meta_webhook_verify_token: Optional[str] = None
    meta_business_account_id: Optional[str] = None
    
    class Config:
        from_attributes = True


# Alias para compatibilidade
Agency = Tenet
