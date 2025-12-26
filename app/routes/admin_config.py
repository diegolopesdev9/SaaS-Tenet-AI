
"""
Rotas para configuração do admin do Tenet.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.routes.auth import get_current_user
from app.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin-config", tags=["Admin Config"])


class AdminConfigUpdate(BaseModel):
    admin_name: Optional[str] = None
    admin_whatsapp_number: Optional[str] = None


class ReportsConfigUpdate(BaseModel):
    daily_report_enabled: Optional[bool] = None
    daily_report_time: Optional[str] = None  # "HH:MM"
    weekly_report_enabled: Optional[bool] = None
    weekly_report_day: Optional[int] = None  # 0=Dom, 1=Seg...
    weekly_report_time: Optional[str] = None


@router.get("/")
async def get_admin_config(current_user: dict = Depends(get_current_user)):
    """Retorna configuração do admin do Tenet."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        supabase = get_supabase_client()
        
        # Buscar config do tenet
        tenet_result = supabase.table("tenets").select(
            "admin_name, admin_whatsapp_number"
        ).eq("id", tenet_id).execute()
        
        # Buscar config de relatórios
        reports_result = supabase.table("admin_reports_config").select("*").eq("tenet_id", tenet_id).execute()
        
        tenet_config = tenet_result.data[0] if tenet_result.data else {}
        reports_config = reports_result.data[0] if reports_result.data else {
            "daily_report_enabled": True,
            "daily_report_time": "08:00",
            "weekly_report_enabled": True,
            "weekly_report_day": 1,
            "weekly_report_time": "09:00"
        }
        
        return {
            "admin_name": tenet_config.get("admin_name"),
            "admin_whatsapp_number": tenet_config.get("admin_whatsapp_number"),
            "reports": reports_config
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def update_admin_config(
    config: AdminConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza configuração do admin do Tenet."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        supabase = get_supabase_client()
        
        update_data = {}
        if config.admin_name is not None:
            update_data["admin_name"] = config.admin_name
        if config.admin_whatsapp_number is not None:
            # Normalizar número
            number = ''.join(filter(str.isdigit, config.admin_whatsapp_number))
            if not number.startswith('55'):
                number = '55' + number
            update_data["admin_whatsapp_number"] = number
        
        if update_data:
            supabase.table("tenets").update(update_data).eq("id", tenet_id).execute()
        
        return {"success": True, "message": "Configuração atualizada"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports")
async def update_reports_config(
    config: ReportsConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza configuração de relatórios automáticos."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        supabase = get_supabase_client()
        
        update_data = {"tenet_id": tenet_id}
        if config.daily_report_enabled is not None:
            update_data["daily_report_enabled"] = config.daily_report_enabled
        if config.daily_report_time is not None:
            update_data["daily_report_time"] = config.daily_report_time
        if config.weekly_report_enabled is not None:
            update_data["weekly_report_enabled"] = config.weekly_report_enabled
        if config.weekly_report_day is not None:
            update_data["weekly_report_day"] = config.weekly_report_day
        if config.weekly_report_time is not None:
            update_data["weekly_report_time"] = config.weekly_report_time
        
        # Upsert
        existing = supabase.table("admin_reports_config").select("id").eq("tenet_id", tenet_id).execute()
        
        if existing.data:
            supabase.table("admin_reports_config").update(update_data).eq("tenet_id", tenet_id).execute()
        else:
            supabase.table("admin_reports_config").insert(update_data).execute()
        
        return {"success": True, "message": "Configuração de relatórios atualizada"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar config relatórios: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-report")
async def send_test_report(current_user: dict = Depends(get_current_user)):
    """Envia relatório de teste para o admin."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        from app.services.admin_whatsapp_service import admin_whatsapp_service
        
        success = await admin_whatsapp_service.send_daily_report(tenet_id)
        
        if success:
            return {"success": True, "message": "Relatório enviado para o admin"}
        else:
            raise HTTPException(status_code=400, detail="Erro ao enviar. Verifique se o número do admin está configurado.")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar teste: {e}")
        raise HTTPException(status_code=500, detail=str(e))
