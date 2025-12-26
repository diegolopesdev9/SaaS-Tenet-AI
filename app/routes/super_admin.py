"""
Rotas de Super Admin para gerenciamento de agências e usuários.
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

class AgenciaCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr
    instance_name: str = Field(..., max_length=100)
    whatsapp_phone_id: Optional[str] = None
    prompt_config: Optional[str] = None
    admin_nome: str = Field(..., max_length=100)
    admin_email: EmailStr
    admin_senha: str = Field(..., min_length=6)
    nicho: str = Field(default="sdr", pattern="^(sdr|suporte|rh|vendas|custom)$")


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
async def list_all_agencies(current_user: dict = Depends(get_current_user)):
    """Lista todas as agências com métricas resumidas (apenas super_admin)."""

    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a super administradores")

    supabase = get_supabase_client()

    try:
        # Buscar agências
        response = supabase.table("agencias").select(
            "id, nome, email, created_at, instance_name, whatsapp_phone_id, nicho"
        ).order("nome").execute()

        agencias = response.data or []

        # Para cada agência, buscar contagem de usuários e conversas
        for agencia in agencias:
            # Contar usuários
            usuarios_response = supabase.table("usuarios").select(
                "id", count="exact"
            ).eq("agencia_id", agencia["id"]).execute()
            agencia["total_usuarios"] = usuarios_response.count or 0

            # Contar conversas
            conversas_response = supabase.table("conversas").select(
                "id", count="exact"
            ).eq("agencia_id", agencia["id"]).execute()
            agencia["total_conversas"] = conversas_response.count or 0

            # Contar qualificados
            qualificados_response = supabase.table("conversas").select(
                "id", count="exact"
            ).eq("agencia_id", agencia["id"]).eq("lead_status", "qualificado").execute()
            agencia["total_qualificados"] = qualificados_response.count or 0

        return agencias
    except Exception as e:
        logger.error(f"Erro ao listar agências: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/geral")
async def get_general_metrics(
    period: str = "7d",
    current_user: dict = Depends(require_super_admin)
):
    """Retorna métricas consolidadas de todas as agências (apenas super_admin)."""
    logger.info(f"Super Admin {current_user['email']} consultando métricas gerais")

    supabase = get_supabase_client()

    # Calcular data inicial baseado no período
    days_map = {"7d": 7, "15d": 15, "30d": 30, "90d": 90}
    days = days_map.get(period, 7)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    try:
        # Buscar todas as agências
        agencias_response = supabase.table("agencias").select("id, nome").execute()
        agencias = agencias_response.data or []

        # Buscar todas as conversas do período
        conversas_response = supabase.table("conversas").select(
            "id, agencia_id, lead_status, total_mensagens, created_at, last_message_at"
        ).gte("created_at", start_date.isoformat()).execute()

        conversas = conversas_response.data or []

        # Calcular métricas gerais
        total_leads = len(conversas)
        status_counts = {"iniciada": 0, "em_andamento": 0, "qualificado": 0, "perdido": 0, "agendado": 0}
        leads_by_day = {}
        leads_by_agency = {}
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

            # Agrupar por agência
            agencia_id = conv.get("agencia_id")
            if agencia_id:
                if agencia_id not in leads_by_agency:
                    leads_by_agency[agencia_id] = {"total": 0, "qualificado": 0}
                leads_by_agency[agencia_id]["total"] += 1
                if status == "qualificado":
                    leads_by_agency[agencia_id]["qualificado"] += 1

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

        # Formatar dados por agência
        agency_data = []
        for agencia in agencias:
            ag_id = agencia["id"]
            ag_stats = leads_by_agency.get(ag_id, {"total": 0, "qualificado": 0})
            agency_data.append({
                "id": ag_id,
                "nome": agencia["nome"],
                "total": ag_stats["total"],
                "qualificado": ag_stats["qualificado"],
                "taxa": round(ag_stats["qualificado"] / max(ag_stats["total"], 1) * 100, 1)
            })

        # Ordenar por total de leads
        agency_data.sort(key=lambda x: x["total"], reverse=True)

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
            "total_agencias": len(agencias),
            "chart_data": chart_data,
            "funnel_data": funnel_data,
            "status_breakdown": status_counts,
            "avg_conversation_hours": avg_response_time,
            "conversion_rate": round(status_counts["qualificado"] / max(total_leads, 1) * 100, 1),
            "agency_breakdown": agency_data
        }

    except Exception as e:
        logger.error(f"Erro ao calcular métricas gerais: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agencias")
async def create_agencia(
    agencia: AgenciaCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Cria nova agência com usuário admin."""
    logger.info(f"Super Admin {current_user['email']} criando agência: {agencia.nome}")

    supabase = get_supabase_client()

    try:
        # Verificar se instance_name já existe
        existing = supabase.table("agencias").select("id").eq(
            "instance_name", agencia.instance_name
        ).execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Instance name já existe")

        # Verificar se email do admin já existe
        existing_user = supabase.table("usuarios").select("id").eq(
            "email", agencia.admin_email
        ).execute()

        if existing_user.data:
            raise HTTPException(status_code=400, detail="Email do administrador já cadastrado")

        # Criar agência
        agencia_data = {
            "nome": agencia.nome,
            "email": agencia.email,
            "instance_name": agencia.instance_name,
            "whatsapp_phone_id": agencia.whatsapp_phone_id,
            "prompt_config": agencia.prompt_config,
            "nicho": agencia.nicho,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        agencia_response = supabase.table("agencias").insert(agencia_data).execute()

        if not agencia_response.data:
            raise HTTPException(status_code=500, detail="Erro ao criar agência")

        agencia_id = agencia_response.data[0]['id']
        logger.info(f"Agência criada: {agencia_id}")

        # Criar usuário admin para a agência
        senha_hash = pwd_context.hash(agencia.admin_senha)

        usuario_data = {
            "email": agencia.admin_email,
            "senha_hash": senha_hash,
            "nome": agencia.admin_nome,
            "agencia_id": agencia_id,
            "role": "admin",
            "ativo": True,
            "deve_alterar_senha": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        usuario_response = supabase.table("usuarios").insert(usuario_data).execute()

        if not usuario_response.data:
            # Se falhar ao criar usuário, deletar a agência criada
            supabase.table("agencias").delete().eq("id", agencia_id).execute()
            raise HTTPException(status_code=500, detail="Erro ao criar usuário admin")

        logger.info(f"Usuário admin criado: {usuario_response.data[0]['id']}")

        return {
            "success": True,
            "agencia": agencia_response.data[0],
            "usuario": {
                "id": usuario_response.data[0]["id"],
                "email": usuario_response.data[0]["email"],
                "nome": usuario_response.data[0]["nome"]
            }
        }

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
    """Deleta uma agência e todos os dados relacionados."""
    logger.info(f"Super Admin {current_user['email']} deletando agência: {agencia_id}")

    supabase = get_supabase_client()

    try:
        # Verificar se agência existe
        agencia = supabase.table("agencias").select("id, nome").eq("id", agencia_id).execute()

        if not agencia.data:
            raise HTTPException(status_code=404, detail="Agência não encontrada")

        nome_agencia = agencia.data[0].get("nome", "")

        # 1. Desvincular usuários da agência (não deletar, apenas desvincular)
        supabase.table("usuarios").update({
            "agencia_id": None
        }).eq("agencia_id", agencia_id).execute()
        logger.info(f"Usuários desvinculados da agência {agencia_id}")

        # 2. Deletar mensagens das conversas da agência
        conversas = supabase.table("conversas").select("id").eq("agencia_id", agencia_id).execute()
        if conversas.data:
            conversa_ids = [c["id"] for c in conversas.data]
            for cid in conversa_ids:
                supabase.table("mensagens").delete().eq("conversa_id", cid).execute()
            logger.info(f"Mensagens deletadas de {len(conversa_ids)} conversas")

        # 3. Deletar conversas da agência
        supabase.table("conversas").delete().eq("agencia_id", agencia_id).execute()
        logger.info(f"Conversas deletadas da agência {agencia_id}")

        # 4. Deletar notificações da agência (se existir)
        try:
            supabase.table("notificacoes_config").delete().eq("agencia_id", agencia_id).execute()
        except:
            pass

        # 5. Deletar integrações CRM (se existir)
        try:
            supabase.table("integracoes_crm").delete().eq("agencia_id", agencia_id).execute()
        except:
            pass

        # 6. Finalmente deletar a agência
        response = supabase.table("agencias").delete().eq("id", agencia_id).execute()

        if response.data:
            logger.info(f"Agência {nome_agencia} deletada com sucesso")
            return {"success": True, "message": f"Agência '{nome_agencia}' deletada com sucesso"}

        raise HTTPException(status_code=500, detail="Erro ao deletar agência")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar agência: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agencias/{agencia_id}/usuarios")
async def list_agency_users(
    agencia_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Lista usuários de uma agência específica."""
    logger.info(f"Super Admin {current_user['email']} listando usuários da agência: {agencia_id}")

    supabase = get_supabase_client()

    try:
        response = supabase.table("usuarios").select(
            "id, email, nome, role, ativo, deve_alterar_senha, created_at"
        ).eq("agencia_id", agencia_id).order("created_at", desc=True).execute()

        return response.data or []
    except Exception as e:
        logger.error(f"Erro ao listar usuários da agência: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/agencias/{agencia_id}")
async def update_agencia(
    agencia_id: str,
    request: Request,
    current_user: dict = Depends(require_super_admin)
):
    """Atualiza dados básicos de uma agência."""
    logger.info(f"Super Admin {current_user['email']} atualizando agência: {agencia_id}")

    supabase = get_supabase_client()

    try:
        body = await request.json()

        # Campos permitidos para atualização
        allowed_fields = ["nome", "email", "instance_name", "whatsapp_phone_id", "nicho"]
        update_data = {k: v for k, v in body.items() if k in allowed_fields}

        if not update_data:
            raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar")

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        response = supabase.table("agencias").update(update_data).eq("id", agencia_id).execute()

        if response.data:
            return {"success": True, "agencia": response.data[0]}

        raise HTTPException(status_code=404, detail="Agência não encontrada")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar agência: {e}")
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
        allowed_fields = ["nome", "email", "role", "agencia_id"]
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
            "id, email, nome, role, ativo, agencia_id, deve_alterar_senha, created_at"
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