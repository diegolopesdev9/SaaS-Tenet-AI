
import logging
import json
import sys
from datetime import datetime
from typing import Optional

class JSONFormatter(logging.Formatter):
    """Formatter que gera logs em formato JSON estruturado"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Adiciona campos extras se existirem
        if hasattr(record, "agencia_id"):
            log_obj["agencia_id"] = record.agencia_id
        if hasattr(record, "user_id"):
            log_obj["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "phone"):
            log_obj["phone"] = self._sanitize_phone(record.phone)
            
        # Adiciona exception info se houver
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj, ensure_ascii=False)
    
    def _sanitize_phone(self, phone: str) -> str:
        """Mascara número de telefone para privacidade"""
        if phone and len(phone) > 6:
            return phone[:4] + "****" + phone[-2:]
        return "****"

def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Retorna logger configurado com formato JSON"""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    
    return logger

# Logger padrão da aplicação
app_logger = get_logger("sdr_agent")
