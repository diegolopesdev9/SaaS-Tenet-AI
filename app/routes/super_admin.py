
"""
Rotas de Super Admin para gerenciamento de tenets e usuários.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
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

class TenetCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr
    instance_name: str = Field(..., max_length=100)
    whatsapp_phone_id: Optional[str] = None
    prompt_config: Optional[str] = None
    admin_nome: str = Field(..., max_length=100)
    admin_email: EmailStr
    admin_senha: str = Field(..., min_length=6)
    nicho: str = Field(default="sdr", pattern="^(sdr|suporte|rh|vendas|custom)$")


class TenetResponse(BaseModel):
    id: str
    nome: str
    instance_name: Optional[str]
    whatsapp_phone_id: Optional[str]
    created_at: Optional[str]


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nome: str = Field(..., max_length=100)
    tenet_id: str
    role: str = Field(default="admin", pattern="^(admin|user)$")


class UsuarioResponse(BaseModel):
    id: str
    email: str
    nome: str
    tenet_id: Optional[str]
    role: str
    ativo: bool
    created_at: Optional[str]


# Aliases para compatibilidade
AgenciaCreate = TenetCreate
AgenciaResponse = TenetResponse


# ============================================
# ROTAS DE TENETS
# ============================================

@router.get("/tenets")
@router.get("/agencias")
async def list_all_tenets(current_user: dict = Depends(get_current_user)):
    """Lista todos os tenets com métricas resumidas (apenas super_admin)."""

    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a super administradores")

    supabase = get_supabase_client()

    try:
        # Buscar tenets
        response = supabase.table("tenets").select(
            "id, nome, email, created_at, instance_name, whatsapp_phone_id, nicho"
        ).order("nome").execute()

        tenets = response.data or []

        # Para cada tenet, buscar contagem de usuários e conversas
        for tenet in tenets:
            # Contar usuários
            usuarios_response = supabase.table("usuarios").select(
                "id", count="exact"
            ).eq("tenet_id", tenet["id"]).execute()
            tenet["total_usuarios"] = usuarios_response.count or 0

            # Contar conversas
            conversas_response = supabase.table("conversas").select(
                "id", count="exact"
            ).eq("tenet_id", tenet["id"]).execute()
            tenet["total_conversas"] = conversas_response.count or 0

            # Contar qualificados
            qualificados_response = supabase.table("conversas").select(
                "id", count="exact"
            ).eq("tenet_id", tenet["id"]).eq("lead_status", "qualificado").execute()
            tenet["total_qualificados"] = qualificados_response.count or 0

        return tenets
    except Exception as e:
        logger.error(f"Erro ao listar tenets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/geral")
async def get_general_metrics(
    period: str = "7d",
    current_user: dict = Depends(require_super_admin)
):
    """Retorna métricas consolidadas de todos os tenets (apenas super_admin)."""
    logger.info(f"Super Admin {current_user['email']} consultando métricas gerais")

    supabase = get_supabase_client()

    # Calcular data inicial baseado no período
    days_map = {"7d": 7, "15d": 15, "30d": 30, "90d": 90}
    days = days_map.get(period, 7)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    try:
        # Buscar todos os tenets
        tenets_response = supabase.table("tenets").select("id, nome").execute()
        tenets = tenets_response.data or []

        # Buscar todas as conversas do período
        conversas_response = supabase.table("conversas").select(
            "id, tenet_id, lead_status, total_mensagens, created_at, last_message_at"
        ).gte("created_at", start_date.isoformat()).execute()

        conversas = conversas_response.data or []

        # Calcular métricas gerais
        total_leads = len(conversas)
        status_counts = {"iniciada": 0, "em_andamento": 0, "qualificado": 0, "perdido": 0, "agendado": 0}
        leads_by_day = {}
        leads_by_tenet = {}
        total_response_time = 0
        response_count = 0

        for conv in conversas:
            # Contagem por status
            status = conv.get("lead_status", "em_andamento")
            if status in status_counts:
                status_counts[status] += 1

            # Agrupar por dia
            created = conv.get("created_at", "")[:10]
            if created:
                if created not in leads_by_day:
                    leads_by_day[created] = {"total": 0, "qualificado": 0}
                leads_by_day[created]["total"] += 1
                if status == "qualificado":
                    leads_by_day[created]["qualificado"] += 1

            # Agrupar por tenet
            tenet_id = conv.get("tenet_id")
            if tenet_id:
                if tenet_id not in leads_by_tenet:
                    leads_by_tenet[tenet_id] = {"total": 0, "qualificado": 0}
                leads_by_tenet[tenet_id]["total"] += 1
                if status == "qualificado":
                    leads_by_tenet[tenet_id]["qualificado"] += 1

            # Calcular tempo médio
            if conv.get("created_at") and conv.get("last_message_at"):
                try:
                    created_dt = datetime.fromisoformat(conv["created_at"].replace("Z", "+00:00"))
                    last_dt = datetime.fromisoformat(conv["last_message_at"].replace("Z", "+00:00"))
                    diff_hours = (last_dt - created_dt).total_seconds() / 3600
                    if diff_hours > 0:
                        total_response_time += diff_hours
                        response_count += 1
                except:
                    pass

        # Formatar dados para gráfico de linha (por dia)
        chart_data = []
        for date in sorted(leads_by_day.keys()):
            chart_data.append({
                "date": date,
                "label": datetime.strptime(date, "%Y-%m-%d").strftime("%d/%m"),
                "total": leads_by_day[date]["total"],
                "qualificado": leads_by_day[date]["qualificado"]
            })

        # Formatar dados por tenet
        tenet_data = []
        for tenet in tenets:
            tn_id = tenet["id"]
            tn_stats = leads_by_tenet.get(tn_id, {"total": 0, "qualificado": 0})
            tenet_data.append({
                "id": tn_id,
                "nome": tenet["nome"],
                "total": tn_stats["total"],
                "qualificado": tn_stats["qualificado"],
                "taxa": round(tn_stats["qualificado"] / max(tn_stats["total"], 1) * 100, 1)
            })

        # Ordenar por total de leads
        tenet_data.sort(key=lambda x: x["total"], reverse=True)

        # Calcular funil
        if total_leads > 0:
            funnel_data = [
                {"stage": "Leads Recebidos", "count": total_leads, "percentage": 100},
                {"stage": "Em Andamento", "count": status_counts["em_andamento"], "percentage": round(status_counts["em_andamento"] / total_leads * 100)},
                {"stage": "Qualificados", "count": status_counts["qualificado"], "percentage": round(status_counts["qualificado"] / total_leads * 100)},
                {"stage": "Agendados", "count": status_counts["agendado"], "percentage": round(status_counts["agendado"] / total_leads * 100)},
            ]
        else:
            funnel_data = [
                {"stage": "Leads Recebidos", "count": 0, "percentage": 0},
                {"stage": "Em Andamento", "count": 0, "percentage": 0},
                {"stage": "Qualificados", "count": 0, "percentage": 0},
                {"stage": "Agendados", "count": 0, "percentage": 0},
            ]

        # Tempo médio
        avg_response_time = round(total_response_time / max(response_count, 1), 1)

        return {
            "period": period,
            "total_leads": total_leads,
            "total_tenets": len(tenets),
            "chart_data": chart_data,
            "funnel_data": funnel_data,
            "status_breakdown": status_counts,
            "avg_conversation_hours": avg_response_time,
            "conversion_rate": round(status_counts["qualificado"] / max(total_leads, 1) * 100, 1),
            "tenet_breakdown": tenet_data
        }

    except Exception as e:
        logger.error(f"Erro ao calcular métricas gerais: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tenets")
@router.post("/agencias")
async def create_tenet(
    tenet: TenetCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Cria novo tenet com usuário admin."""
    logger.info(f"Super Admin {current_user['email']} criando tenet: {tenet.nome}")

    supabase = get_supabase_client()

    try:
        # Verificar se instance_name já existe
        existing = supabase.table("tenets").select("id").eq(
            "instance_name", tenet.instance_name
        ).execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Instance name já existe")

        # Verificar se email do admin já existe
        existing_user = supabase.table("usuarios").select("id").eq(
            "email", tenet.admin_email
        ).execute()

        if existing_user.data:
            raise HTTPException(status_code=400, detail="Email do administrador já cadastrado")

        # Criar tenet
        tenet_data = {
            "nome": tenet.nome,
            "email": tenet.email,
            "instance_name": tenet.instance_name,
            "whatsapp_phone_id": tenet.whatsapp_phone_id,
            "prompt_config": tenet.prompt_config,
            "nicho": tenet.nicho,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        tenet_response = supabase.table("tenets").insert(tenet_data).execute()

        if not tenet_response.data:
            raise HTTPException(status_code=500, detail="Erro ao criar tenet")

        tenet_id = tenet_response.data[0]['id']
        logger.info(f"Tenet criado: {tenet_id}")

        # Criar usuário admin para o tenet
        senha_hash = pwd_context.hash(tenet.admin_senha)

        usuario_data = {
            "email": tenet.admin_email,
            "senha_hash": senha_hash,
            "nome": tenet.admin_nome,
            "tenet_id": tenet_id,
            "role": "admin",
            "ativo": True,
            "deve_alterar_senha": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        usuario_response = supabase.table("usuarios").insert(usuario_data).execute()

        if not usuario_response.data:
            # Se falhar ao criar usuário, deletar o tenet criado
            supabase.table("tenets").delete().eq("id", tenet_id).execute()
            raise HTTPException(status_code=500, detail="Erro ao criar usuário admin")

        logger.info(f"Usuário admin criado: {usuario_response.data[0]['id']}")

        return {
            "success": True,
            "tenet": tenet_response.data[0],
            "usuario": {
                "id": usuario_response.data[0]["id"],
                "email": usuario_response.data[0]["email"],
                "nome": usuario_response.data[0]["nome"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar tenet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tenets/{tenet_id}")
@router.delete("/agencias/{tenet_id}")
async def delete_tenet(
    tenet_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Deleta um tenet e todos os dados relacionados, incluindo usuários."""
    logger.info(f"Super Admin {current_user['email']} deletando tenet: {tenet_id}")

    supabase = get_supabase_client()

    try:
        # Verificar se tenet existe
        tenet = supabase.table("tenets").select("id, nome").eq("id", tenet_id).execute()
        
        if not tenet.data:
            raise HTTPException(status_code=404, detail="Tenet não encontrado")
        
        nome_tenet = tenet.data[0].get("nome", "")
        
        # Contar usuários que serão deletados
        usuarios = supabase.table("usuarios").select("id").eq("tenet_id", tenet_id).execute()
        total_usuarios = len(usuarios.data) if usuarios.data else 0
        
        # 1. Deletar usuários do tenet
        supabase.table("usuarios").delete().eq("tenet_id", tenet_id).execute()
        logger.info(f"{total_usuarios} usuários deletados do tenet {tenet_id}")
        
        # 2. Deletar mensagens das conversas do tenet
        conversas = supabase.table("conversas").select("id").eq("tenet_id", tenet_id).execute()
        if conversas.data:
            conversa_ids = [c["id"] for c in conversas.data]
            for cid in conversa_ids:
                supabase.table("mensagens").delete().eq("conversa_id", cid).execute()
            logger.info(f"Mensagens deletadas de {len(conversa_ids)} conversas")
        
        # 3. Deletar conversas do tenet
        supabase.table("conversas").delete().eq("tenet_id", tenet_id).execute()
        logger.info(f"Conversas deletadas do tenet {tenet_id}")
        
        # 4. Deletar notificações do tenet
        try:
            supabase.table("notificacoes_config").delete().eq("tenet_id", tenet_id).execute()
        except:
            pass
        
        # 5. Deletar integrações CRM
        try:
            supabase.table("integracoes_crm").delete().eq("tenet_id", tenet_id).execute()
        except:
            pass
        
        # 6. Finalmente deletar o tenet
        response = supabase.table("tenets").delete().eq("id", tenet_id).execute()

        if response.data:
            logger.info(f"Tenet {nome_tenet} deletado com sucesso")
            return {
                "success": True, 
                "message": f"Tenet '{nome_tenet}' deletado com sucesso",
                "usuarios_deletados": total_usuarios
            }

        raise HTTPException(status_code=500, detail="Erro ao deletar tenet")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar tenet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenets/{tenet_id}/usuarios")
@router.get("/agencias/{tenet_id}/usuarios")
async def list_tenet_users(
    tenet_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Lista usuários de um tenet específico."""
    logger.info(f"Super Admin {current_user['email']} listando usuários do tenet: {tenet_id}")

    supabase = get_supabase_client()

    try:
        response = supabase.table("usuarios").select(
            "id, email, nome, role, ativo, deve_alterar_senha, created_at"
        ).eq("tenet_id", tenet_id).order("created_at", desc=True).execute()

        return response.data or []
    except Exception as e:
        logger.error(f"Erro ao listar usuários do tenet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tenets/{tenet_id}")
@router.patch("/agencias/{tenet_id}")
async def update_tenet(
    tenet_id: str,
    request: Request,
    current_user: dict = Depends(require_super_admin)
):
    """Atualiza dados básicos de um tenet."""
    logger.info(f"Super Admin {current_user['email']} atualizando tenet: {tenet_id}")

    supabase = get_supabase_client()

    try:
        body = await request.json()

        # Campos permitidos para atualização
        allowed_fields = ["nome", "email", "instance_name", "whatsapp_phone_id", "nicho"]
        update_data = {k: v for k, v in body.items() if k in allowed_fields}

        if not update_data:
            raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar")

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        response = supabase.table("tenets").update(update_data).eq("id", tenet_id).execute()

        if response.data:
            return {"success": True, "tenet": response.data[0]}

        raise HTTPException(status_code=404, detail="Tenet não encontrado")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar tenet: {e}")
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
            "id, email, nome, tenet_id, role, ativo, created_at"
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

        # Verificar se tenet existe
        tenet = supabase.table("tenets").select("id").eq(
            "id", usuario.tenet_id
        ).execute()

        if not tenet.data:
            raise HTTPException(status_code=400, detail="Tenet não encontrado")

        # Hash da senha
        senha_hash = pwd_context.hash(usuario.password)

        # Criar usuário
        data = {
            "email": usuario.email,
            "senha_hash": senha_hash,
            "nome": usuario.nome,
            "tenet_id": usuario.tenet_id,
            "role": usuario.role,
            "ativo": True,
            "deve_alterar_senha": True,
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
    """Ativa ou desativa um usuário."""
    logger.info(f"Super Admin {current_user['email']} alterando status do usuário: {usuario_id}")

    supabase = get_supabase_client()

    try:
        # Buscar usuário atual
        usuario = supabase.table("usuarios").select("ativo, role").eq("id", usuario_id).execute()

        if not usuario.data:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Não permitir desativar super_admin
        if usuario.data[0].get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Não é permitido desativar um super admin")

        novo_status = not usuario.data[0]["ativo"]

        response = supabase.table("usuarios").update({
            "ativo": novo_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", usuario_id).execute()

        return {"success": True, "ativo": novo_status}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alterar status do usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/usuarios/{usuario_id}")
async def update_usuario(
    usuario_id: str,
    request: Request,
    current_user: dict = Depends(require_super_admin)
):
    """Atualiza dados de um usuário específico."""
    logger.info(f"Super Admin {current_user['email']} atualizando usuário: {usuario_id}")

    supabase = get_supabase_client()

    try:
        body = await request.json()

        # Campos permitidos para atualização
        allowed_fields = ["nome", "email", "role", "tenet_id"]
        update_data = {k: v for k, v in body.items() if k in allowed_fields and v is not None}

        # Se nova senha foi fornecida, fazer hash
        if body.get("nova_senha"):
            if len(body["nova_senha"]) < 6:
                raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")
            update_data["senha_hash"] = pwd_context.hash(body["nova_senha"])
            update_data["deve_alterar_senha"] = body.get("forcar_troca_senha", True)

        if not update_data:
            raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar")

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Verificar se usuário existe
        existing = supabase.table("usuarios").select("id, role").eq("id", usuario_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Não permitir alterar super_admin
        if existing.data[0].get("role") == "super_admin" and current_user["id"] != usuario_id:
            raise HTTPException(status_code=403, detail="Não é permitido alterar outro super admin")

        response = supabase.table("usuarios").update(update_data).eq("id", usuario_id).execute()

        if response.data:
            return {"success": True, "usuario": response.data[0]}

        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usuarios/{usuario_id}")
async def get_usuario(
    usuario_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Busca dados de um usuário específico."""
    supabase = get_supabase_client()

    try:
        response = supabase.table("usuarios").select(
            "id, email, nome, role, ativo, tenet_id, deve_alterar_senha, created_at"
        ).eq("id", usuario_id).execute()

        if response.data:
            return response.data[0]

        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar usuário: {e}")
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
