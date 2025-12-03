
"""
Serviço de criptografia para dados sensíveis.
"""
import logging
from cryptography.fernet import Fernet
from typing import Optional
from app.config import settings

# Configurar logging
logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Serviço para criptografar e descriptografar dados sensíveis usando Fernet.
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Inicializa o serviço de criptografia.
        
        Args:
            encryption_key: Chave de criptografia Fernet (opcional, usa settings se não fornecida)
            
        Raises:
            ValueError: Se a chave de criptografia não estiver configurada
        """
        key = encryption_key or settings.ENCRYPTION_KEY
        
        if not key:
            raise ValueError("ENCRYPTION_KEY não configurada")
        
        self.cipher = Fernet(key.encode())
        logger.info("EncryptionService inicializado com sucesso")
    
    def encrypt(self, data: str) -> str:
        """
        Criptografa uma string.
        
        Args:
            data: String a ser criptografada
            
        Returns:
            String criptografada em formato base64
        """
        encrypted_bytes = self.cipher.encrypt(data.encode())
        return encrypted_bytes.decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Descriptografa uma string criptografada.
        
        Args:
            encrypted_data: String criptografada em formato base64
            
        Returns:
            String descriptografada
            
        Raises:
            cryptography.fernet.InvalidToken: Se os dados criptografados forem inválidos
        """
        decrypted_bytes = self.cipher.decrypt(encrypted_data.encode())
        return decrypted_bytes.decode()


# Instância global do serviço
encryption_service = EncryptionService()
