
"""
Serviço de integração com Google Sheets.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Optional
import gspread
from google.oauth2.credentials import Credentials
from app.database import get_supabase_client

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]


class GoogleSheetsService:
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def _get_credentials(self, tenet_id: str) -> Optional[Credentials]:
        try:
            result = self.supabase.table("tenets").select(
                "google_tokens"
            ).eq("id", tenet_id).execute()
            
            if not result.data or not result.data[0].get("google_tokens"):
                return None
            
            tokens = result.data[0]["google_tokens"]
            
            credentials = Credentials(
                token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                scopes=SCOPES
            )
            
            return credentials
            
        except Exception as e:
            logger.error(f"Erro ao obter credenciais: {e}")
            return None
    
    def _get_client(self, tenet_id: str) -> Optional[gspread.Client]:
        credentials = self._get_credentials(tenet_id)
        if not credentials:
            return None
        
        try:
            client = gspread.authorize(credentials)
            return client
        except Exception as e:
            logger.error(f"Erro ao autorizar gspread: {e}")
            return None
    
    async def create_leads_spreadsheet(self, tenet_id: str, tenet_name: str) -> Dict:
        try:
            client = self._get_client(tenet_id)
            if not client:
                return {"error": "Google não conectado. Conecte primeiro pelo Google Calendar."}
            
            spreadsheet_name = f"Leads - {tenet_name} - TENET AI"
            spreadsheet = client.create(spreadsheet_name)
            
            worksheet = spreadsheet.sheet1
            worksheet.update_title("Leads")
            
            headers = [
                "Data/Hora",
                "Nome",
                "Telefone", 
                "Email",
                "Empresa",
                "Status",
                "Score",
                "Origem",
                "Observações"
            ]
            worksheet.append_row(headers)
            
            worksheet.format('A1:I1', {
                'backgroundColor': {'red': 0.2, 'green': 0.4, 'blue': 0.8},
                'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
                'horizontalAlignment': 'CENTER'
            })
            
            worksheet.freeze(rows=1)
            
            self.supabase.table("tenets").update({
                "google_sheets_id": spreadsheet.id,
                "google_sheets_url": spreadsheet.url,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", tenet_id).execute()
            
            logger.info(f"Planilha criada para tenet {tenet_id}: {spreadsheet.id}")
            
            return {
                "success": True,
                "spreadsheet_id": spreadsheet.id,
                "spreadsheet_url": spreadsheet.url,
                "message": "Planilha criada com sucesso!"
            }
            
        except Exception as e:
            logger.error(f"Erro ao criar planilha: {e}")
            return {"error": str(e)}
    
    async def connect_existing_spreadsheet(self, tenet_id: str, spreadsheet_url: str) -> Dict:
        try:
            client = self._get_client(tenet_id)
            if not client:
                return {"error": "Google não conectado. Conecte primeiro pelo Google Calendar."}
            
            spreadsheet = client.open_by_url(spreadsheet_url)
            
            self.supabase.table("tenets").update({
                "google_sheets_id": spreadsheet.id,
                "google_sheets_url": spreadsheet_url,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", tenet_id).execute()
            
            return {
                "success": True,
                "spreadsheet_id": spreadsheet.id,
                "spreadsheet_url": spreadsheet_url,
                "message": "Planilha conectada com sucesso!"
            }
            
        except gspread.SpreadsheetNotFound:
            return {"error": "Planilha não encontrada. Verifique a URL."}
        except gspread.exceptions.NoValidUrlKeyFound:
            return {"error": "URL inválida. Use o link completo da planilha."}
        except Exception as e:
            logger.error(f"Erro ao conectar planilha: {e}")
            return {"error": str(e)}
    
    async def add_lead(self, tenet_id: str, lead_data: Dict) -> Dict:
        try:
            result = self.supabase.table("tenets").select(
                "google_sheets_id"
            ).eq("id", tenet_id).execute()
            
            if not result.data or not result.data[0].get("google_sheets_id"):
                logger.debug(f"Tenet {tenet_id} não tem planilha configurada")
                return {"skipped": True, "reason": "no_spreadsheet"}
            
            spreadsheet_id = result.data[0]["google_sheets_id"]
            
            client = self._get_client(tenet_id)
            if not client:
                return {"error": "Credenciais Google inválidas"}
            
            spreadsheet = client.open_by_key(spreadsheet_id)
            worksheet = spreadsheet.sheet1
            
            row = [
                datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
                lead_data.get("nome", ""),
                lead_data.get("telefone", ""),
                lead_data.get("email", ""),
                lead_data.get("empresa", ""),
                lead_data.get("status", "Novo"),
                lead_data.get("score", ""),
                lead_data.get("origem", "WhatsApp"),
                lead_data.get("observacoes", "")
            ]
            
            worksheet.append_row(row)
            
            logger.info(f"Lead adicionado à planilha do tenet {tenet_id}")
            
            return {"success": True, "message": "Lead adicionado à planilha"}
            
        except Exception as e:
            logger.error(f"Erro ao adicionar lead na planilha: {e}")
            return {"error": str(e)}
    
    async def disconnect(self, tenet_id: str) -> Dict:
        try:
            self.supabase.table("tenets").update({
                "google_sheets_id": None,
                "google_sheets_url": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", tenet_id).execute()
            
            return {"success": True, "message": "Planilha desconectada"}
            
        except Exception as e:
            logger.error(f"Erro ao desconectar planilha: {e}")
            return {"error": str(e)}
    
    async def get_status(self, tenet_id: str) -> Dict:
        try:
            result = self.supabase.table("tenets").select(
                "google_sheets_id, google_sheets_url, google_tokens"
            ).eq("id", tenet_id).execute()
            
            if not result.data:
                return {"connected": False, "google_connected": False}
            
            data = result.data[0]
            
            return {
                "connected": bool(data.get("google_sheets_id")),
                "spreadsheet_id": data.get("google_sheets_id"),
                "spreadsheet_url": data.get("google_sheets_url"),
                "google_connected": bool(data.get("google_tokens"))
            }
            
        except Exception as e:
            logger.error(f"Erro ao verificar status: {e}")
            return {"error": str(e)}
