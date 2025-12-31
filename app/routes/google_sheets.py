
"""
Rotas para integração com Google Sheets.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.routes.auth import get_current_user
from app.services.google_sheets_service import GoogleSheetsService

router = APIRouter(prefix="/api/google-sheets", tags=["Google Sheets"])


class ConnectSpreadsheetRequest(BaseModel):
    spreadsheet_url: str


@router.get("/status")
async def get_sheets_status(current_user: dict = Depends(get_current_user)):
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    service = GoogleSheetsService()
    return await service.get_status(tenet_id)


@router.post("/create")
async def create_spreadsheet(current_user: dict = Depends(get_current_user)):
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    from app.database import get_supabase_client
    supabase = get_supabase_client()
    tenet = supabase.table("tenets").select("nome").eq("id", tenet_id).execute()
    tenet_name = tenet.data[0]["nome"] if tenet.data else "Minha Empresa"
    
    service = GoogleSheetsService()
    result = await service.create_leads_spreadsheet(tenet_id, tenet_name)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/connect")
async def connect_spreadsheet(
    request: ConnectSpreadsheetRequest,
    current_user: dict = Depends(get_current_user)
):
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    service = GoogleSheetsService()
    result = await service.connect_existing_spreadsheet(tenet_id, request.spreadsheet_url)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/disconnect")
async def disconnect_spreadsheet(current_user: dict = Depends(get_current_user)):
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    service = GoogleSheetsService()
    result = await service.disconnect(tenet_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/test")
async def test_add_lead(current_user: dict = Depends(get_current_user)):
    tenet_id = current_user.get("tenet_id")
    if not tenet_id:
        raise HTTPException(status_code=400, detail="Usuário não vinculado a um Tenet")
    
    service = GoogleSheetsService()
    
    test_lead = {
        "nome": "Lead de Teste",
        "telefone": "+5511999999999",
        "email": "teste@exemplo.com",
        "empresa": "Empresa Teste",
        "status": "Teste",
        "score": "100",
        "origem": "WhatsApp",
        "observacoes": "Lead criado para testar integração"
    }
    
    result = await service.add_lead(tenet_id, test_lead)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
