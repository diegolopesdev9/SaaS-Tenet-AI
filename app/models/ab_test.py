
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

class ABTestStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"

class ABTestCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    variante_a_prompt: str
    variante_b_prompt: str
    variante_a_nome: str = "Variante A"
    variante_b_nome: str = "Variante B"
    percentual_b: int = Field(default=50, ge=0, le=100)

class ABTestUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    variante_a_prompt: Optional[str] = None
    variante_b_prompt: Optional[str] = None
    percentual_b: Optional[int] = Field(default=None, ge=0, le=100)
    status: Optional[ABTestStatus] = None

class ABTestResponse(BaseModel):
    id: UUID
    agencia_id: UUID
    nome: str
    descricao: Optional[str]
    variante_a_nome: str
    variante_b_nome: str
    percentual_b: int
    status: ABTestStatus
    vencedor: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ABTestMetrics(BaseModel):
    test_id: UUID
    nome: str
    conversas_a: int = 0
    conversas_b: int = 0
    conversoes_a: int = 0
    conversoes_b: int = 0
    taxa_conversao_a: float = 0.0
    taxa_conversao_b: float = 0.0
    media_msgs_a: float = 0.0
    media_msgs_b: float = 0.0
    vencedor_sugerido: Optional[str] = None

class ABTestResultCreate(BaseModel):
    ab_test_id: UUID
    conversa_id: UUID
    variante: str
    convertido: bool = False
    mensagens_trocadas: int = 0
    tempo_conversa_segundos: int = 0
    dados_extraidos: Dict[str, Any] = Field(default_factory=dict)
