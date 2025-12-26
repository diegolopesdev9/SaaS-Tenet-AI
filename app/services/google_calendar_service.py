
"""
Serviço de integração com Google Calendar.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from app.database import get_supabase_client
from app.utils.security import EncryptionService
from app.config import settings

logger = logging.getLogger(__name__)

# Escopos necessários
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]

class GoogleCalendarService:
    def __init__(self):
        self.encryption = EncryptionService()
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    def get_authorization_url(self, tenet_id: str) -> str:
        """Gera URL de autorização OAuth2."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=tenet_id,
            prompt='consent'
        )
        
        return authorization_url
    
    async def handle_callback(self, code: str, tenet_id: str) -> Dict:
        """Processa callback do OAuth2 e salva tokens."""
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=SCOPES
            )
            flow.redirect_uri = self.redirect_uri
            flow.fetch_token(code=code)
            
            credentials = flow.credentials
            
            # Obter email da conta Google
            service = build('calendar', 'v3', credentials=credentials)
            calendar = service.calendars().get(calendarId='primary').execute()
            google_email = calendar.get('id', '')
            
            # Encriptar tokens
            access_token_encrypted = self.encryption.encrypt(credentials.token)
            refresh_token_encrypted = self.encryption.encrypt(credentials.refresh_token) if credentials.refresh_token else None
            
            # Salvar no banco
            supabase = get_supabase_client()
            
            data = {
                "tenet_id": tenet_id,
                "google_email": google_email,
                "access_token_encrypted": access_token_encrypted,
                "refresh_token_encrypted": refresh_token_encrypted,
                "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Upsert
            existing = supabase.table("google_calendar_integrations").select("id").eq("tenet_id", tenet_id).execute()
            
            if existing.data:
                supabase.table("google_calendar_integrations").update(data).eq("tenet_id", tenet_id).execute()
            else:
                data["created_at"] = datetime.utcnow().isoformat()
                supabase.table("google_calendar_integrations").insert(data).execute()
            
            return {"success": True, "email": google_email}
            
        except Exception as e:
            logger.error(f"Erro no callback OAuth: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_credentials(self, tenet_id: str) -> Optional[Credentials]:
        """Obtém credenciais válidas para um tenet."""
        supabase = get_supabase_client()
        
        result = supabase.table("google_calendar_integrations").select("*").eq("tenet_id", tenet_id).eq("is_active", True).execute()
        
        if not result.data:
            return None
        
        integration = result.data[0]
        
        access_token = self.encryption.decrypt(integration["access_token_encrypted"])
        refresh_token = self.encryption.decrypt(integration["refresh_token_encrypted"]) if integration.get("refresh_token_encrypted") else None
        
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        
        # Refresh se expirado
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            
            # Atualizar no banco
            supabase.table("google_calendar_integrations").update({
                "access_token_encrypted": self.encryption.encrypt(credentials.token),
                "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("tenet_id", tenet_id).execute()
        
        return credentials
    
    async def create_event(
        self,
        tenet_id: str,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        description: str = "",
        attendees: List[str] = None,
        location: str = ""
    ) -> Dict:
        """Cria um evento no Google Calendar."""
        try:
            credentials = await self.get_credentials(tenet_id)
            if not credentials:
                return {"success": False, "error": "Google Calendar não conectado"}
            
            service = build('calendar', 'v3', credentials=credentials)
            
            event = {
                'summary': summary,
                'location': location,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 30},
                    ],
                },
            }
            
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            created_event = service.events().insert(calendarId='primary', body=event).execute()
            
            return {
                "success": True,
                "event_id": created_event.get('id'),
                "html_link": created_event.get('htmlLink')
            }
            
        except HttpError as e:
            logger.error(f"Erro ao criar evento: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_available_slots(
        self,
        tenet_id: str,
        date: datetime,
        duration_minutes: int = 60
    ) -> List[Dict]:
        """Retorna horários disponíveis para um dia."""
        try:
            credentials = await self.get_credentials(tenet_id)
            if not credentials:
                return []
            
            service = build('calendar', 'v3', credentials=credentials)
            
            # Buscar eventos do dia
            start_of_day = date.replace(hour=8, minute=0, second=0, microsecond=0)
            end_of_day = date.replace(hour=18, minute=0, second=0, microsecond=0)
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=start_of_day.isoformat() + 'Z',
                timeMax=end_of_day.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Calcular slots disponíveis
            busy_times = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                busy_times.append((datetime.fromisoformat(start.replace('Z', '+00:00')), datetime.fromisoformat(end.replace('Z', '+00:00'))))
            
            # Gerar slots de hora em hora
            available_slots = []
            current_time = start_of_day
            
            while current_time < end_of_day:
                slot_end = current_time + timedelta(minutes=duration_minutes)
                
                # Verificar se slot está livre
                is_available = True
                for busy_start, busy_end in busy_times:
                    # Verificar se há conflito
                    if not (slot_end <= busy_start or current_time >= busy_end):
                        is_available = False
                        break
                
                if is_available:
                    available_slots.append({
                        "start": current_time.strftime("%H:%M"),
                        "end": slot_end.strftime("%H:%M")
                    })
                
                current_time += timedelta(minutes=30)
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Erro ao buscar slots: {e}")
            return []
    
    async def disconnect(self, tenet_id: str) -> Dict:
        """Desconecta integração do Google Calendar."""
        try:
            supabase = get_supabase_client()
            supabase.table("google_calendar_integrations").update({
                "is_active": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("tenet_id", tenet_id).execute()
            
            return {"success": True}
        except Exception as e:
            logger.error(f"Erro ao desconectar: {e}")
            return {"success": False, "error": str(e)}


google_calendar_service = GoogleCalendarService()
