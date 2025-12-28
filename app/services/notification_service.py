
"""
Serviço de notificações por email.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from app.utils.security import EncryptionService

logger = logging.getLogger(__name__)


class NotificationService:
    """Serviço para envio de notificações por email."""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.encryption = EncryptionService()
    
    async def get_notification_config(self, tenet_id: str) -> Optional[Dict[str, Any]]:
        """Busca configuração de notificações da agência."""
        try:
            response = self.supabase.table("notificacoes_config").select("*").eq(
                "tenet_id", tenet_id
            ).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Erro ao buscar config de notificações: {e}")
            return None
    
    async def save_notification_config(
        self,
        tenet_id: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Salva configuração de notificações."""
        try:
            data = {
                "tenet_id": tenet_id,
                "email_ativo": config.get("email_ativo", False),
                "emails_destinatarios": config.get("emails_destinatarios", []),
                "notificar_lead_qualificado": config.get("notificar_lead_qualificado", True),
                "notificar_lead_agendado": config.get("notificar_lead_agendado", True),
                "notificar_resumo_diario": config.get("notificar_resumo_diario", False),
                "smtp_host": config.get("smtp_host"),
                "smtp_port": config.get("smtp_port", 587),
                "smtp_user": config.get("smtp_user"),
                "smtp_from_email": config.get("smtp_from_email"),
                "smtp_from_name": config.get("smtp_from_name"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Encriptar senha se fornecida
            if config.get("smtp_password"):
                data["smtp_password_encrypted"] = self.encryption.encrypt(config["smtp_password"])
            
            # Upsert
            response = self.supabase.table("notificacoes_config").upsert(
                data, on_conflict="tenet_id"
            ).execute()
            
            return {"success": True, "data": response.data}
        except Exception as e:
            logger.error(f"Erro ao salvar config de notificações: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_lead_notification(
        self,
        tenet_id: str,
        lead_data: Dict[str, Any],
        notification_type: str = "qualificado"
    ) -> bool:
        """Envia notificação de lead qualificado/agendado."""
        
        # Buscar configuração
        config = await self.get_notification_config(tenet_id)
        
        if not config or not config.get("email_ativo"):
            logger.info(f"Notificações desativadas para agência {tenet_id}")
            return False
        
        # Verificar tipo de notificação
        if notification_type == "qualificado" and not config.get("notificar_lead_qualificado"):
            return False
        if notification_type == "agendado" and not config.get("notificar_lead_agendado"):
            return False
        
        # Obter destinatários
        destinatarios = config.get("emails_destinatarios", [])
        if not destinatarios:
            logger.warning(f"Nenhum destinatário configurado para agência {tenet_id}")
            return False
        
        # Montar email
        subject = self._build_subject(lead_data, notification_type)
        body = self._build_body(lead_data, notification_type)
        
        # Enviar para cada destinatário
        success = True
        for email in destinatarios:
            result = await self._send_email(config, email, subject, body)
            await self._log_notification(
                tenet_id=tenet_id,
                tipo=notification_type,
                destinatario=email,
                assunto=subject,
                status="success" if result else "error",
                lead_phone=lead_data.get("phone")
            )
            if not result:
                success = False
        
        return success
    
    def _build_subject(self, lead_data: Dict[str, Any], notification_type: str) -> str:
        """Constrói assunto do email."""
        nome = lead_data.get("nome", "Novo Lead")
        if notification_type == "qualificado":
            return f"🎯 Lead Qualificado: {nome}"
        elif notification_type == "agendado":
            return f"📅 Reunião Agendada: {nome}"
        return f"📣 Atualização de Lead: {nome}"
    
    def _build_body(self, lead_data: Dict[str, Any], notification_type: str) -> str:
        """Constrói corpo do email em HTML."""
        nome = lead_data.get("nome", "Não informado")
        phone = lead_data.get("phone", "Não informado")
        empresa = lead_data.get("empresa", "Não informado")
        cargo = lead_data.get("cargo", "Não informado")
        interesse = lead_data.get("interesse", "Não informado")
        
        tipo_label = "Qualificado" if notification_type == "qualificado" else "Agendado"
        emoji = "🎯" if notification_type == "qualificado" else "📅"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }}
                .value {{ font-size: 16px; color: #111827; margin-top: 4px; }}
                .footer {{ background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280; }}
                .badge {{ display: inline-block; background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">{emoji} Lead {tipo_label}</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Um novo lead está pronto para contato!</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">Nome</div>
                        <div class="value">{nome}</div>
                    </div>
                    <div class="field">
                        <div class="label">Telefone (WhatsApp)</div>
                        <div class="value">{phone}</div>
                    </div>
                    <div class="field">
                        <div class="label">Empresa</div>
                        <div class="value">{empresa}</div>
                    </div>
                    <div class="field">
                        <div class="label">Cargo</div>
                        <div class="value">{cargo}</div>
                    </div>
                    <div class="field">
                        <div class="label">Interesse / Necessidade</div>
                        <div class="value">{interesse}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>Enviado automaticamente pelo SDR Agent</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def _send_email(
        self,
        config: Dict[str, Any],
        to_email: str,
        subject: str,
        body: str
    ) -> bool:
        """Envia email via SMTP."""
        try:
            smtp_host = config.get("smtp_host")
            smtp_port = config.get("smtp_port", 587)
            smtp_user = config.get("smtp_user")
            smtp_password = self.encryption.decrypt(config.get("smtp_password_encrypted", ""))
            from_email = config.get("smtp_from_email") or smtp_user
            from_name = config.get("smtp_from_name", "SDR Agent")
            
            if not all([smtp_host, smtp_user, smtp_password]):
                logger.error("Configuração SMTP incompleta")
                return False
            
            # Criar mensagem
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email
            
            # Adicionar corpo HTML
            msg.attach(MIMEText(body, "html"))
            
            # Conectar e enviar
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email enviado para {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar email: {e}")
            return False
    
    async def _log_notification(
        self,
        tenet_id: str,
        tipo: str,
        destinatario: str,
        assunto: str,
        status: str,
        lead_phone: str = None,
        erro: str = None
    ):
        """Registra log de notificação."""
        try:
            self.supabase.table("notificacoes_log").insert({
                "tenet_id": tenet_id,
                "tipo": tipo,
                "destinatario": destinatario,
                "assunto": assunto,
                "status": status,
                "lead_phone": lead_phone,
                "erro": erro,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Erro ao registrar log de notificação: {e}")
    
    async def test_smtp_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Testa conexão SMTP."""
        try:
            smtp_host = config.get("smtp_host")
            smtp_port = config.get("smtp_port", 587)
            smtp_user = config.get("smtp_user")
            smtp_password = config.get("smtp_password")
            
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
            
            return {"success": True, "message": "Conexão SMTP estabelecida com sucesso"}
        except Exception as e:
            return {"success": False, "message": f"Erro na conexão: {str(e)}"}
