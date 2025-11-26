
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
    
    async def decrypt_agency_keys(self, agency: Dict) -> Dict:
        """
        Decrypt sensitive agency keys.
        
        Args:
            agency: Agency data dict with encrypted keys
            
        Returns:
            Dict with decrypted keys
        """
        decrypted_keys = {}
        
        if agency.get('token_rdstation_encrypted'):
            try:
                decrypted_keys['token_rdstation'] = encryption_service.decrypt(
                    agency['token_rdstation_encrypted']
                )
            except Exception as e:
                print(f"Error decrypting RD Station token: {e}")
                decrypted_keys['token_rdstation'] = None
        
        if agency.get('whatsapp_token_encrypted'):
            try:
                decrypted_keys['whatsapp_token'] = encryption_service.decrypt(
                    agency['whatsapp_token_encrypted']
                )
            except Exception as e:
                print(f"Error decrypting WhatsApp token: {e}")
                decrypted_keys['whatsapp_token'] = None
        
        return decrypted_keys
