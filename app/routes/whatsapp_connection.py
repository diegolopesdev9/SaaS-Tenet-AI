
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
    Cria uma nova instância WhatsApp ou conecta a existente.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("*").eq("id", agencia_id).single().execute()
        agencia = response.data
        
        if not agencia:
            raise HTTPException(status_code=404, detail="Agência não encontrada")
        
        instance_name = request.instance_name or agencia.get("instance_name") or f"tenet-{agencia_id[:8]}"
        
        # 1. Verificar se instância já existe na Evolution API
        status_check = await evolution_service.get_connection_status(instance_name)
        
        if status_check.get("status") not in ["not_found", None]:
            # Instância existe - obter QR Code para reconectar
            if status_check.get("connected"):
                # Já está conectado
                info = await evolution_service.get_instance_info(instance_name)
                return {
                    "success": True,
                    "instance_name": instance_name,
                    "connected": True,
                    "phone_number": info.get("phone_number"),
                    "message": "Instância já está conectada."
                }
            
            # Não conectado - gerar QR Code
            qr_result = await evolution_service.get_qrcode(instance_name)
            
            # Atualizar no banco
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
                "qrcode": qr_result.get("qrcode"),
                "message": "Escaneie o QR Code para conectar."
            }
        
        # 2. Criar nova instância
        result = await evolution_service.create_instance(instance_name, None)
        
        if result.get("success"):
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
                "hash": result.get("hash"),
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


@router.get("/instance/health")
async def check_instance_health(current_user: dict = Depends(get_current_user)):
    """
    Verifica a saúde real da conexão WhatsApp.
    Retorna se a conexão está realmente funcionando.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("instance_name").eq("id", agencia_id).single().execute()
        
        instance_name = response.data.get("instance_name") if response.data else None
        
        if not instance_name:
            return {"healthy": False, "reason": "no_instance"}
        
        result = await evolution_service.health_check(instance_name)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no health check: {e}")
        return {"healthy": False, "reason": "error", "error": str(e)}


@router.get("/instance/token")
async def get_instance_token(current_user: dict = Depends(get_current_user)):
    """
    Obtém o token/hash da instância WhatsApp.
    """
    try:
        agencia_id = current_user.get("agencia_id")
        if not agencia_id:
            raise HTTPException(status_code=400, detail="Usuário não vinculado a uma agência")
        
        supabase = get_supabase_client()
        response = supabase.table("agencias").select("instance_name, whatsapp_token").eq("id", agencia_id).single().execute()
        
        agencia = response.data
        if not agencia or not agencia.get("instance_name"):
            return {"success": False, "token": None, "message": "Instância não configurada"}
        
        # Se já temos token salvo no banco, retornar
        if agencia.get("whatsapp_token"):
            return {"success": True, "token": agencia.get("whatsapp_token")}
        
        # Caso contrário, buscar da Evolution API
        instance_name = agencia.get("instance_name")
        info = await evolution_service.get_instance_info(instance_name)
        
        if info.get("success"):
            token = info.get("token", "")
            return {"success": True, "token": token}
        
        return {"success": False, "token": None, "message": "Não foi possível obter token"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter token: {e}")
        return {"success": False, "token": None, "error": str(e)}


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
