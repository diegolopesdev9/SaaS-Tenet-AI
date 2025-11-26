
"""Health check endpoint."""
from fastapi import APIRouter
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
