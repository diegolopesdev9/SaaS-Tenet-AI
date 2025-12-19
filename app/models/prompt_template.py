
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

class NichoType(str, Enum):
    SDR = "sdr"
    SUPORTE = "suporte"
    RH = "rh"
    VENDAS = "vendas"
    CUSTOM = "custom"

class PromptTemplateBase(BaseModel):
    nome: str
    nicho: NichoType
    descricao: Optional[str] = None
    prompt_sistema: str
    prompt_inicial: Optional[str] = None
    variaveis: List[str] = Field(default_factory=list)
    exemplo_conversa: List[Dict[str, str]] = Field(default_factory=list)

class PromptTemplateCreate(PromptTemplateBase):
    pass

class PromptTemplateUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    prompt_sistema: Optional[str] = None
    prompt_inicial: Optional[str] = None
    variaveis: Optional[List[str]] = None

class PromptTemplateResponse(PromptTemplateBase):
    id: UUID
    ativo: bool
    is_default: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PromptCompiled(BaseModel):
    """Prompt compilado com variáveis substituídas"""
    prompt_sistema: str
    prompt_inicial: Optional[str] = None
    nicho: str
    template_id: UUID
