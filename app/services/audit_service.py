"""
Serviço de Audit Logs para conformidade e segurança.
Registra ações importantes do sistema de forma estruturada.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum
from app.database import get_supabase_client

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Tipos de ações auditáveis."""
    # Autenticação
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILED = "auth.login.failed"
    LOGOUT = "auth.logout"
    PASSWORD_CHANGE = "auth.password.change"
    TOKEN_REFRESH = "auth.token.refresh"
    
    # Dados de usuário
    USER_CREATE = "user.create"
    USER_UPDATE = "user.update"
    USER_DELETE = "user.delete"
    
    # Dados de leads
    LEAD_CREATE = "lead.create"
    LEAD_UPDATE = "lead.update"
    LEAD_DELETE = "lead.delete"
    LEAD_EXPORT = "lead.export"
    
    # Configurações
    CONFIG_UPDATE = "config.update"
    INTEGRATION_CONNECT = "integration.connect"
    INTEGRATION_DISCONNECT = "integration.disconnect"
    
    # Segurança
    SECURITY_ALERT = "security.alert"
    RATE_LIMIT_HIT = "security.rate_limit"
    INJECTION_ATTEMPT = "security.injection_attempt"
    
    # Conversas
    CONVERSATION_START = "conversation.start"
    CONVERSATION_END = "conversation.end"


class AuditService:
    """Serviço para registro de audit logs."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def log(
        self,
        action: AuditAction,
        user_id: Optional[str] = None,
        tenet_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success"
    ) -> bool:
        """
        Registra um evento de auditoria.
        
        Args:
            action: Tipo da ação (AuditAction enum)
            user_id: ID do usuário que executou a ação
            tenet_id: ID da agência/tenant
            resource_type: Tipo do recurso afetado (ex: "lead", "config")
            resource_id: ID do recurso afetado
            details: Detalhes adicionais (será serializado como JSON)
            ip_address: IP do cliente
            user_agent: User-Agent do cliente
            status: "success" ou "failure"
            
        Returns:
            True se o log foi registrado com sucesso
        """
        try:
            # Sanitizar details para não incluir dados sensíveis
            safe_details = self._sanitize_details(details) if details else {}
            
            audit_entry = {
                "action": action.value,
                "user_id": user_id,
                "tenet_id": tenet_id,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": json.dumps(safe_details),
                "ip_address": ip_address,
                "user_agent": user_agent[:500] if user_agent else None,
                "status": status,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Inserir no banco
            response = self.supabase.table("audit_logs").insert(audit_entry).execute()
            
            if response.data:
                logger.debug(f"Audit log registrado: {action.value}")
                return True
            else:
                logger.error(f"Falha ao registrar audit log: {action.value}")
                return False
                
        except Exception as e:
            # Audit log não deve quebrar a aplicação
            logger.error(f"Erro ao registrar audit log: {e}")
            return False
    
    def _sanitize_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Remove dados sensíveis dos detalhes."""
        sensitive_keys = [
            "password", "senha", "token", "secret", "key", "api_key",
            "credit_card", "cpf", "ssn", "authorization"
        ]
        
        sanitized = {}
        for key, value in details.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_details(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    async def log_login(
        self,
        email: str,
        success: bool,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        """Helper para log de login."""
        action = AuditAction.LOGIN_SUCCESS if success else AuditAction.LOGIN_FAILED
        details = {"email_masked": f"{email[:3]}***@{email.split('@')[1] if '@' in email else '***'}"}
        
        if failure_reason:
            details["reason"] = failure_reason
        
        await self.log(
            action=action,
            user_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            status="success" if success else "failure"
        )
    
    async def log_security_event(
        self,
        event_type: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        severity: str = "medium"
    ):
        """Helper para eventos de segurança."""
        details["severity"] = severity
        
        await self.log(
            action=AuditAction.SECURITY_ALERT,
            details=details,
            ip_address=ip_address,
            status="alert"
        )


# Instância singleton
audit_service = AuditService()
