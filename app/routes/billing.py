
"""
Rotas para billing e uso de tokens.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.routes.auth import get_current_user
from app.services.token_tracking_service import TokenTrackingService
from app.database import get_supabase_client

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)):
    """Retorna uso de tokens do período atual."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    tracking = TokenTrackingService(get_supabase_client())
    usage = await tracking.get_current_period_usage(tenet_id)
    
    if "error" in usage:
        raise HTTPException(status_code=500, detail=usage["error"])
    
    return usage


@router.get("/usage/history")
async def get_usage_history(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Retorna histórico de uso dos últimos N dias."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    if days > 90:
        days = 90
    
    tracking = TokenTrackingService(get_supabase_client())
    return await tracking.get_usage_summary(tenet_id, days)


@router.get("/usage/check")
async def check_usage_limit(current_user: dict = Depends(get_current_user)):
    """Verifica se pode continuar usando."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    tracking = TokenTrackingService(get_supabase_client())
    return await tracking.check_can_use(tenet_id)


@router.get("/plans")
async def get_plans():
    """Retorna planos disponíveis."""
    supabase = get_supabase_client()
    result = supabase.table("plans").select("*").eq("is_active", True).order("price_cents").execute()
    return {"plans": result.data or []}


@router.get("/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Retorna subscription atual do tenant."""
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    supabase = get_supabase_client()
    result = supabase.table("subscriptions").select("*, plans(*)").eq(
        "tenet_id", tenet_id
    ).execute()
    
    if not result.data:
        return {"subscription": None, "message": "Nenhuma assinatura ativa"}
    
    return {"subscription": result.data[0]}
