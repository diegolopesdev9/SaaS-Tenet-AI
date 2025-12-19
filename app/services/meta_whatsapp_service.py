
"""Serviço para integração com Meta Cloud API (WhatsApp Business)"""

import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class MetaWhatsAppService:
    """Cliente para Meta Cloud API do WhatsApp Business"""
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_text_message(self, to: str, message: str) -> Optional[Dict[str, Any]]:
        """Envia mensagem de texto via Meta API"""
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._format_phone(to),
            "type": "text",
            "text": {"body": message}
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                result = response.json()
                logger.info(f"Mensagem enviada via Meta API para {to[:6]}***")
                return result
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro Meta API HTTP: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem Meta API: {e}")
            return None
    
    async def send_template_message(self, to: str, template_name: str, 
                                     language: str = "pt_BR", 
                                     components: list = None) -> Optional[Dict[str, Any]]:
        """Envia mensagem de template (HSM) via Meta API"""
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": self._format_phone(to),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language}
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Erro ao enviar template Meta API: {e}")
            return None
    
    async def mark_as_read(self, message_id: str) -> bool:
        """Marca mensagem como lida"""
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                return response.status_code == 200
        except:
            return False
    
    def _format_phone(self, phone: str) -> str:
        """Remove caracteres especiais do telefone"""
        return ''.join(filter(str.isdigit, phone))
    
    @staticmethod
    def parse_webhook_message(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extrai dados da mensagem do payload do webhook Meta"""
        try:
            entry = payload.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            messages = value.get("messages", [])
            if not messages:
                return None
            
            msg = messages[0]
            contact = value.get("contacts", [{}])[0]
            
            return {
                "message_id": msg.get("id"),
                "from": msg.get("from"),
                "timestamp": msg.get("timestamp"),
                "type": msg.get("type"),
                "text": msg.get("text", {}).get("body", ""),
                "contact_name": contact.get("profile", {}).get("name", ""),
                "phone_number_id": value.get("metadata", {}).get("phone_number_id")
            }
        except Exception as e:
            logger.error(f"Erro ao parsear webhook Meta: {e}")
            return None
