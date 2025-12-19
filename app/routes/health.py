
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


@router.get("/health/detailed")
async def detailed_health_check():
    """
    Health check detalhado com status de todos os serviços.
    Útil para monitoramento externo (UptimeRobot, Pingdom, etc.)
    """
    from datetime import datetime
    import os
    
    checks = {
        "api": {"status": "healthy", "latency_ms": 0},
        "database": {"status": "unknown", "latency_ms": 0},
        "ai_service": {"status": "unknown", "latency_ms": 0},
    }
    
    overall_status = "healthy"
    
    # Check Database
    try:
        import time
        start = time.time()
        db_ok = await health_check()
        checks["database"]["latency_ms"] = round((time.time() - start) * 1000, 2)
        checks["database"]["status"] = "healthy" if db_ok else "unhealthy"
    except Exception as e:
        checks["database"]["status"] = "unhealthy"
        checks["database"]["error"] = str(e)
        overall_status = "degraded"
    
    # Check AI Service (Gemini)
    try:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key and len(gemini_key) > 10:
            checks["ai_service"]["status"] = "configured"
        else:
            checks["ai_service"]["status"] = "not_configured"
    except:
        checks["ai_service"]["status"] = "error"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "2.0.0",
        "service": "Tenet AI",
        "checks": checks
    }
