
"""
Rotas para gerenciamento de conexão WhatsApp via Evolution API.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.routes.auth import get_current_user
from app.services.evolution_instance_service import evolution_service
from app.database import get_supabase_client
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Connection"])


class CreateInstanceRequest(BaseModel):
    instance_name: Optional[str] = None


class UpdateApiTypeRequest(BaseModel):
    api_type: str  # "evolution" ou "meta"


@router.post("/instance/create")
async def create_whatsapp_instance(
    request: CreateInstanceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cria uma nova instância WhatsApp para a agência do usuário.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        # Buscar dados da agência
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("*").eq("id", agencia_id).single().execute()
        agencia = response.data
        
        if not agencia:
            raise HTTPException(status_code=404, detail="Agência não encontrada")
        
        # Usar instance_name da agência ou gerar um novo
        instance_name = request.instance_name or agencia.get("instance_name") or f"tenet-{agencia_id[:8]}"
        
        # 1. Verificar se já existe instância com esse nome no Supabase
        existing = supabase.table("agencias").select("id, instance_name").eq("instance_name", instance_name).execute()
        
        if existing.data:
            existing_agency_id = existing.data[0].get("id")
            
            # 2. Se já existe na mesma agência, só buscar QR code
            if existing_agency_id == agencia_id:
                logger.info(f"Instância {instance_name} já existe nesta agência, buscando QR Code")
                qr_result = await evolution_service.get_qrcode(instance_name)
                if qr_result.get("success"):
                    return {
                        "success": True,
                        "instance_name": instance_name,
                        "qrcode": qr_result.get("qrcode"),
                        "message": "Instância já existe. Escaneie o QR Code para conectar."
                    }
                else:
                    raise HTTPException(status_code=400, detail="Erro ao obter QR Code da instância existente")
            
            # 3. Se existe em OUTRA agência, retornar erro
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Nome de instância '{instance_name}' já está em uso por outra agência"
                )
        
        # URL do webhook
        base_url = settings.CORS_ORIGINS.split(",")[0] if settings.CORS_ORIGINS else "https://seu-dominio.com"
        webhook_url = f"{base_url}/webhooks/whatsapp"
        
        # Criar instância na Evolution API
        result = await evolution_service.create_instance(instance_name, webhook_url)
        
        if result.get("success"):
            # Atualizar instance_name na agência com tratamento de erro
            try:
                supabase.table("agencias").update({
                    "instance_name": instance_name,
                    "whatsapp_api_type": "evolution"
                }).eq("id", agencia_id).execute()
            except Exception as db_error:
                logger.warning(f"Aviso ao atualizar DB: {db_error}")
            
            return {
                "success": True,
                "instance_name": instance_name,
                "qrcode": result.get("qrcode", {}).get("base64"),
                "message": "Instância criada. Escaneie o QR Code para conectar."
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Erro ao criar instância"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar instância: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/instance/qrcode")
async def get_qrcode(current_user: dict = Depends(get_current_user)):
    """
    Obtém o QR Code para conexão do WhatsApp.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        # Buscar instance_name da agência
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("instance_name").eq("id", agencia_id).single().execute()
        
        instance_name = response.data.get("instance_name") if response.data else None
        
        if not instance_name:
            raise HTTPException(status_code=400, detail="Instância não configurada. Crie uma instância primeiro.")
        
        result = await evolution_service.get_qrcode(instance_name)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Erro ao obter QR Code"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter QR Code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/instance/status")
async def get_connection_status(current_user: dict = Depends(get_current_user)):
    """
    Verifica o status de conexão do WhatsApp.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        # Buscar instance_name da agência
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("instance_name, whatsapp_api_type").eq("id", agencia_id).single().execute()
        
        agencia = response.data
        instance_name = agencia.get("instance_name") if agencia else None
        
        if not instance_name:
            return {
                "success": True,
                "status": "not_configured",
                "connected": False,
                "message": "Instância não configurada"
            }
        
        # Verificar status
        status_result = await evolution_service.get_connection_status(instance_name)
        
        # Se conectado, buscar informações adicionais
        if status_result.get("connected"):
            info_result = await evolution_service.get_instance_info(instance_name)
            if info_result.get("success"):
                status_result["phone_number"] = info_result.get("phone_number")
                status_result["profile_name"] = info_result.get("profile_name")
                status_result["profile_picture"] = info_result.get("profile_picture")
        
        status_result["instance_name"] = instance_name
        status_result["api_type"] = agencia.get("whatsapp_api_type", "evolution")
        
        return status_result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instance/disconnect")
async def disconnect_whatsapp(current_user: dict = Depends(get_current_user)):
    """
    Desconecta o WhatsApp da instância.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        # Buscar instance_name da agência
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("instance_name").eq("id", agencia_id).single().execute()
        
        instance_name = response.data.get("instance_name") if response.data else None
        
        if not instance_name:
            raise HTTPException(status_code=400, detail="Instância não configurada")
        
        result = await evolution_service.disconnect_instance(instance_name)
        
        if result.get("success"):
            return {"success": True, "message": "WhatsApp desconectado com sucesso"}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Erro ao desconectar"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao desconectar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api-type")
async def update_api_type(
    request: UpdateApiTypeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza o tipo de API do WhatsApp (Evolution ou Meta).
    APENAS Super Admin pode usar esta rota.
    """
    # Verificar se é super admin
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Apenas Super Admin pode alterar o tipo de API")
    
    if request.api_type not in ["evolution", "meta"]:
        raise HTTPException(status_code=400, detail="Tipo de API inválido. Use 'evolution' ou 'meta'")
    
    try:
        agencia_id = current_user.get("agencia_id")
        
        # Super admin precisa especificar a agência via query param ou usar a selecionada
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Selecione uma agência primeiro")
        
        supabase = get_supabase_client()
        supabase.table("agencias").update({
            "whatsapp_api_type": request.api_type
        }).eq("id", agencia_id).execute()
        
        return {
            "success": True,
            "api_type": request.api_type,
            "message": f"Tipo de API atualizado para {request.api_type}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar tipo de API: {e}")
        raise HTTPException(status_code=500, detail=str(e))
