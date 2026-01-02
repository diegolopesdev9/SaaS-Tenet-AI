"""
Rotas de autenticação.
"""
from app.utils.logger import get_logger, masker

logger = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
    password: str = Field(..., min_length=6)
    nome: str = Field(..., max_length=100)
    tenet_id: str
    role: str = Field(default="user", pattern="^(admin|user)$")


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
@limiter.limit(RATE_LIMITS["auth"])
async def login(request: Request, credentials: LoginRequest):
    # Armazenar email no state para rate limit mais preciso
    request.state.login_email = credentials.email
    """
    Realiza login e retorna token JWT.
    """
    logger.info(f"Tentativa de login: {masker.mask_email(credentials.email)}")

    auth_service = AuthService()
    user = await auth_service.authenticate_user(credentials.email, credentials.password)

    if not user:
        logger.warning(f"Login falhou: {masker.mask_email(credentials.email)}")
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    # Criar token
    access_token = auth_service.create_access_token(
        data={
            "sub": user["id"],
            "email": user["email"],
            "tenet_id": user["tenet_id"],
            "role": user.get("role", "admin")
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    logger.info(f"Login bem-sucedido: user_id={user['id']}")

    return LoginResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "nome": user["nome"],
            "tenet_id": user["tenet_id"],
            "role": user.get("role", "admin"),
            "deve_alterar_senha": user.get("deve_alterar_senha", False)
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
        "tenet_id": current_user["tenet_id"],
        "role": current_user.get("role", "admin"),
        "deve_alterar_senha": current_user.get("deve_alterar_senha", False)
    }


@router.post("/register")
@limiter.limit(RATE_LIMITS["auth"])
async def register(request: Request, user_data: UserCreate):
    """
    Registra novo usuário (usar apenas para setup inicial).
    """
    logger.info(f"Registro de usuário: {masker.mask_email(user_data.email)}")

    auth_service = AuthService()
    user = await auth_service.create_user(
        email=user_data.email,
        password=user_data.password,
        nome=user_data.nome,
        tenet_id=user_data.tenet_id
    )

    if not user:
        raise HTTPException(status_code=400, detail="Erro ao criar usuário. Email pode já existir.")

    return {"message": "Usuário criado com sucesso", "user_id": user["id"]}


@router.post("/change-password")
async def change_password(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Altera a senha do usuário."""
    try:
        body = await request.json()
        nova_senha = body.get("nova_senha")

        if not nova_senha or len(nova_senha) < 6:
            raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")

        supabase = get_supabase_client()

        # Hash da nova senha
        nova_senha_hash = pwd_context.hash(nova_senha)

        # Atualizar senha e remover flag de alteração obrigatória
        response = supabase.table("usuarios").update({
            "senha_hash": nova_senha_hash,
            "deve_alterar_senha": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", current_user["id"]).execute()

        if response.data:
            logger.info(f"Senha alterada para usuário ID: {current_user['id']}")
            return {"success": True, "message": "Senha alterada com sucesso"}

        raise HTTPException(status_code=500, detail="Erro ao alterar senha")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alterar senha: {e}")
        raise HTTPException(status_code=500, detail=str(e))