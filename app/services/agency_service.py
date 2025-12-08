"""Agency business logic service."""
from typing import Optional, Dict
from supabase import Client
from app.security import encryption_service


class AgencyService:
    """Service for agency-related operations."""

    def __init__(self, supabase_client: Client):
        """
        Initialize agency service.

        Args:
            supabase_client: Configured Supabase client instance
        """
        self.client = supabase_client

    async def get_agency_by_id(self, agency_id: str) -> Optional[Dict]:
        """
        Retrieve agency by ID.

        Args:
            agency_id: UUID of the agency

        Returns:
            Agency data as dict or None if not found
        """
        try:
            result = self.client.table('agencias').select('*').eq('id', agency_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error fetching agency: {e}")
            return None

    async def get_agency_by_instance(self, instance_name: str) -> Optional[Dict]:
        """
        Retrieve agency by Evolution API instance name.

        Args:
            instance_name: Nome da instância na Evolution API (ex: 'agencia-teste')

        Returns:
            Agency data as dict or None if not found
        """
        try:
            result = self.client.table('agencias').select('*').eq('instance_name', instance_name).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error fetching agency by instance: {e}")
            return None

    async def decrypt_agency_keys(self, agency_id: str) -> Optional[Dict]:
        """
        Decrypt sensitive agency keys by agency ID.

        Args:
            agency_id: UUID of the agency

        Returns:
            Dict with decrypted keys or None if agency not found
        """
        # Buscar agência no banco
        agency = await self.get_agency_by_id(agency_id)
        if not agency:
            print(f"Agency not found: {agency_id}")
            return None

        decrypted_keys = {}

        # Descriptografar WhatsApp token
        if agency.get('whatsapp_token_encrypted'):
            try:
                decrypted_keys['whatsapp_token'] = encryption_service.decrypt(
                    agency['whatsapp_token_encrypted']
                )
                print(f"WhatsApp token decrypted successfully")
            except Exception as e:
                print(f"Error decrypting WhatsApp token: {e}")
                decrypted_keys['whatsapp_token'] = None
        else:
            print("No whatsapp_token_encrypted found in agency")
            decrypted_keys['whatsapp_token'] = None

        # Descriptografar RD Station token
        if agency.get('token_rdstation_encrypted'):
            try:
                decrypted_keys['token_rdstation'] = encryption_service.decrypt(
                    agency['token_rdstation_encrypted']
                )
            except Exception as e:
                print(f"Error decrypting RD Station token: {e}")
                decrypted_keys['token_rdstation'] = None

        # Adicionar evolution_api_key (não criptografado, vem do .env)
        # Mas incluir aqui para consistência da resposta
        decrypted_keys['evolution_api_key'] = None  # Será usado do .env no webhook
        decrypted_keys['whatsapp_phone_id'] = agency.get('whatsapp_phone_id')

        return decrypted_keys