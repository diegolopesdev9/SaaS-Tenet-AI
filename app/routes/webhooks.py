
"""Webhook endpoints for external integrations."""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/webhooks")


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    WhatsApp webhook endpoint.
    
    Args:
        request: Incoming webhook request
        
    Returns:
        Acknowledgment response
    """
    # TODO: Implement WhatsApp webhook processing logic
    return {"status": 200, "message": "WhatsApp webhook received"}


@router.post("/rdstation")
async def rdstation_webhook(request: Request):
    """
    RD Station webhook endpoint.
    
    Args:
        request: Incoming webhook request
        
    Returns:
        Acknowledgment response
    """
    # TODO: Implement RD Station webhook processing logic
    return {"status": 200, "message": "RD Station webhook received"}
