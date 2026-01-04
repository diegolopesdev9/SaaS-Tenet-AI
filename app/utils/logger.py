"""
Sistema de logging estruturado com mascaramento de dados sensíveis.
Conformidade com LGPD e melhores práticas de segurança.
"""
import logging
import json
import sys
import re
from datetime import datetime
from typing import Optional, Any, Dict

# Padrões para identificar dados sensíveis
SENSITIVE_PATTERNS = {
    "email": re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
    "phone_br": re.compile(r'\b(\+?55)?[\s-]?\(?[1-9]{2}\)?[\s-]?9?[0-9]{4}[\s-]?[0-9]{4}\b'),
    "cpf": re.compile(r'\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b'),
    "credit_card": re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
    "jwt_token": re.compile(r'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'),
    "api_key": re.compile(r'(?:api[_-]?key|apikey|key)["\s:=]+["\']?([a-zA-Z0-9_-]{20,})["\']?', re.IGNORECASE),
    "password": re.compile(r'(?:password|senha|pwd|pass)["\s:=]+["\']?([^\s"\']+)["\']?', re.IGNORECASE),
    "bearer_token": re.compile(r'Bearer\s+[A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*\.?[A-Za-z0-9_-]*'),
}

# Campos que devem ser sempre mascarados
SENSITIVE_FIELDS = [
    "password", "senha", "secret", "token", "api_key", "apikey",
    "authorization", "credit_card", "cpf", "cnpj", "rg",
    "access_token", "refresh_token", "private_key", "fernet_key"
]


class SensitiveDataMasker:
    """Classe para mascarar dados sensíveis em textos e dicionários."""
    
    @staticmethod
    def mask_email(email: str) -> str:
        """Mascara email mantendo domínio parcial."""
        if '@' not in email:
            return "***@***"
        local, domain = email.split('@', 1)
        masked_local = local[:2] + "***" if len(local) > 2 else "***"
        domain_parts = domain.split('.')
        masked_domain = domain_parts[0][:3] + "***." + domain_parts[-1] if len(domain_parts) > 1 else "***"
        return f"{masked_local}@{masked_domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """Mascara telefone mantendo DDD."""
        digits = re.sub(r'\D', '', phone)
        if len(digits) >= 10:
            return digits[:4] + "****" + digits[-2:]
        return "****"
    
    @staticmethod
    def mask_cpf(cpf: str) -> str:
        """Mascara CPF mostrando apenas últimos dígitos."""
        digits = re.sub(r'\D', '', cpf)
        if len(digits) == 11:
            return f"***.***.**{digits[-2:]}"
        return "***.***.***-**"
    
    @staticmethod
    def mask_token(token: str) -> str:
        """Mascara tokens mantendo prefixo."""
        if len(token) > 10:
            return token[:8] + "..." + token[-4:]
        return "***"
    
    @staticmethod
    def mask_generic(value: str, show_chars: int = 4) -> str:
        """Mascaramento genérico."""
        if len(value) <= show_chars * 2:
            return "***"
        return value[:show_chars] + "***" + value[-show_chars:]
    
    def mask_text(self, text: str) -> str:
        """Mascara todos os dados sensíveis em um texto."""
        if not text:
            return text
        
        result = text
        
        # Mascarar emails
        for match in SENSITIVE_PATTERNS["email"].finditer(result):
            result = result.replace(match.group(), self.mask_email(match.group()))
        
        # Mascarar telefones
        for match in SENSITIVE_PATTERNS["phone_br"].finditer(result):
            result = result.replace(match.group(), self.mask_phone(match.group()))
        
        # Mascarar CPFs
        for match in SENSITIVE_PATTERNS["cpf"].finditer(result):
            result = result.replace(match.group(), self.mask_cpf(match.group()))
        
        # Mascarar tokens JWT
        for match in SENSITIVE_PATTERNS["jwt_token"].finditer(result):
            result = result.replace(match.group(), self.mask_token(match.group()))
        
        # Mascarar Bearer tokens
        for match in SENSITIVE_PATTERNS["bearer_token"].finditer(result):
            result = result.replace(match.group(), "Bearer ***")
        
        # Mascarar cartões de crédito
        for match in SENSITIVE_PATTERNS["credit_card"].finditer(result):
            result = result.replace(match.group(), "****-****-****-" + match.group()[-4:])
        
        return result
    
    def mask_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mascara dados sensíveis em um dicionário."""
        if not isinstance(data, dict):
            return data
        
        masked = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Verificar se é campo sensível
            if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
                masked[key] = "[REDACTED]"
            elif isinstance(value, dict):
                masked[key] = self.mask_dict(value)
            elif isinstance(value, list):
                masked[key] = [
                    self.mask_dict(item) if isinstance(item, dict) else item 
                    for item in value
                ]
            elif isinstance(value, str):
                masked[key] = self.mask_text(value)
            else:
                masked[key] = value
        
        return masked


# Instância global do masker
masker = SensitiveDataMasker()


class SecureJSONFormatter(logging.Formatter):
    """Formatter que gera logs em JSON com mascaramento de dados sensíveis."""
    
    def format(self, record: logging.LogRecord) -> str:
        # Mascarar a mensagem principal
        masked_message = masker.mask_text(record.getMessage())
        
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": masked_message,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Adicionar campos extras com mascaramento
        extra_fields = ["tenet_id", "user_id", "request_id", "phone", "email", "ip_address"]
        for field in extra_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if field in ["phone", "email"]:
                    if field == "phone":
                        log_obj[field] = masker.mask_phone(str(value)) if value else None
                    else:
                        log_obj[field] = masker.mask_email(str(value)) if value else None
                else:
                    log_obj[field] = value
        
        # Adicionar exception info se houver
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_obj, ensure_ascii=False)


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Retorna logger configurado com formato JSON seguro."""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(SecureJSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    
    return logger


# Logger padrão da aplicação
app_logger = get_logger("tenet_ai")


def log_with_context(
    logger: logging.Logger,
    level: int,
    message: str,
    **context
) -> None:
    """
    Helper para log com contexto adicional.
    
    Uso:
        log_with_context(logger, logging.INFO, "User login", user_id="123", ip="1.2.3.4")
    """
    extra = {k: v for k, v in context.items() if v is not None}
    logger.log(level, message, extra=extra)
