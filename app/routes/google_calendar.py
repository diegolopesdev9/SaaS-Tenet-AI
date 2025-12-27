
"""
Rotas para integração com Google Calendar.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
from app.routes.auth import get_current_user
from app.services.google_calendar_service import google_calendar_service
from app.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["Google Calendar"])


# ========================================
# MODELOS PYDANTIC (ANTES DAS ROTAS)
# ========================================

class CreateEventRequest(BaseModel):
    summary: str
    start_time: datetime
    end_time: datetime
    description: Optional[str] = ""
    attendees: Optional[List[str]] = []
    location: Optional[str] = ""


# ========================================
# ROTAS (DEPOIS DOS MODELOS)
# ========================================

@router.get("/auth/url")
async def get_auth_url(current_user: dict = Depends(get_current_user)):
    """Retorna URL de autorização do Google."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    from app.config import settings
    
    # Debug: logar valores das variáveis
    logger.info(f"=== DEBUG GOOGLE CALENDAR ===")
    logger.info(f"GOOGLE_CLIENT_ID existe: {bool(settings.GOOGLE_CLIENT_ID)}")
    logger.info(f"GOOGLE_CLIENT_ID primeiros chars: {settings.GOOGLE_CLIENT_ID[:20] if settings.GOOGLE_CLIENT_ID else 'VAZIO'}")
    logger.info(f"GOOGLE_CLIENT_SECRET existe: {bool(settings.GOOGLE_CLIENT_SECRET)}")
    logger.info(f"GOOGLE_REDIRECT_URI: {settings.GOOGLE_REDIRECT_URI}")
    logger.info(f"============================")
    
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400, 
            detail=f"Credenciais do Google não configuradas. CLIENT_ID={bool(settings.GOOGLE_CLIENT_ID)}, SECRET={bool(settings.GOOGLE_CLIENT_SECRET)}"
        )
    
    try:
        auth_url = google_calendar_service.get_authorization_url(tenet_id)
        return {"auth_url": auth_url}
    except ValueError as e:
        logger.error(f"ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao gerar URL de auth: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar URL: {str(e)}")


@router.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Callback do OAuth2 do Google."""
    try:
        result = await google_calendar_service.handle_callback(code, state)
        
        if result.get("success"):
            # Redirecionar para página de sucesso no frontend
            return RedirectResponse(url="/config?calendar=connected")
        else:
            return RedirectResponse(url=f"/config?calendar=error&message={result.get('error')}")
            
    except Exception as e:
        logger.error(f"Erro no callback: {e}")
        return RedirectResponse(url=f"/config?calendar=error&message={str(e)}")


@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """Retorna status da integração com Google Calendar."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    from app.config import settings
    
    # Se credenciais não configuradas, retornar não conectado (sem erro)
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.warning("Google Calendar: credenciais não configuradas")
        return {"connected": False, "reason": "credentials_not_configured"}
    
    try:
        supabase = get_supabase_client()
        result = supabase.table("google_calendar_integrations").select(
            "google_email, is_active, created_at, updated_at"
        ).eq("tenet_id", tenet_id).execute()
        
        if result.data and result.data[0].get("is_active"):
            return {
                "connected": True,
                "email": result.data[0].get("google_email"),
                "connected_at": result.data[0].get("created_at")
            }
        
        return {"connected": False}
        
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        return {"connected": False, "error": str(e)}


@router.post("/disconnect")
async def disconnect_calendar(current_user: dict = Depends(get_current_user)):
    """Desconecta integração com Google Calendar."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        result = await google_calendar_service.disconnect(tenet_id)
        
        if result.get("success"):
            return {"success": True, "message": "Google Calendar desconectado"}
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao desconectar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events")
async def create_event(
    request: CreateEventRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um evento no Google Calendar."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        result = await google_calendar_service.create_event(
            tenet_id=tenet_id,
            summary=request.summary,
            start_time=request.start_time,
            end_time=request.end_time,
            description=request.description,
            attendees=request.attendees,
            location=request.location
        )
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar evento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-slots")
async def get_available_slots(
    date: str = Query(..., description="Data no formato YYYY-MM-DD"),
    duration: int = Query(60, description="Duração em minutos"),
    current_user: dict = Depends(get_current_user)
):
    """Retorna horários disponíveis para agendamento."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d")
        slots = await google_calendar_service.get_available_slots(
            tenet_id=tenet_id,
            date=date_obj,
            duration_minutes=duration
        )
        
        return {"date": date, "slots": slots}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use formato YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Erro ao buscar slots: {e}")
        raise HTTPException(status_code=500, detail=str(e))
