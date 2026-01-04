"""
Rate limiting robusto com múltiplas estratégias.
Protege contra ataques de força bruta e DDoS.
"""
import logging
from typing import Optional, Callable
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


def get_client_identifier(request: Request) -> str:
    """
    Identifica o cliente usando múltiplos fatores.
    Mais resistente a bypass por múltiplos IPs.
    
    Ordem de prioridade:
    1. User ID do token JWT (se autenticado)
    2. X-Forwarded-For (IP real atrás de proxy)
    3. X-Real-IP
    4. IP direto da conexão
    """
    # Tentar extrair user_id do token (se disponível no state)
    if hasattr(request.state, 'user_id') and request.state.user_id:
        return f"user:{request.state.user_id}"
    
    # Headers de proxy reverso
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Pegar primeiro IP (cliente original)
        client_ip = forwarded_for.split(",")[0].strip()
        return f"ip:{client_ip}"
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return f"ip:{real_ip}"
    
    # Fallback para IP direto
    return f"ip:{get_remote_address(request)}"


def get_identifier_for_login(request: Request) -> str:
    """
    Identificador específico para endpoint de login.
    Usa combinação de IP + email para prevenir enumeração.
    """
    ip = get_remote_address(request)
    
    # Tentar extrair email do body (para rate limit por conta)
    # Nota: Isso requer que o body já tenha sido lido
    email = getattr(request.state, 'login_email', None)
    
    if email:
        # Rate limit por IP + email (previne força bruta em conta específica)
        return f"login:{ip}:{email[:10]}"
    
    return f"login:{ip}"


# Limiter principal
limiter = Limiter(
    key_func=get_client_identifier,
    default_limits=["200/minute", "1000/hour"],  # Limites globais
    storage_uri="memory://",  # Em produção, usar Redis
)

# Limites específicos por tipo de endpoint
RATE_LIMITS = {
    "auth": "5/minute",           # Login/registro
    "auth_strict": "3/minute",    # Após falhas
    "api_read": "60/minute",      # Leitura de dados
    "api_write": "30/minute",     # Escrita de dados
    "webhook": "100/minute",      # Webhooks externos
    "ai_generation": "20/minute", # Geração de IA (custoso)
    "export": "5/minute",         # Exportações
}


def get_rate_limit(endpoint_type: str) -> str:
    """Retorna o rate limit para um tipo de endpoint."""
    return RATE_LIMITS.get(endpoint_type, "60/minute")


# Decorators helper
def limit_auth(func: Callable) -> Callable:
    """Decorator para endpoints de autenticação."""
    return limiter.limit(RATE_LIMITS["auth"])(func)


def limit_webhook(func: Callable) -> Callable:
    """Decorator para webhooks."""
    return limiter.limit(RATE_LIMITS["webhook"])(func)


def limit_ai(func: Callable) -> Callable:
    """Decorator para endpoints de IA."""
    return limiter.limit(RATE_LIMITS["ai_generation"])(func)
