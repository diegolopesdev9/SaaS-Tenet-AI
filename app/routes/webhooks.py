
"""Webhook endpoints for external integrations."""
from fastapi import APIRouter, Request, HTTPException, status
import logging
from app.config import settings
from app.database import get_supabase_client
from app.services.agency_service import AgencyService
from app.services.ai_service import AIService
from app.services.whatsapp_service import WhatsAppService
import traceback

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks")


@router.post("/whatsapp")
async def receive_whatsapp_webhook(request: Request):
    """
    WhatsApp webhook endpoint para processar mensagens recebidas.
    
    Args:
        request: Incoming webhook request da Evolution API
        
    Returns:
        Acknowledgment response com status do processamento
    """
    try:
        # Extrair JSON do body
        payload = await request.json()
        logger.info(f"Webhook WhatsApp recebido: {payload}")
        
        # Extrair dados da Evolution API
        data = payload.get("data", {})
        remoteJid = data.get("key", {}).get("remoteJid", "")
        pushName = data.get("pushName", "Desconhecido")
        message_obj = data.get("message", {})
        
        # Extrair texto da mensagem (suporta conversation e extendedTextMessage)
        message_text = message_obj.get("conversation") or message_obj.get("extendedTextMessage", {}).get("text", "")
        
        # Validar se existe texto na mensagem
        if not message_text:
            logger.info("Mensagem sem texto ignorada")
            return {"status": 200, "message": "Mensagem sem texto ignorada"}
        
        logger.info(f"Mensagem de {pushName} ({remoteJid}): {message_text}")
        
        # Identificar agência
        agency = None
        agency_id = None
        
        # Usar DEFAULT_AGENCY_ID se configurado
        if settings.DEFAULT_AGENCY_ID:
            agency_id = settings.DEFAULT_AGENCY_ID
            logger.info(f"Usando DEFAULT_AGENCY_ID: {agency_id}")
        
        # Buscar agência no Supabase
        client = get_supabase_client()
        agency_service = AgencyService(client)
        
        if agency_id:
            agency = await agency_service.get_agency_by_id(agency_id)
        else:
            # Buscar primeira agência ativa
            result = client.table("agencias").select("*").eq("status", "active").limit(1).execute()
            if result.data and len(result.data) > 0:
                agency = result.data[0]
                agency_id = agency.get("id")
        
        # Validar se encontrou agência
        if not agency:
            logger.error("Nenhuma agência configurada encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma agência configurada"
            )
        
        logger.info(f"Agência identificada: {agency.get('nome')} (ID: {agency_id})")
        
        # Descriptografar tokens da agência
        decrypted_keys = await agency_service.decrypt_agency_keys(agency_id)
        logger.info("Tokens descriptografados")
        
        whatsapp_token = decrypted_keys.get('whatsapp_token')
        
        # Validar se token WhatsApp existe
        if not whatsapp_token:
            logger.error("Token WhatsApp não configurado para esta agência")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token WhatsApp não configurado"
            )
        
        # Gerar resposta usando IA
        ai_service = AIService()
        prompt_config = agency.get('prompt_config', '')
        
        ai_response = await ai_service.generate_response(
            message_text=message_text,
            context_prompt=prompt_config
        )
        
        logger.info(f"Resposta IA gerada: {ai_response}")
        
        # Enviar resposta via WhatsApp
        whatsapp_service = WhatsAppService(
            evolution_api_url=settings.EVOLUTION_API_URL,
            evolution_api_key=whatsapp_token
        )
        
        # Limpar remoteJid removendo sufixo se existir
        clean_phone = remoteJid.replace("@s.whatsapp.net", "")
        
        # Enviar mensagem
        send_success = await whatsapp_service.send_text_message(
            phone_number=clean_phone,
            message=ai_response
        )
        
        if send_success:
            logger.info("Mensagem processada e enviada com sucesso")
            return {"status": 200, "message": "Mensagem processada e enviada"}
        else:
            logger.error("Falha ao enviar resposta via WhatsApp")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao enviar resposta"
            )
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        # Capturar e logar erro completo com traceback
        error_traceback = traceback.format_exc()
        logger.error(f"ERRO no webhook WhatsApp: {str(e)}\n{error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )


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
