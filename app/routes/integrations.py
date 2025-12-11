
"""
Rotas para gerenciamento de integrações CRM.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.database import get_supabase_client
from app.services.crm_service import CRMService
from app.routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


# ============================================
# SCHEMAS
# ============================================

class IntegrationCreate(BaseModel):
    crm_type: str = Field(..., pattern="^(rdstation|pipedrive|notion|moskit|zoho)$")
    api_key: Optional[str] = None
    api_token: Optional[str] = None
    database_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    extra_config: Optional[dict] = None
    is_active: bool = True


class IntegrationResponse(BaseModel):
    id: str
    crm_type: str
    is_active: bool
    has_api_key: bool
    has_api_token: bool
    database_id: Optional[str]
    pipeline_id: Optional[str]
    created_at: Optional[str]


# ============================================
# ROTAS
# ============================================

@router.get("/{agencia_id}")
async def list_integrations(
    agencia_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lista todas as integrações de uma agência."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("integracoes_crm").select(
            "id, crm_type, is_active, api_key_encrypted, api_token_encrypted, database_id, pipeline_id, created_at"
        ).eq("agencia_id", agencia_id).execute()
        
        # Formatar resposta (não expor tokens)
        integrations = []
        for item in response.data or []:
            integrations.append({
                "id": item.get("id"),
                "crm_type": item.get("crm_type"),
                "is_active": item.get("is_active"),
                "has_api_key": bool(item.get("api_key_encrypted")),
                "has_api_token": bool(item.get("api_token_encrypted")),
                "database_id": item.get("database_id"),
                "pipeline_id": item.get("pipeline_id"),
                "created_at": item.get("created_at")
            })
        
        return integrations
        
    except Exception as e:
        logger.error(f"Erro ao listar integrações: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agencia_id}")
async def save_integration(
    agencia_id: str,
    integration: IntegrationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Salva ou atualiza uma integração."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    crm_service = CRMService(supabase)
    
    result = await crm_service.save_integration(
        agencia_id=agencia_id,
        crm_type=integration.crm_type,
        api_key=integration.api_key,
        api_token=integration.api_token,
        database_id=integration.database_id,
        pipeline_id=integration.pipeline_id,
        extra_config=integration.extra_config,
        is_active=integration.is_active
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {"success": True, "message": f"Integração {integration.crm_type} salva com sucesso"}


@router.post("/{agencia_id}/test/{crm_type}")
async def test_integration(
    agencia_id: str,
    crm_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Testa conexão com um CRM."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    crm_service = CRMService(supabase)
    
    is_connected = await crm_service.test_integration(agencia_id, crm_type)
    
    return {
        "success": is_connected,
        "message": "Conexão estabelecida com sucesso" if is_connected else "Falha na conexão"
    }


@router.delete("/{agencia_id}/{crm_type}")
async def delete_integration(
    agencia_id: str,
    crm_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove uma integração."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("integracoes_crm").delete().eq(
            "agencia_id", agencia_id
        ).eq("crm_type", crm_type).execute()
        
        return {"success": True, "message": f"Integração {crm_type} removida"}
        
    except Exception as e:
        logger.error(f"Erro ao remover integração: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{agencia_id}/{crm_type}/toggle")
async def toggle_integration(
    agencia_id: str,
    crm_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Ativa/desativa uma integração."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    
    try:
        # Buscar status atual
        current = supabase.table("integracoes_crm").select("is_active").eq(
            "agencia_id", agencia_id
        ).eq("crm_type", crm_type).execute()
        
        if not current.data:
            raise HTTPException(status_code=404, detail="Integração não encontrada")
        
        new_status = not current.data[0].get("is_active")
        
        # Atualizar
        supabase.table("integracoes_crm").update({
            "is_active": new_status
        }).eq("agencia_id", agencia_id).eq("crm_type", crm_type).execute()
        
        return {"success": True, "is_active": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alternar integração: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agencia_id}/logs")
async def get_sync_logs(
    agencia_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Lista logs de sincronização com CRMs."""
    
    # Verificar permissão
    if current_user.get("role") != "super_admin" and current_user.get("agencia_id") != agencia_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("crm_sync_logs").select(
            "id, crm_type, lead_phone, status, error_message, created_at"
        ).eq("agencia_id", agencia_id).order("created_at", desc=True).limit(limit).execute()
        
        return response.data or []
        
    except Exception as e:
        logger.error(f"Erro ao buscar logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
