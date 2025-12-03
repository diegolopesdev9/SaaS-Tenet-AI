
"""
Rotas administrativas para gerenciamento de agências.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.database import get_supabase_client
from app.services.agency_service import AgencyService
from app.schemas.admin import AgencyConfigResponse

# Configurar logging
logger = logging.getLogger(__name__)

# Criar router
router = APIRouter(prefix="/api/agencias", tags=["Admin"])


@router.get("/{agency_id}/config", response_model=AgencyConfigResponse)
async def get_agency_config(agency_id: str):
    """
    Busca configurações de uma agência específica.
    
    Args:
        agency_id: UUID da agência
        
    Returns:
        AgencyConfigResponse com dados da agência
        
    Raises:
        HTTPException: 404 se agência não for encontrada
    """
    logger.info(f"Buscando configurações da agência: {agency_id}")
    
    # Inicializar cliente Supabase e serviço
    supabase = get_supabase_client()
    agency_service = AgencyService(supabase)
    
    # Buscar agência
    agency = await agency_service.get_agency_by_id(agency_id)
    
    if not agency:
        logger.warning(f"Agência não encontrada: {agency_id}")
        raise HTTPException(status_code=404, detail="Agência não encontrada")
    
    # Verificar se tem tokens criptografados
    has_whatsapp_token = bool(agency.get("whatsapp_token_encrypted"))
    has_gemini_key = bool(agency.get("gemini_api_key_encrypted"))
    
    # Construir resposta
    response = AgencyConfigResponse(
        id=agency.get("id"),
        nome=agency.get("nome"),
        prompt_config=agency.get("prompt_config"),
        whatsapp_phone_id=agency.get("whatsapp_phone_id"),
        has_whatsapp_token=has_whatsapp_token,
        has_gemini_key=has_gemini_key
    )
    
    logger.info(f"Configurações retornadas para agência: {agency.get('nome')}")
    
    return response
