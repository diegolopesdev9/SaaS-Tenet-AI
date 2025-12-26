
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
from app.utils.security import EncryptionService
from app.services.google_calendar_service import google_calendar_service
from app.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["Google Calendar"])


class CreateEventRequest(BaseModel):
    summary: str
    start_time: datetime
    end_time: datetime


@router.post("/credentials")
async def save_google_credentials(
    credentials: GoogleCredentialsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Salva credenciais do Google para o Tenet."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        encryption = EncryptionService()
        
        supabase = get_supabase_client()
        
        data = {
            "tenet_id": tenet_id,
            "google_client_id_encrypted": encryption.encrypt(credentials.client_id),
            "google_client_secret_encrypted": encryption.encrypt(credentials.client_secret),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert
        existing = supabase.table("google_calendar_integrations").select("id").eq("tenet_id", tenet_id).execute()
        
        if existing.data:
            supabase.table("google_calendar_integrations").update(data).eq("tenet_id", tenet_id).execute()
        else:
            data["created_at"] = datetime.utcnow().isoformat()
            supabase.table("google_calendar_integrations").insert(data).execute()
        
        return {"success": True, "message": "Credenciais salvas com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao salvar credenciais: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credentials/status")
async def get_credentials_status(current_user: dict = Depends(get_current_user)):
    """Verifica se as credenciais do Google estão configuradas."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        supabase = get_supabase_client()
        result = supabase.table("google_calendar_integrations").select(
            "google_client_id_encrypted"
        ).eq("tenet_id", tenet_id).execute()
        
        has_credentials = bool(result.data and result.data[0].get("google_client_id_encrypted"))
        
        return {"configured": has_credentials}
        
    except Exception as e:
        logger.error(f"Erro ao verificar credenciais: {e}")
        raise HTTPException(status_code=500, detail=str(e))


    description: Optional[str] = ""
    attendees: Optional[List[str]] = []
    location: Optional[str] = ""


class GoogleCredentialsUpdate(BaseModel):
    client_id: str
    client_secret: str


@router.get("/auth/url")
async def get_auth_url(current_user: dict = Depends(get_current_user)):
    """Retorna URL de autorização do Google."""
    tenet_id = current_user.get("agencia_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    try:
        result = await google_calendar_service.get_authorization_url(tenet_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Erro ao gerar URL"))
        
        return {"auth_url": result.get("auth_url")}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar URL de auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
