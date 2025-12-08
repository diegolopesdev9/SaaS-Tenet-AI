
"""
Rotas de autenticação.
"""
import logging
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])
security = HTTPBearer()


# Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nome: str
    agencia_id: str


# Dependency para obter usuário atual
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extrai e valida o usuário do token JWT."""
    auth_service = AuthService()
    
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    
    if payload is None:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    return user


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Realiza login e retorna token JWT.
    """
    logger.info(f"Tentativa de login: {request.email}")
    
    auth_service = AuthService()
    user = await auth_service.authenticate_user(request.email, request.password)
    
    if not user:
        logger.warning(f"Login falhou: {request.email}")
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Criar token
    access_token = auth_service.create_access_token(
        data={
            "sub": user["id"],
            "email": user["email"],
            "agencia_id": user["agencia_id"],
            "role": user.get("role", "admin")
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"Login bem-sucedido: {request.email}")
    
    return LoginResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "nome": user["nome"],
            "agencia_id": user["agencia_id"],
            "role": user.get("role", "admin")
        }
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Retorna dados do usuário logado.
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "nome": current_user["nome"],
        "agencia_id": current_user["agencia_id"],
        "role": current_user.get("role", "admin")
    }


@router.post("/register")
async def register(request: UserCreate):
    """
    Registra novo usuário (usar apenas para setup inicial).
    """
    logger.info(f"Registro de usuário: {request.email}")
    
    auth_service = AuthService()
    user = await auth_service.create_user(
        email=request.email,
        password=request.password,
        nome=request.nome,
        agencia_id=request.agencia_id
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Erro ao criar usuário. Email pode já existir.")
    
    return {"message": "Usuário criado com sucesso", "user_id": user["id"]}
