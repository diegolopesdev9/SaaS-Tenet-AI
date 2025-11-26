
"""Encryption service for sensitive data."""
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings


class EncryptionService:
    """Service for encrypting and decrypting sensitive data using Fernet."""
    
    def __init__(self):
        """Initialize the encryption service with the master key."""
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            Encrypted string in base64 format
        """
        encrypted_bytes = self.cipher.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    
    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt encrypted string.
        
        Args:
            encrypted: The encrypted string in base64 format
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            InvalidToken: If the encrypted data is invalid or corrupted
        """
        try:
            decrypted_bytes = self.cipher.decrypt(encrypted.encode())
            return decrypted_bytes.decode()
        except InvalidToken as e:
            raise InvalidToken("Failed to decrypt data: invalid token") from e


encryption_service = EncryptionService()
