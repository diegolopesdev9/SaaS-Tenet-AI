
"""
Rotas de Super Admin para gerenciamento de agências e usuários.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from app.database import get_supabase_client
from app.routes.auth import get_current_user
from app.utils.security import EncryptionService
from passlib.context import CryptContext

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Super Admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================
# MIDDLEWARE DE VERIFICAÇÃO SUPER ADMIN
# ============================================

async def require_super_admin(current_user: dict = Depends(get_current_user)):
    """Verifica se o usuário é super_admin."""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Requer Super Admin.")
    return current_user


# ============================================
# SCHEMAS
# ============================================

class AgenciaCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr
    instance_name: str = Field(..., max_length=100)
    whatsapp_phone_id: Optional[str] = None
    prompt_config: Optional[str] = None


class AgenciaResponse(BaseModel):
    id: str
    nome: str
    instance_name: Optional[str]
    whatsapp_phone_id: Optional[str]
    created_at: Optional[str]


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nome: str = Field(..., max_length=100)
    agencia_id: str
    role: str = Field(default="admin", pattern="^(admin|user)$")


class UsuarioResponse(BaseModel):
    id: str
    email: str
    nome: str
    agencia_id: Optional[str]
    role: str
    ativo: bool
    created_at: Optional[str]


# ============================================
# ROTAS DE AGÊNCIAS
# ============================================

@router.get("/agencias")
async def list_agencias(current_user: dict = Depends(require_super_admin)):
    """Lista todas as agências."""
    logger.info(f"Super Admin {current_user['email']} listando agências")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("agencias").select(
            "id, nome, instance_name, whatsapp_phone_id, created_at"
        ).order("created_at", desc=True).execute()
        
        return response.data or []
    except Exception as e:
        logger.error(f"Erro ao listar agências: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agencias")
async def create_agencia(
    agencia: AgenciaCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Cria nova agência."""
    logger.info(f"Super Admin {current_user['email']} criando agência: {agencia.nome}")
    
    supabase = get_supabase_client()
    
    try:
        # Verificar se instance_name já existe
        existing = supabase.table("agencias").select("id").eq(
            "instance_name", agencia.instance_name
        ).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Instance name já existe")
        
        # Criar agência
        data = {
            "nome": agencia.nome,
            "email": agencia.email,
            "instance_name": agencia.instance_name,
            "whatsapp_phone_id": agencia.whatsapp_phone_id,
            "prompt_config": agencia.prompt_config,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table("agencias").insert(data).execute()
        
        if response.data:
            logger.info(f"Agência criada: {response.data[0]['id']}")
            return {"success": True, "agencia": response.data[0]}
        
        raise HTTPException(status_code=500, detail="Erro ao criar agência")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar agência: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agencias/{agencia_id}")
async def delete_agencia(
    agencia_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Deleta uma agência."""
    logger.info(f"Super Admin {current_user['email']} deletando agência: {agencia_id}")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("agencias").delete().eq("id", agencia_id).execute()
        
        if response.data:
            return {"success": True, "message": "Agência deletada"}
        
        raise HTTPException(status_code=404, detail="Agência não encontrada")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar agência: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ROTAS DE USUÁRIOS
# ============================================

@router.get("/usuarios")
async def list_usuarios(current_user: dict = Depends(require_super_admin)):
    """Lista todos os usuários."""
    logger.info(f"Super Admin {current_user['email']} listando usuários")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("usuarios").select(
            "id, email, nome, agencia_id, role, ativo, created_at"
        ).order("created_at", desc=True).execute()
        
        return response.data or []
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/usuarios")
async def create_usuario(
    usuario: UsuarioCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Cria novo usuário."""
    logger.info(f"Super Admin {current_user['email']} criando usuário: {usuario.email}")
    
    supabase = get_supabase_client()
    
    try:
        # Verificar se email já existe
        existing = supabase.table("usuarios").select("id").eq(
            "email", usuario.email
        ).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Verificar se agência existe
        agencia = supabase.table("agencias").select("id").eq(
            "id", usuario.agencia_id
        ).execute()
        
        if not agencia.data:
            raise HTTPException(status_code=400, detail="Agência não encontrada")
        
        # Hash da senha
        senha_hash = pwd_context.hash(usuario.password)
        
        # Criar usuário
        data = {
            "email": usuario.email,
            "senha_hash": senha_hash,
            "nome": usuario.nome,
            "agencia_id": usuario.agencia_id,
            "role": usuario.role,
            "ativo": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table("usuarios").insert(data).execute()
        
        if response.data:
            logger.info(f"Usuário criado: {response.data[0]['id']}")
            return {"success": True, "usuario": {
                "id": response.data[0]["id"],
                "email": response.data[0]["email"],
                "nome": response.data[0]["nome"],
                "role": response.data[0]["role"]
            }}
        
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/usuarios/{usuario_id}/toggle")
async def toggle_usuario(
    usuario_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Ativa/desativa usuário."""
    logger.info(f"Super Admin {current_user['email']} alternando status do usuário: {usuario_id}")
    
    supabase = get_supabase_client()
    
    try:
        # Buscar usuário atual
        user = supabase.table("usuarios").select("ativo").eq("id", usuario_id).execute()
        
        if not user.data:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Alternar status
        new_status = not user.data[0]["ativo"]
        
        response = supabase.table("usuarios").update({
            "ativo": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", usuario_id).execute()
        
        return {"success": True, "ativo": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alternar usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/usuarios/{usuario_id}")
async def delete_usuario(
    usuario_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Deleta um usuário."""
    logger.info(f"Super Admin {current_user['email']} deletando usuário: {usuario_id}")
    
    # Impedir auto-delete
    if usuario_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível deletar a si mesmo")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("usuarios").delete().eq("id", usuario_id).execute()
        
        if response.data:
            return {"success": True, "message": "Usuário deletado"}
        
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))
