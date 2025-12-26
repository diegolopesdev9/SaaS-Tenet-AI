
"""Tenet business logic service."""
from typing import Optional, Dict
from supabase import Client
from app.security import encryption_service


class TenetService:
    """Service for tenet-related operations."""

    def __init__(self, supabase_client: Client):
        self.client = supabase_client

    async def get_tenet_by_id(self, tenet_id: str) -> Optional[Dict]:
        """Retrieve tenet by ID."""
        try:
            result = self.client.table('tenets').select('*').eq('id', tenet_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error fetching tenet: {e}")
            return None

    async def get_tenet_by_instance(self, instance_name: str) -> Optional[Dict]:
        """Retrieve tenet by Evolution API instance name."""
        try:
            result = self.client.table('tenets').select('*').eq('instance_name', instance_name).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error fetching tenet by instance: {e}")
            return None

    async def decrypt_tenet_keys(self, tenet_id: str) -> Optional[Dict]:
        """Decrypt sensitive tenet keys."""
        tenet = await self.get_tenet_by_id(tenet_id)
        if not tenet:
            return None

        decrypted_keys = {}

        if tenet.get('whatsapp_token_encrypted'):
            try:
                decrypted_keys['whatsapp_token'] = encryption_service.decrypt(
                    tenet['whatsapp_token_encrypted']
                )
            except Exception as e:
                print(f"Error decrypting WhatsApp token: {e}")
                decrypted_keys['whatsapp_token'] = None
        else:
            decrypted_keys['whatsapp_token'] = None

        if tenet.get('token_rdstation_encrypted'):
            try:
                decrypted_keys['token_rdstation'] = encryption_service.decrypt(
                    tenet['token_rdstation_encrypted']
                )
            except Exception as e:
                decrypted_keys['token_rdstation'] = None

        decrypted_keys['evolution_api_key'] = None
        decrypted_keys['whatsapp_phone_id'] = tenet.get('whatsapp_phone_id')

        return decrypted_keys


# Alias para compatibilidade
AgencyService = TenetService
