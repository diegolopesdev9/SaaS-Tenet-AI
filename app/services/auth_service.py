"""
Serviço de autenticação com JWT.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.database import get_supabase_client
from app.config import settings

logger = logging.getLogger(__name__)

# Configurações - Usando config validado
SECRET_KEY = settings.jwt_secret_validated
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Contexto de criptografia para senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Serviço para autenticação de usuários."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica se a senha está correta."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Gera hash da senha."""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Cria token JWT."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        # Log de auditoria (sem expor o token)
        logger.info(f"Token JWT criado para user_id={data.get('sub', 'unknown')}")
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verifica e decodifica token JWT."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Autentica usuário por email e senha."""
        try:
            response = self.supabase.table("usuarios").select("*").eq("email", email).eq("ativo", True).execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            user = response.data[0]
            
            if not self.verify_password(password, user["senha_hash"]):
                return None
            
            return user
        except Exception as e:
            print(f"Erro ao autenticar: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Busca usuário por ID."""
        try:
            response = self.supabase.table("usuarios").select("*").eq("id", user_id).eq("ativo", True).execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            return response.data[0]
        except Exception:
            return None
    
    async def create_user(self, email: str, password: str, nome: str, tenet_id: str) -> Optional[dict]:
        """Cria novo usuário."""
        try:
            senha_hash = self.get_password_hash(password)
            
            response = self.supabase.table("usuarios").insert({
                "email": email,
                "senha_hash": senha_hash,
                "nome": nome,
                "tenet_id": tenet_id
            }).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Erro ao criar usuário: {e}")
            return None
