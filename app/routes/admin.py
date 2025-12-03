
"""
Rotas administrativas para gerenciamento de agências.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.database import get_supabase_client
from app.services.agency_service import AgencyService
from app.schemas.admin import AgencyConfigResponse, AgencyConfigUpdate, ApiResponse
from app.utils.security import EncryptionService

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


@router.post("/{agency_id}/config", response_model=ApiResponse)
async def update_agency_config(agency_id: str, config: AgencyConfigUpdate):
    """
    Atualiza configurações de uma agência.
    
    Args:
        agency_id: UUID da agência
        config: Dados de configuração a atualizar
        
    Returns:
        ApiResponse com resultado da operação
        
    Raises:
        HTTPException: 404 se agência não for encontrada
    """
    logger.info(f"Atualizando configurações da agência: {agency_id}")
    
    # Inicializar cliente Supabase e serviço
    supabase = get_supabase_client()
    agency_service = AgencyService(supabase)
    
    # Verificar se agência existe
    agency = await agency_service.get_agency_by_id(agency_id)
    
    if not agency:
        logger.warning(f"Agência não encontrada: {agency_id}")
        raise HTTPException(status_code=404, detail="Agência não encontrada")
    
    # Montar dict de atualização apenas com campos preenchidos
    update_data = {}
    
    if config.nome is not None:
        update_data["nome"] = config.nome
    
    if config.prompt_config is not None:
        update_data["prompt_config"] = config.prompt_config
    
    if config.whatsapp_phone_id is not None:
        update_data["whatsapp_phone_id"] = config.whatsapp_phone_id
    
    # Encriptar WhatsApp token se fornecido
    if config.whatsapp_token is not None:
        encryption_service = EncryptionService()
        encrypted_token = encryption_service.encrypt(config.whatsapp_token)
        update_data["whatsapp_token_encrypted"] = encrypted_token
        logger.info("WhatsApp token encriptado")
    
    # Encriptar Gemini API key se fornecida
    if config.gemini_api_key is not None:
        encryption_service = EncryptionService()
        encrypted_key = encryption_service.encrypt(config.gemini_api_key)
        update_data["gemini_api_key_encrypted"] = encrypted_key
        logger.info("Gemini API key encriptada")
    
    # Adicionar timestamp de atualização
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Executar update no Supabase
    try:
        result = supabase.table("agencias").update(update_data).eq("id", agency_id).execute()
        
        logger.info(f"Agência {agency_id} atualizada com sucesso")
        
        return ApiResponse(
            success=True,
            message="Configurações atualizadas com sucesso",
            data={"agency_id": agency_id, "updated_fields": list(update_data.keys())}
        )
        
    except Exception as e:
        logger.error(f"Erro ao atualizar agência: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar configurações: {str(e)}")


@router.get("/{agency_id}/conversas/{conversation_id}")
async def get_conversation(agency_id: str, conversation_id: str):
    """
    Busca uma conversa específica por ID.
    
    Args:
        agency_id: UUID da agência
        conversation_id: UUID da conversa
        
    Returns:
        Objeto completo da conversa incluindo histórico
        
    Raises:
        HTTPException: 404 se conversa não for encontrada
    """
    logger.info(f"Buscando conversa {conversation_id} da agência {agency_id}")
    
    # Inicializar cliente Supabase
    supabase = get_supabase_client()
    
    try:
        # Buscar conversa no Supabase
        response = supabase.table("conversas").select("*").eq(
            "id", conversation_id
        ).eq(
            "agencia_id", agency_id
        ).execute()
        
        # Verificar se encontrou a conversa
        if not response.data or len(response.data) == 0:
            logger.warning(f"Conversa não encontrada: {conversation_id}")
            raise HTTPException(status_code=404, detail="Conversa não encontrada")
        
        conversa = response.data[0]
        logger.info(f"Conversa encontrada: {conversa.get('lead_phone')}")
        
        return conversa
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar conversa: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar conversa: {str(e)}")


@router.patch("/{agency_id}/conversas/{conversation_id}/status")
async def update_conversation_status(
    agency_id: str,
    conversation_id: str,
    new_status: str
):
    """
    Atualiza o status de uma conversa.
    
    Args:
        agency_id: UUID da agência
        conversation_id: UUID da conversa
        new_status: Novo status do lead
        
    Returns:
        Objeto com sucesso e mensagem
        
    Raises:
        HTTPException: 400 se status inválido, 404 se conversa não encontrada
    """
    logger.info(f"Atualizando status da conversa {conversation_id} para: {new_status}")
    
    # Validar status
    valid_statuses = ["iniciada", "em_andamento", "qualificado", "perdido", "agendado"]
    if new_status not in valid_statuses:
        logger.warning(f"Status inválido: {new_status}")
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Use um dos seguintes: {', '.join(valid_statuses)}"
        )
    
    # Inicializar cliente Supabase
    supabase = get_supabase_client()
    
    try:
        # Executar update no Supabase
        response = supabase.table("conversas").update({
            "lead_status": new_status
        }).eq(
            "id", conversation_id
        ).eq(
            "agencia_id", agency_id
        ).execute()
        
        # Verificar se encontrou e atualizou o registro
        if not response.data or len(response.data) == 0:
            logger.warning(f"Conversa não encontrada: {conversation_id}")
            raise HTTPException(status_code=404, detail="Conversa não encontrada")
        
        logger.info(f"Status atualizado com sucesso para: {new_status}")
        
        return {
            "success": True,
            "message": f"Status atualizado para: {new_status}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar status da conversa: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar status: {str(e)}")


@router.get("/{agency_id}/metrics")
async def get_agency_metrics(agency_id: str):
    """
    Retorna métricas consolidadas de conversas da agência.
    
    Args:
        agency_id: UUID da agência
        
    Returns:
        Objeto com métricas: total de leads, mensagens, taxa de qualificação e contagem por status
    """
    logger.info(f"Calculando métricas da agência {agency_id}")
    
    # Inicializar cliente Supabase
    supabase = get_supabase_client()
    
    try:
        # Buscar todas as conversas da agência
        response = supabase.table("conversas").select(
            "lead_status, total_mensagens"
        ).eq(
            "agencia_id", agency_id
        ).execute()
        
        conversas = response.data or []
        
        # Calcular métricas
        total_leads = len(conversas)
        total_mensagens = sum(c.get("total_mensagens", 0) for c in conversas)
        
        # Contar status
        status_counts = {}
        for conversa in conversas:
            status = conversa.get("lead_status", "em_andamento")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Calcular taxa de qualificação
        qualificados = status_counts.get("qualificado", 0)
        agendados = status_counts.get("agendado", 0)
        taxa_qualificacao = 0.0
        
        if total_leads > 0:
            taxa_qualificacao = round(((qualificados + agendados) / total_leads) * 100, 1)
        
        logger.info(f"Métricas calculadas: {total_leads} leads, taxa {taxa_qualificacao}%")
        
        return {
            "total_leads": total_leads,
            "total_mensagens": total_mensagens,
            "taxa_qualificacao": taxa_qualificacao,
            "por_status": status_counts
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular métricas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao calcular métricas: {str(e)}")
