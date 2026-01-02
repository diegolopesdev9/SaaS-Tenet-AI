"""
Rotas de Webhook para integração com WhatsApp via Evolution API.
Inclui suporte a memória de conversas e qualificação de leads.
"""
import logging
from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
import os

from app.utils.rate_limit import limiter
from app.utils.input_sanitizer import sanitize_for_ai, input_sanitizer
from app.services.whatsapp_service import WhatsAppService
from app.services.ai_service import AIService
from app.services.tenet_service import TenetService
from app.services.conversation_service import ConversationService
from app.services.crm_service import CRMService
from app.services.notification_service import NotificationService
from app.services.tenet_service import AgencyService
from app.services.admin_whatsapp_service import admin_whatsapp_service
from app.services.token_tracking_service import TokenTrackingService
from app.database import get_supabase_client
from app.config import settings

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks")


def extract_phone_number(remote_jid: str) -> str:
    """
    Extrai o número de telefone do remoteJid.

    Args:
        remote_jid: ID no formato '5515998332211@s.whatsapp.net'

    Returns:
        Número limpo: '5515998332211'
    """
    return remote_jid.split('@')[0] if '@' in remote_jid else remote_jid


def extract_message_text(data: dict) -> Optional[str]:
    """
    Extrai o texto da mensagem do payload do webhook.

    Args:
        data: Dados do webhook

    Returns:
        Texto da mensagem ou None
    """
    message = data.get("message", {})

    # Mensagem de texto simples
    if "conversation" in message:
        return message["conversation"]

    # Mensagem de texto estendida
    if "extendedTextMessage" in message:
        return message["extendedTextMessage"].get("text")

    # Outros tipos de mensagem (ignorar por enquanto)
    return None


@router.get("/meta")
async def verify_meta_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """
    Endpoint de verificação do webhook da Meta.
    A Meta envia uma requisição GET para verificar o webhook.
    """
    # Token de verificação (configure no .env ou use um padrão para teste)
    VERIFY_TOKEN = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "tenet_ai_verify_token")

    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("Webhook Meta verificado com sucesso")
        return int(hub_challenge)

    logger.warning(f"Falha na verificação do webhook Meta: mode={hub_mode}")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
@limiter.limit("100/minute")
async def receive_meta_webhook(request: Request):
    """
    Recebe mensagens do WhatsApp via Meta Cloud API.
    """
    try:
        payload = await request.json()

        # Verifica se é uma notificação de mensagem
        if payload.get("object") != "whatsapp_business_account":
            return {"status": "ignored", "reason": "not whatsapp"}

        # Importa o parser
        from app.services.meta_whatsapp_service import MetaWhatsAppService

        # Extrai dados da mensagem
        message_data = MetaWhatsAppService.parse_webhook_message(payload)

        if not message_data:
            return {"status": "ok", "message": "no message to process"}

        # Log da mensagem recebida
        logger.info(f"Mensagem Meta recebida de {message_data.get('from', 'unknown')[:6]}***")

        # TODO: Processar mensagem similar ao webhook Evolution
        # Por enquanto, apenas confirma recebimento

        return {
            "status": "received",
            "message_id": message_data.get("message_id")
        }

    except Exception as e:
        logger.error(f"Erro no webhook Meta: {e}")
        return {"status": "error", "detail": str(e)}


@router.post("/whatsapp")
@limiter.limit("100/minute")
async def receive_whatsapp_webhook(request: Request):
    """
    Endpoint para receber webhooks do WhatsApp via Evolution API.

    Fluxo:
    1. Recebe mensagem do WhatsApp
    2. Identifica a agência
    3. Carrega histórico da conversa (memória)
    4. Gera resposta com IA (considerando histórico e contexto)
    5. Qualifica o lead (extrai dados da resposta da IA)
    6. Envia resposta via WhatsApp
    7. Atualiza histórico da conversa e dados do lead
    """
    try:
        # Receber payload
        payload = await request.json()
        logger.info(f"Webhook WhatsApp recebido - instance: {payload.get('instance', 'unknown')}, event: {payload.get('event', 'unknown')}")

        # Verificar se é evento de mensagem
        event = payload.get("event")
        if event != "messages.upsert":
            logger.info(f"Evento ignorado: {event}")
            return {"status": "ignored", "reason": f"event type: {event}"}

        # Extrair dados da mensagem
        data = payload.get("data", {})
        key = data.get("key", {})

        # Ignorar mensagens enviadas pelo próprio bot
        if key.get("fromMe", False):
            logger.info("Mensagem própria ignorada")
            return {"status": "ignored", "reason": "own message"}

        # Extrair informações
        remote_jid = key.get("remoteJid", "")
        sender_phone = extract_phone_number(remote_jid)
        sender_name = data.get("pushName", "Cliente")
        message_text = extract_message_text(data)
        instance_name = payload.get("instance", "agencia-teste")

        # Verificar se há texto na mensagem
        if not message_text:
            logger.info("Mensagem sem texto ignorada")
            return {"status": "ignored", "reason": "no text content"}

        logger.info(f"Mensagem recebida de {sender_phone[-4:]}*** via {instance_name}")

        # Inicializar cliente Supabase
        supabase = get_supabase_client()

        # Inicializar serviço de agências
        agency_service = AgencyService(supabase)

        # ============================================
        # IDENTIFICAÇÃO DINÂMICA DA AGÊNCIA
        # ============================================

        # Tentar identificar agência pelo instance_name (multi-agência)
        agency = await agency_service.get_agency_by_instance(instance_name)

        if agency:
            agency_id = agency.get("id")
            logger.info(f"Agência identificada por instance_name '{instance_name}': {agency.get('nome')} (ID: {agency_id})")
        else:
            # Fallback: usar DEFAULT_AGENCY_ID se instance não encontrada
            agency_id = os.getenv("DEFAULT_AGENCY_ID") or settings.DEFAULT_AGENCY_ID

            if not agency_id:
                logger.error(f"Agência não encontrada para instance '{instance_name}' e DEFAULT_AGENCY_ID não configurado")
                raise HTTPException(status_code=404, detail=f"Agência não encontrada para instance: {instance_name}")

            logger.warning(f"Instance '{instance_name}' não encontrada, usando fallback DEFAULT_AGENCY_ID: {agency_id}")
            agency = await agency_service.get_agency_by_id(agency_id)

            if not agency:
                logger.error(f"Agência fallback não encontrada: {agency_id}")
                raise HTTPException(status_code=404, detail="Agência não encontrada")

        logger.info(f"Agência ativa: {agency.get('nome')} (ID: {agency_id})")

        # Descriptografar tokens da agência
        decrypted_keys = await agency_service.decrypt_agency_keys(agency_id)

        if not decrypted_keys:
            logger.error("Falha ao descriptografar tokens da agência")
            raise HTTPException(status_code=500, detail="Erro nos tokens da agência")

        logger.info("Tokens descriptografados")

        # ============================================
        # MEMÓRIA DE CONVERSAS
        # ============================================

        # Inicializar serviço de conversas
        conversation_service = ConversationService(supabase)

        # Buscar histórico da conversa
        conversation_data = await conversation_service.get_conversation_history(
            tenet_id=agency_id,
            lead_phone=sender_phone,
            limit_messages=10
        )

        # Formatar histórico para o prompt
        history_formatted = conversation_service.format_history_for_prompt(
            conversation_data.get("history", [])
        )

        # Obter dados já conhecidos do lead
        known_lead_data = conversation_data.get("lead_data", {})

        if conversation_data.get("exists"):
            logger.info(f"Histórico carregado: {conversation_data.get('total_messages', 0)} mensagens")
        else:
            logger.info("Nova conversa iniciada")

        # Inicializar serviços
        ai_service = AIService()

        # ============================================
        # VERIFICAÇÃO DE TOKENS
        # ============================================

        # Verificar se tem tokens disponíveis
        tracking_service = TokenTrackingService(supabase)
        can_use = await tracking_service.check_can_use(agency_id)
        
        if not can_use.get("allowed", True):
            logger.warning(f"Tenet {agency_id} sem tokens disponíveis")
            # Enviar mensagem informando que acabou o limite
            limit_message = "Olá! No momento estamos com nossa capacidade de atendimento no limite. Por favor, tente novamente mais tarde ou entre em contato por outro canal. Obrigado pela compreensão! 🙏"
            await whatsapp_service.send_text_message(
                phone_number=sender_phone,
                message=limit_message,
                instance_name=instance_name
            )
            return {"status": "limit_reached"}

        # ============================================
        # GERAÇÃO DE RESPOSTA COM IA
        # ============================================

        # Montar configurações do agente
        agent_config = {
            "tenet_id": agency_id,
            "agent_name": agency.get("agent_name", "Assistente"),
            "personality": agency.get("personality", "profissional e amigável"),
            "welcome_message": agency.get("welcome_message"),
            "qualification_questions": agency.get("qualification_questions", []),
            "qualification_criteria": agency.get("qualification_criteria"),
            "closing_message": agency.get("closing_message")
        }

        # ============================================
        # SANITIZAÇÃO ANTI-PROMPT INJECTION
        # ============================================
        
        # Detectar tentativa de injection
        is_suspicious, pattern = input_sanitizer.detect_injection(message_text)
        
        if is_suspicious:
            logger.warning(f"Possível prompt injection de {sender_phone[:6]}***: {pattern}")
            # Opcional: registrar em tabela de segurança para análise
        
        # Sanitizar mensagem para uso seguro com IA
        sanitized_message, _ = sanitize_for_ai(message_text)

        # Gerar resposta com histórico, contexto e configurações personalizadas
        ai_result = await ai_service.generate_response(
            message=sanitized_message,
            agency_name=agency.get("nome", "Agência"),
            agency_prompt=agency.get("prompt_config"),
            conversation_history=history_formatted,
            lead_data=known_lead_data,
            agent_config=agent_config
        )

        ai_response = ai_result.get("response", "")
        extracted_data = ai_result.get("extracted_data", {})

        logger.info(f"Resposta IA gerada: {ai_response[:100]}...")

        if extracted_data:
            logger.info(f"Dados extraídos: {extracted_data}")


        # ============================================
        # ENVIO DA RESPOSTA
        # ============================================

        # Inicializar serviço de WhatsApp
        whatsapp_service = WhatsAppService(
            evolution_api_url=settings.EVOLUTION_API_URL,
            evolution_api_key=settings.EVOLUTION_API_KEY
        )

        # Enviar resposta
        send_success = await whatsapp_service.send_text_message(
            phone_number=sender_phone,
            message=ai_response,
            instance_name=instance_name
        )

        if not send_success:
            logger.error("Falha ao enviar resposta via WhatsApp")
            raise HTTPException(status_code=500, detail="Falha ao enviar resposta")

        logger.info("Mensagem processada e enviada com sucesso")

        # ============================================
        # ATUALIZAÇÃO DO HISTÓRICO
        # ============================================
        await conversation_service.update_conversation_history(
            tenet_id=agency_id,
            lead_phone=sender_phone,
            user_message=message_text,
            assistant_message=ai_result.get("response", ""),
            lead_data=ai_result.get("extracted_data", {})
        )

        # ============================================
        # ENVIO PARA CRMs (se lead qualificado)
        # ============================================

        # Verificar se temos dados suficientes para enviar ao CRM
        lead_has_minimum_data = known_lead_data.get("nome") or extracted_data.get("nome")

        if lead_has_minimum_data:
            try:
                # Preparar dados do lead para CRM
                crm_lead_data = {
                    "phone": sender_phone,
                    "nome": extracted_data.get("nome") or known_lead_data.get("nome"),
                    "email": extracted_data.get("email") or known_lead_data.get("email"),
                    "empresa": extracted_data.get("empresa") or known_lead_data.get("empresa"),
                    "cargo": extracted_data.get("cargo") or known_lead_data.get("cargo"),
                    "interesse": extracted_data.get("desafio") or known_lead_data.get("desafio"),
                    "orcamento": extracted_data.get("orcamento") or known_lead_data.get("orcamento")
                }

                # Inicializar serviço de CRM
                crm_service = CRMService(supabase)

                # Enviar para CRMs ativos
                crm_result = await crm_service.send_lead_to_crms(
                    tenet_id=agency_id,
                    conversa_id=conversation_data.get("conversa_id"),
                    lead_data=crm_lead_data
                )

                if crm_result.get("sent", 0) > 0:
                    logger.info(f"Lead enviado para {crm_result.get('sent')} CRM(s)")

            except Exception as crm_error:
                logger.error(f"Erro ao enviar para CRMs: {crm_error}")
                # Não interrompe o fluxo principal

            # Enviar para Google Sheets
            try:
                sheets_service = GoogleSheetsService()
                sheets_data = {
                    "nome": extracted_data.get("nome", ""),
                    "telefone": sender_phone,
                    "email": extracted_data.get("email", ""),
                    "empresa": extracted_data.get("empresa", ""),
                    "status": "Qualificado" if extracted_data.get("qualificado") else "Novo",
                    "score": str(extracted_data.get("score", "")),
                    "origem": "WhatsApp",
                    "observacoes": extracted_data.get("interesse", "")
                }
                await sheets_service.add_lead(agency_id, sheets_data)
            except Exception as sheets_error:
                logger.warning(f"Erro ao enviar para Sheets: {sheets_error}")

        # ============================================
        # NOTIFICAÇÕES POR EMAIL
        # ============================================

        # Verificar se lead foi qualificado para enviar notificação
        current_status = conversation_data.get("lead_status", "em_andamento")

        if current_status == "qualificado" or (extracted_data.get("nome") and known_lead_data.get("nome") is None):
            try:
                # Preparar dados do lead para notificação
                notification_lead_data = {
                    "phone": sender_phone,
                    "nome": extracted_data.get("nome") or known_lead_data.get("nome"),
                    "email": extracted_data.get("email") or known_lead_data.get("email"),
                    "empresa": extracted_data.get("empresa") or known_lead_data.get("empresa"),
                    "cargo": extracted_data.get("cargo") or known_lead_data.get("cargo"),
                    "interesse": extracted_data.get("desafio") or known_lead_data.get("desafio")
                }

                # Inicializar serviço de notificações
                notification_service = NotificationService(supabase)

                # Enviar notificação
                await notification_service.send_lead_notification(
                    tenet_id=agency_id,
                    lead_data=notification_lead_data,
                    notification_type="qualificado"
                )

                logger.info("Notificação de lead qualificado enviada")

            except Exception as notif_error:
                logger.error(f"Erro ao enviar notificação: {notif_error}")
                # Não interrompe o fluxo principal

        # ============================================
        # RESPOSTA AO WHATSAPP
        # ============================================


        return {
            "status": "success",
            "message": "Mensagem processada",
            "lead_phone": sender_phone,
            "conversation_exists": conversation_data.get("exists"),
            "data_extracted": bool(extracted_data)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERRO no webhook WhatsApp: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rdstation")
@limiter.limit("60/minute")
async def rdstation_webhook(request: Request):
    """
    RD Station webhook endpoint.

    Args:
        request: Incoming webhook request

    Returns:
        Acknowledgment response
    """
    try:
        payload = await request.json()
        logger.info(f"Webhook RD Station recebido: {payload}")
        return {"status": 200, "message": "RD Station webhook received"}
    except Exception as e:
        logger.error(f"Erro ao processar webhook RD Station: {str(e)}")
        return {"status": 200, "message": "RD Station webhook received"}


@router.get("/whatsapp/health")
async def webhook_health():
    return {
        "status": "healthy",
        "service": "whatsapp-webhook",
        "memory_enabled": True,
        "qualification_enabled": True
    }