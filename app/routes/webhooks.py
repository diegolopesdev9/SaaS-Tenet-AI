
"""
Rotas de Webhook para integração com WhatsApp via Evolution API.
Inclui suporte a memória de conversas e qualificação de leads.
"""
import logging
from fastapi import APIRouter, Request, HTTPException
from typing import Optional
import os

from app.services.whatsapp_service import WhatsAppService
from app.services.ai_service import AIService
from app.services.agency_service import AgencyService
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


@router.post("/whatsapp")
async def receive_whatsapp_webhook(request: Request):
    """
    Endpoint para receber webhooks do WhatsApp via Evolution API.
    
    Fluxo:
    1. Recebe mensagem do WhatsApp
    2. Identifica a agência
    3. Gera resposta com IA
    4. Envia resposta via WhatsApp
    """
    try:
        # Receber payload
        payload = await request.json()
        logger.info(f"Webhook WhatsApp recebido: {payload}")
        
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
        
        logger.info(f"Mensagem de {sender_name} ({remote_jid}): {message_text}")
        
        # Inicializar cliente Supabase
        supabase = get_supabase_client()
        
        # Identificar agência
        agency_id = os.getenv("DEFAULT_AGENCY_ID") or settings.DEFAULT_AGENCY_ID
        
        if not agency_id:
            logger.error("DEFAULT_AGENCY_ID não configurado")
            raise HTTPException(status_code=500, detail="Agência não configurada")
        
        logger.info(f"Usando DEFAULT_AGENCY_ID: {agency_id}")
        
        # Buscar dados da agência
        agency_service = AgencyService(supabase)
        agency = await agency_service.get_agency_by_id(agency_id)
        
        if not agency:
            logger.error(f"Agência não encontrada: {agency_id}")
            raise HTTPException(status_code=404, detail="Agência não encontrada")
        
        logger.info(f"Agência identificada: {agency.get('nome')} (ID: {agency_id})")
        
        # Descriptografar tokens da agência
        decrypted_keys = await agency_service.decrypt_agency_keys(agency_id)
        
        if not decrypted_keys:
            logger.error("Falha ao descriptografar tokens da agência")
            raise HTTPException(status_code=500, detail="Erro nos tokens da agência")
        
        logger.info("Tokens descriptografados")
        
        # ============================================
        # GERAÇÃO DE RESPOSTA COM IA
        # ============================================
        
        # Inicializar serviço de IA
        ai_service = AIService()
        
        # Obter prompt personalizado da agência
        prompt_config = agency.get('prompt_config', '')
        
        # Gerar resposta
        ai_response = await ai_service.generate_response(
            message_text=message_text,
            context_prompt=prompt_config
        )
        
        logger.info(f"Resposta IA gerada: {ai_response[:100]}...")
        
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
        
        return {
            "status": "success",
            "message": "Mensagem processada",
            "lead_phone": sender_phone
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERRO no webhook WhatsApp: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rdstation")
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
    """
    Health check para o webhook.
    """
    return {
        "status": "healthy",
        "service": "whatsapp-webhook"
    }
