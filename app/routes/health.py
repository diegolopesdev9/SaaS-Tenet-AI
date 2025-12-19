
"""Health check endpoint."""
from fastapi import APIRouter, HTTPException
from app.database import health_check

router = APIRouter()


@router.get("/health")
async def health():
    """
    Health check endpoint.
    
    Returns:
        JSON with service status and database connectivity
    """
    db_status = await health_check()
    
    return {
        "status": "ok",
        "service": "SDR Agent SaaS",
        "database": "connected" if db_status else "disconnected"
    }


@router.get("/sentry-test")
async def test_sentry():
    """
    Endpoint para testar integração com Sentry.
    Apenas disponível em desenvolvimento.
    """
    import os
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    # Dispara erro de teste
    try:
        division_by_zero = 1 / 0
    except Exception as e:
        import sentry_sdk
        sentry_sdk.capture_exception(e)
        return {"status": "error_sent", "message": "Erro de teste enviado ao Sentry"}
    
    return {"status": "ok"}
