"""
Rotas administrativas para gerenciamento de agências.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase_client
from app.services.tenet_service import TenetService
from app.schemas.admin import TenetConfigResponse, TenetConfigUpdate, ApiResponse
from app.utils.security import EncryptionService
from app.routes.auth import get_current_user

# Configurar logging
logger = logging.getLogger(__name__)

# Criar router
router = APIRouter(prefix="/api/agencias", tags=["Admin"])


@router.get("/{tenet_id}/config", response_model=TenetConfigResponse)
async def get_tenet_config(tenet_id: str):
    """
    Busca configurações de um tenet específico.

    Args:
        tenet_id: UUID do tenet

    Returns:
        TenetConfigResponse com dados do tenet

    Raises:
        HTTPException: 404 se tenet não for encontrado
    """
    logger.info(f"Buscando configurações do tenet: {tenet_id}")

    # Inicializar cliente Supabase e serviço
    supabase = get_supabase_client()
    tenet_service = TenetService(supabase)

    # Buscar tenet
    tenet = await tenet_service.get_tenet_by_id(tenet_id)

    if not tenet:
        logger.warning(f"Tenet não encontrado: {tenet_id}")
        raise HTTPException(status_code=404, detail="Tenet não encontrada")

    # Verificar se tem tokens criptografados
    has_whatsapp_token = bool(agency.get("whatsapp_token_encrypted"))
    has_gemini_key = bool(agency.get("gemini_api_key_encrypted"))

    # Construir resposta
    response = AgencyConfigResponse(
        id=agency.get("id"),
        nome=agency.get("nome"),
        instance_name=agency.get("instance_name"),
        prompt_config=agency.get("prompt_config"),
        whatsapp_phone_id=agency.get("whatsapp_phone_id"),
        has_whatsapp_token=has_whatsapp_token,
        has_gemini_key=has_gemini_key,
        agent_name=agency.get("agent_name"),
        personality=agency.get("personality"),
        welcome_message=agency.get("welcome_message"),
        qualification_questions=agency.get("qualification_questions"),
        qualification_criteria=agency.get("qualification_criteria"),
        closing_message=agency.get("closing_message"),
        whatsapp_api_type=agency.get("whatsapp_api_type", "evolution"),
        meta_phone_number_id=agency.get("meta_phone_number_id"),
        meta_business_account_id=agency.get("meta_business_account_id"),
        has_meta_token=bool(agency.get("meta_access_token_encrypted")),
        nicho=agency.get("nicho", "sdr")
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

    if config.instance_name is not None:
        update_data["instance_name"] = config.instance_name

    if config.agent_name is not None:
        update_data["agent_name"] = config.agent_name

    if config.personality is not None:
        update_data["personality"] = config.personality

    if config.welcome_message is not None:
        update_data["welcome_message"] = config.welcome_message

    if config.qualification_questions is not None:
        update_data["qualification_questions"] = config.qualification_questions

    if config.qualification_criteria is not None:
        update_data["qualification_criteria"] = config.qualification_criteria

    if config.closing_message is not None:
        update_data["closing_message"] = config.closing_message

    if config.whatsapp_api_type is not None:
        update_data["whatsapp_api_type"] = config.whatsapp_api_type

    if config.meta_phone_number_id is not None:
        update_data["meta_phone_number_id"] = config.meta_phone_number_id

    if config.meta_business_account_id is not None:
        update_data["meta_business_account_id"] = config.meta_business_account_id

    # Encriptar Meta Access Token se fornecido
    if config.meta_access_token is not None:
        encryption_service = EncryptionService()
        encrypted_token = encryption_service.encrypt(config.meta_access_token)
        update_data["meta_access_token_encrypted"] = encrypted_token
        logger.info("Meta Access Token encriptado")

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


@router.get("/{agency_id}/conversas")
async def list_conversations(
    agency_id: str,
    status: str = None,
    limit: int = 50
):
    """
    Lista todas as conversas de uma agência.

    Args:
        agency_id: UUID da agência
        status: Filtrar por status (opcional)
        limit: Limite de resultados (padrão 50)

    Returns:
        Lista de conversas com total
    """
    logger.info(f"Listando conversas da agência {agency_id}")

    supabase = get_supabase_client()

    try:
        # Construir query
        query = supabase.table("conversas").select(
            "id, lead_phone, lead_status, lead_data, total_mensagens, last_message_at, created_at"
        ).eq("agencia_id", agency_id)

        # Filtrar por status se fornecido
        if status:
            query = query.eq("lead_status", status)

        # Ordenar e limitar
        response = query.order("last_message_at", desc=True).limit(limit).execute()

        conversas = response.data or []

        logger.info(f"Encontradas {len(conversas)} conversas")

        return conversas

    except Exception as e:
        logger.error(f"Erro ao listar conversas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar conversas: {str(e)}")


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


@router.get("/{agency_id}/metrics/advanced")
async def get_advanced_metrics(
    agency_id: str,
    period: str = "7d",
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna métricas avançadas para o dashboard.

    Periods: 7d, 15d, 30d, 90d
    """
    from datetime import datetime, timedelta, timezone

    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agency_id:
        raise HTTPException(status_code=403, detail="Acesso negado")

    # Calcular data inicial baseado no período
    days_map = {"7d": 7, "15d": 15, "30d": 30, "90d": 90}
    days = days_map.get(period, 7)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    supabase = get_supabase_client()

    try:
        # Buscar todas as conversas do período
        response = supabase.table("conversas").select(
            "id, lead_status, total_mensagens, created_at, last_message_at, lead_data"
        ).eq("agencia_id", agency_id).gte(
            "created_at", start_date.isoformat()
        ).execute()

        conversas = response.data or []

        # Agrupar leads por dia
        leads_by_day = {}
        status_counts = {"iniciada": 0, "em_andamento": 0, "qualificado": 0, "perdido": 0, "agendado": 0}
        total_response_time = 0
        response_count = 0

        for conv in conversas:
            # Contagem por status
            status = conv.get("lead_status", "em_andamento")
            if status in status_counts:
                status_counts[status] += 1

            # Agrupar por dia
            created = conv.get("created_at", "")[:10]  # YYYY-MM-DD
            if created:
                if created not in leads_by_day:
                    leads_by_day[created] = {"total": 0, "qualificado": 0}
                leads_by_day[created]["total"] += 1
                if status == "qualificado":
                    leads_by_day[created]["qualificado"] += 1

            # Calcular tempo médio (diferença entre created_at e last_message_at)
            if conv.get("created_at") and conv.get("last_message_at"):
                try:
                    created_dt = datetime.fromisoformat(conv["created_at"].replace("Z", "+00:00"))
                    last_dt = datetime.fromisoformat(conv["last_message_at"].replace("Z", "+00:00"))
                    diff_hours = (last_dt - created_dt).total_seconds() / 3600
                    if diff_hours > 0:
                        total_response_time += diff_hours
                        response_count += 1
                except:
                    pass

        # Formatar dados para gráfico (ordenados por data)
        chart_data = []
        for date in sorted(leads_by_day.keys()):
            chart_data.append({
                "date": date,
                "label": datetime.strptime(date, "%Y-%m-%d").strftime("%d/%m"),
                "total": leads_by_day[date]["total"],
                "qualificado": leads_by_day[date]["qualificado"]
            })

        # Calcular funil
        total_leads = len(conversas)
        if total_leads > 0:
            funnel_data = [
                {"stage": "Leads Recebidos", "count": total_leads, "percentage": 100},
                {"stage": "Em Andamento", "count": status_counts["em_andamento"], "percentage": round(status_counts["em_andamento"] / total_leads * 100)},
                {"stage": "Qualificados", "count": status_counts["qualificado"], "percentage": round(status_counts["qualificado"] / total_leads * 100)},
                {"stage": "Agendados", "count": status_counts["agendado"], "percentage": round(status_counts["agendado"] / total_leads * 100)},
            ]
        else:
            funnel_data = [
                {"stage": "Leads Recebidos", "count": 0, "percentage": 0},
                {"stage": "Em Andamento", "count": 0, "percentage": 0},
                {"stage": "Qualificados", "count": 0, "percentage": 0},
                {"stage": "Agendados", "count": 0, "percentage": 0},
            ]

        # Tempo médio em horas
        avg_response_time = round(total_response_time / max(response_count, 1), 1)

        return {
            "period": period,
            "total_leads": total_leads,
            "chart_data": chart_data,
            "funnel_data": funnel_data,
            "status_breakdown": status_counts,
            "avg_conversation_hours": avg_response_time,
            "conversion_rate": round(status_counts["qualificado"] / max(total_leads, 1) * 100, 1)
        }

    except Exception as e:
        logger.error(f"Erro ao calcular métricas avançadas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LISTAGEM DE CONVERSAS
# ============================================