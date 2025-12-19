
"""Serviço de alertas para notificar problemas críticos"""

import httpx
from typing import Optional
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class AlertService:
    """Envia alertas para Slack, Email ou outros canais"""
    
    def __init__(self):
        self.slack_webhook = getattr(settings, 'SLACK_WEBHOOK_URL', None)
    
    async def send_slack_alert(self, message: str, severity: str = "warning") -> bool:
        """Envia alerta para Slack"""
        if not self.slack_webhook:
            logger.warning("Slack webhook não configurado")
            return False
        
        emoji = {
            "info": ":information_source:",
            "warning": ":warning:",
            "error": ":x:",
            "critical": ":rotating_light:"
        }.get(severity, ":bell:")
        
        payload = {
            "text": f"{emoji} *Tenet AI Alert*\n{message}",
            "username": "Tenet AI Monitor",
            "icon_emoji": ":robot_face:"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.slack_webhook, json=payload)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Erro ao enviar alerta Slack: {e}")
            return False
    
    async def alert_webhook_failure(self, webhook_type: str, error: str):
        """Alerta específico para falha em webhooks"""
        message = f"*Webhook {webhook_type} com problemas*\nErro: {error}"
        await self.send_slack_alert(message, severity="error")
    
    async def alert_high_error_rate(self, endpoint: str, error_count: int):
        """Alerta para taxa alta de erros"""
        message = f"*Alta taxa de erros detectada*\nEndpoint: {endpoint}\nErros: {error_count}"
        await self.send_slack_alert(message, severity="critical")

# Singleton
alert_service = AlertService()
