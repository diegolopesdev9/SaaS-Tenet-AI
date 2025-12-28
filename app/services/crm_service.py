
"""
Serviço de integração com CRMs.
Suporta: RD Station, Pipedrive, Notion, Moskit, Zoho
"""
import logging
import httpx
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from app.utils.security import EncryptionService

logger = logging.getLogger(__name__)


class BaseCRMIntegration(ABC):
    """Classe base para integrações CRM."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.encryption = EncryptionService()
    
    @abstractmethod
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Envia lead para o CRM."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Testa conexão com o CRM."""
        pass


class RDStationIntegration(BaseCRMIntegration):
    """Integração com RD Station Marketing."""
    
    API_URL = "https://api.rd.services/platform/conversions"
    
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            
            payload = {
                "event_type": "CONVERSION",
                "event_family": "CDP",
                "payload": {
                    "conversion_identifier": "lead-whatsapp-sdr",
                    "email": lead_data.get("email", f"{lead_data.get('phone', 'unknown')}@whatsapp.lead"),
                    "name": lead_data.get("nome", "Lead WhatsApp"),
                    "mobile_phone": lead_data.get("phone"),
                    "cf_empresa": lead_data.get("empresa"),
                    "cf_cargo": lead_data.get("cargo"),
                    "cf_interesse": lead_data.get("interesse"),
                    "cf_orcamento": lead_data.get("orcamento"),
                    "cf_origem": "WhatsApp SDR Agent"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code in [200, 201] else response.text
                }
                
        except Exception as e:
            logger.error(f"Erro RD Station: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> bool:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.rd.services/platform/contacts",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"limit": 1},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False


class PipedriveIntegration(BaseCRMIntegration):
    """Integração com Pipedrive CRM."""
    
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            api_url = self.config.get("extra_config", {}).get("api_url", "https://api.pipedrive.com/v1")
            pipeline_id = self.config.get("pipeline_id")
            
            # Criar pessoa
            person_payload = {
                "name": lead_data.get("nome", "Lead WhatsApp"),
                "phone": [{"value": lead_data.get("phone"), "primary": True}],
                "email": [{"value": lead_data.get("email", "")}] if lead_data.get("email") else []
            }
            
            async with httpx.AsyncClient() as client:
                # Criar pessoa
                person_response = await client.post(
                    f"{api_url}/persons",
                    params={"api_token": api_key},
                    json=person_payload,
                    timeout=30.0
                )
                
                if person_response.status_code not in [200, 201]:
                    return {"success": False, "error": "Falha ao criar pessoa", "response": person_response.text}
                
                person_id = person_response.json().get("data", {}).get("id")
                
                # Criar deal
                deal_payload = {
                    "title": f"Lead WhatsApp - {lead_data.get('nome', 'Novo Lead')}",
                    "person_id": person_id,
                    "pipeline_id": int(pipeline_id) if pipeline_id else None,
                    "status": "open"
                }
                
                deal_response = await client.post(
                    f"{api_url}/deals",
                    params={"api_token": api_key},
                    json=deal_payload,
                    timeout=30.0
                )
                
                return {
                    "success": deal_response.status_code in [200, 201],
                    "status_code": deal_response.status_code,
                    "person_id": person_id,
                    "response": deal_response.json() if deal_response.status_code in [200, 201] else deal_response.text
                }
                
        except Exception as e:
            logger.error(f"Erro Pipedrive: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> bool:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            api_url = self.config.get("extra_config", {}).get("api_url", "https://api.pipedrive.com/v1")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{api_url}/users/me",
                    params={"api_token": api_key},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False


class NotionIntegration(BaseCRMIntegration):
    """Integração com Notion Database."""
    
    API_URL = "https://api.notion.com/v1"
    
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            database_id = self.config.get("database_id")
            
            if not database_id:
                return {"success": False, "error": "Database ID não configurado"}
            
            payload = {
                "parent": {"database_id": database_id},
                "properties": {
                    "Nome": {"title": [{"text": {"content": lead_data.get("nome", "Lead WhatsApp")}}]},
                    "Telefone": {"phone_number": lead_data.get("phone", "")},
                    "Email": {"email": lead_data.get("email", "")},
                    "Empresa": {"rich_text": [{"text": {"content": lead_data.get("empresa", "")}}]},
                    "Interesse": {"rich_text": [{"text": {"content": lead_data.get("interesse", "")}}]},
                    "Status": {"select": {"name": "Novo Lead"}},
                    "Origem": {"select": {"name": "WhatsApp SDR"}}
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.API_URL}/pages",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Notion-Version": "2022-06-28"
                    },
                    timeout=30.0
                )
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code in [200, 201] else response.text
                }
                
        except Exception as e:
            logger.error(f"Erro Notion: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> bool:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_URL}/users/me",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Notion-Version": "2022-06-28"
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False


class MoskitIntegration(BaseCRMIntegration):
    """Integração com Moskit CRM."""
    
    API_URL = "https://api.moskit.com.br/v2"
    
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            pipeline_id = self.config.get("pipeline_id")
            
            # Criar contato
            contact_payload = {
                "name": lead_data.get("nome", "Lead WhatsApp"),
                "phones": [{"number": lead_data.get("phone")}],
                "emails": [{"address": lead_data.get("email")}] if lead_data.get("email") else []
            }
            
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                # Criar contato
                contact_response = await client.post(
                    f"{self.API_URL}/contacts",
                    json=contact_payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if contact_response.status_code not in [200, 201]:
                    return {"success": False, "error": "Falha ao criar contato", "response": contact_response.text}
                
                contact_id = contact_response.json().get("id")
                
                # Criar negócio
                deal_payload = {
                    "name": f"Lead WhatsApp - {lead_data.get('nome', 'Novo')}",
                    "contact_id": contact_id,
                    "pipeline_id": pipeline_id
                }
                
                deal_response = await client.post(
                    f"{self.API_URL}/deals",
                    json=deal_payload,
                    headers=headers,
                    timeout=30.0
                )
                
                return {
                    "success": deal_response.status_code in [200, 201],
                    "status_code": deal_response.status_code,
                    "contact_id": contact_id,
                    "response": deal_response.json() if deal_response.status_code in [200, 201] else deal_response.text
                }
                
        except Exception as e:
            logger.error(f"Erro Moskit: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> bool:
        try:
            api_key = self.encryption.decrypt(self.config.get("api_key_encrypted", ""))
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_URL}/users/me",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False


class ZohoIntegration(BaseCRMIntegration):
    """Integração com Zoho CRM."""
    
    async def send_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            api_token = self.encryption.decrypt(self.config.get("api_token_encrypted", ""))
            api_url = self.config.get("extra_config", {}).get("api_url", "https://www.zohoapis.com/crm/v2")
            
            payload = {
                "data": [{
                    "Last_Name": lead_data.get("nome", "Lead WhatsApp"),
                    "Phone": lead_data.get("phone"),
                    "Email": lead_data.get("email"),
                    "Company": lead_data.get("empresa"),
                    "Lead_Source": "WhatsApp SDR Agent",
                    "Description": lead_data.get("interesse", "")
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{api_url}/Leads",
                    json=payload,
                    headers={
                        "Authorization": f"Zoho-oauthtoken {api_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code in [200, 201] else response.text
                }
                
        except Exception as e:
            logger.error(f"Erro Zoho: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> bool:
        try:
            api_token = self.encryption.decrypt(self.config.get("api_token_encrypted", ""))
            api_url = self.config.get("extra_config", {}).get("api_url", "https://www.zohoapis.com/crm/v2")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{api_url}/users?type=CurrentUser",
                    headers={"Authorization": f"Zoho-oauthtoken {api_token}"},
                    timeout=10.0
                )
                return response.status_code == 200
        except:
            return False


class CRMService:
    """Serviço principal para gerenciar integrações CRM."""
    
    CRM_CLASSES = {
        "rdstation": RDStationIntegration,
        "pipedrive": PipedriveIntegration,
        "notion": NotionIntegration,
        "moskit": MoskitIntegration,
        "zoho": ZohoIntegration
    }
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.encryption = EncryptionService()
    
    async def get_active_integrations(self, tenet_id: str) -> List[Dict[str, Any]]:
        """Busca integrações ativas de uma agência."""
        try:
            response = self.supabase.table("integracoes_crm").select("*").eq(
                "tenet_id", tenet_id
            ).eq("is_active", True).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Erro ao buscar integrações: {e}")
            return []
    
    async def send_lead_to_crms(
        self,
        tenet_id: str,
        conversa_id: str,
        lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Envia lead para todos os CRMs ativos da agência."""
        
        integrations = await self.get_active_integrations(tenet_id)
        
        if not integrations:
            logger.info(f"Nenhuma integração CRM ativa para agência {tenet_id}")
            return {"sent": 0, "results": []}
        
        results = []
        
        for integration in integrations:
            crm_type = integration.get("crm_type")
            
            if crm_type not in self.CRM_CLASSES:
                logger.warning(f"CRM não suportado: {crm_type}")
                continue
            
            try:
                # Instanciar integração
                crm_class = self.CRM_CLASSES[crm_type]
                crm_instance = crm_class(integration)
                
                # Enviar lead
                result = await crm_instance.send_lead(lead_data)
                
                # Registrar log
                await self._log_sync(
                    tenet_id=tenet_id,
                    conversa_id=conversa_id,
                    crm_type=crm_type,
                    lead_phone=lead_data.get("phone"),
                    lead_data=lead_data,
                    status="success" if result.get("success") else "error",
                    crm_response=result.get("response"),
                    error_message=result.get("error")
                )
                
                results.append({
                    "crm": crm_type,
                    "success": result.get("success"),
                    "error": result.get("error")
                })
                
                logger.info(f"Lead enviado para {crm_type}: {'sucesso' if result.get('success') else 'erro'}")
                
            except Exception as e:
                logger.error(f"Erro ao enviar para {crm_type}: {e}")
                results.append({
                    "crm": crm_type,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "sent": len([r for r in results if r.get("success")]),
            "total": len(results),
            "results": results
        }
    
    async def _log_sync(
        self,
        tenet_id: str,
        conversa_id: str,
        crm_type: str,
        lead_phone: str,
        lead_data: Dict[str, Any],
        status: str,
        crm_response: Any = None,
        error_message: str = None
    ):
        """Registra log de sincronização."""
        try:
            self.supabase.table("crm_sync_logs").insert({
                "tenet_id": tenet_id,
                "conversa_id": conversa_id,
                "crm_type": crm_type,
                "lead_phone": lead_phone,
                "lead_data": lead_data,
                "status": status,
                "crm_response": crm_response if isinstance(crm_response, dict) else {"raw": str(crm_response)},
                "error_message": error_message,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Erro ao registrar log CRM: {e}")
    
    async def save_integration(
        self,
        tenet_id: str,
        crm_type: str,
        api_key: str = None,
        api_token: str = None,
        database_id: str = None,
        pipeline_id: str = None,
        extra_config: Dict[str, Any] = None,
        is_active: bool = True
    ) -> Dict[str, Any]:
        """Salva ou atualiza configuração de integração."""
        
        data = {
            "tenet_id": tenet_id,
            "crm_type": crm_type,
            "is_active": is_active,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if api_key:
            data["api_key_encrypted"] = self.encryption.encrypt(api_key)
        
        if api_token:
            data["api_token_encrypted"] = self.encryption.encrypt(api_token)
        
        if database_id:
            data["database_id"] = database_id
        
        if pipeline_id:
            data["pipeline_id"] = pipeline_id
        
        if extra_config:
            data["extra_config"] = extra_config
        
        try:
            # Upsert
            response = self.supabase.table("integracoes_crm").upsert(
                data,
                on_conflict="tenet_id,crm_type"
            ).execute()
            
            return {"success": True, "data": response.data}
        except Exception as e:
            logger.error(f"Erro ao salvar integração: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_integration(self, tenet_id: str, crm_type: str) -> bool:
        """Testa conexão com um CRM."""
        try:
            response = self.supabase.table("integracoes_crm").select("*").eq(
                "tenet_id", tenet_id
            ).eq("crm_type", crm_type).execute()
            
            if not response.data:
                return False
            
            config = response.data[0]
            
            if crm_type not in self.CRM_CLASSES:
                return False
            
            crm_class = self.CRM_CLASSES[crm_type]
            crm_instance = crm_class(config)
            
            return await crm_instance.test_connection()
            
        except Exception as e:
            logger.error(f"Erro ao testar integração: {e}")
            return False
