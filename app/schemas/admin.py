
"""
Schemas Pydantic para endpoints administrativos.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AgencyConfigResponse(BaseModel):
    """Schema de resposta para configuração de agência."""
    
    id: str
    nome: str
    instance_name: Optional[str] = None
    prompt_config: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    has_whatsapp_token: bool = False
    has_gemini_key: bool = False


class AgencyConfigUpdate(BaseModel):
    """Schema para atualização de configuração de agência."""
    
    nome: Optional[str] = Field(None, max_length=100)
    instance_name: Optional[str] = Field(None, max_length=100)
    prompt_config: Optional[str] = Field(None, max_length=5000)
    whatsapp_phone_id: Optional[str] = None
    whatsapp_token: Optional[str] = None
    gemini_api_key: Optional[str] = None


class ConversationSummary(BaseModel):
    """Schema de sumário de conversa."""
    
    id: str
    lead_phone: str
    lead_status: str
    lead_data: Dict[str, Any]
    total_mensagens: int
    last_message_at: Optional[str] = None


class ApiResponse(BaseModel):
    """Schema de resposta padrão da API."""
    
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
