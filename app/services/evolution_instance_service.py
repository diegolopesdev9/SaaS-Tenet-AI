
"""
Serviço para gerenciar instâncias da Evolution API.
Permite criar instâncias, gerar QR Code, verificar status e desconectar.
"""
import logging
import httpx
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class EvolutionInstanceService:
    """
    Serviço para gerenciamento de instâncias na Evolution API.
    """
    
    def __init__(self):
        self.base_url = settings.EVOLUTION_API_URL.rstrip('/')
        self.api_key = settings.EVOLUTION_API_KEY
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def create_instance(self, instance_name: str, webhook_url: str = None) -> Dict[str, Any]:
        """
        Cria uma nova instância na Evolution API.
        
        Args:
            instance_name: Nome único da instância
            webhook_url: URL do webhook para receber mensagens
            
        Returns:
            Dados da instância criada
        """
        try:
            url = f"{self.base_url}/instance/create"
            
            payload = {
                "instanceName": instance_name,
                "qrcode": True,
                "integration": "WHATSAPP-BAILEYS"
            }
            
            # Adicionar webhook se fornecido
            if webhook_url:
                payload["webhook"] = {
                    "url": webhook_url,
                    "webhook_by_events": False,
                    "webhook_base64": False,
                    "events": [
                        "MESSAGES_UPSERT",
                        "CONNECTION_UPDATE",
                        "QRCODE_UPDATED"
                    ]
                }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"Instância {instance_name} criada com sucesso")
                    return {
                        "success": True,
                        "instance": data.get("instance", {}),
                        "qrcode": data.get("qrcode", {})
                    }
                else:
                    logger.error(f"Erro ao criar instância: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Erro ao criar instância: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_qrcode(self, instance_name: str) -> Dict[str, Any]:
        """
        Obtém o QR Code para conexão da instância.
        
        Args:
            instance_name: Nome da instância
            
        Returns:
            QR Code em base64 e status
        """
        try:
            url = f"{self.base_url}/instance/connect/{instance_name}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "qrcode": data.get("base64", data.get("qrcode", {}).get("base64")),
                        "code": data.get("code", data.get("qrcode", {}).get("code")),
                        "status": "waiting_scan"
                    }
                else:
                    return {
                        "success": False,
                        "error": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Erro ao obter QR Code: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_connection_status(self, instance_name: str) -> Dict[str, Any]:
        """
        Verifica o status de conexão da instância.
        
        Args:
            instance_name: Nome da instância
            
        Returns:
            Status da conexão (connected, disconnected, connecting)
        """
        try:
            url = f"{self.base_url}/instance/connectionState/{instance_name}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    state = data.get("instance", {}).get("state", "unknown")
                    return {
                        "success": True,
                        "status": state,
                        "connected": state == "open"
                    }
                elif response.status_code == 404:
                    return {
                        "success": True,
                        "status": "not_found",
                        "connected": False
                    }
                else:
                    return {
                        "success": False,
                        "error": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Erro ao verificar status: {e}")
            return {"success": False, "error": str(e)}
    
    async def disconnect_instance(self, instance_name: str) -> Dict[str, Any]:
        """
        Desconecta/logout da instância.
        
        Args:
            instance_name: Nome da instância
            
        Returns:
            Resultado da operação
        """
        try:
            url = f"{self.base_url}/instance/logout/{instance_name}"
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    url,
                    headers=self.headers,
                    timeout=15.0
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"Instância {instance_name} desconectada")
                    return {"success": True, "message": "Desconectado com sucesso"}
                else:
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Erro ao desconectar: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_instance(self, instance_name: str) -> Dict[str, Any]:
        """
        Remove completamente a instância.
        
        Args:
            instance_name: Nome da instância
            
        Returns:
            Resultado da operação
        """
        try:
            url = f"{self.base_url}/instance/delete/{instance_name}"
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    url,
                    headers=self.headers,
                    timeout=15.0
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"Instância {instance_name} removida")
                    return {"success": True, "message": "Instância removida"}
                else:
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Erro ao remover instância: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_instance_info(self, instance_name: str) -> Dict[str, Any]:
        """
        Obtém informações detalhadas da instância.
        
        Args:
            instance_name: Nome da instância
            
        Returns:
            Informações da instância (número conectado, nome, etc)
        """
        try:
            url = f"{self.base_url}/instance/fetchInstances"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    params={"instanceName": instance_name},
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Procurar a instância específica
                    instances = data if isinstance(data, list) else [data]
                    for inst in instances:
                        if inst.get("instance", {}).get("instanceName") == instance_name:
                            owner = inst.get("instance", {}).get("owner", "")
                            return {
                                "success": True,
                                "instance_name": instance_name,
                                "phone_number": owner.split("@")[0] if owner else None,
                                "status": inst.get("instance", {}).get("status", "unknown"),
                                "profile_name": inst.get("instance", {}).get("profileName"),
                                "profile_picture": inst.get("instance", {}).get("profilePictureUrl")
                            }
                    return {"success": True, "status": "not_found"}
                else:
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Erro ao obter info: {e}")
            return {"success": False, "error": str(e)}


# Instância singleton
evolution_service = EvolutionInstanceService()
