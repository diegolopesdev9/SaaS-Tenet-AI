
"""Rotas para gerenciamento de A/B Tests"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from app.services.ab_test_service import ab_test_service
from app.models.ab_test import ABTestCreate, ABTestUpdate
from app.routes.auth import get_current_user
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/ab-tests", tags=["A/B Testing"])

@router.get("")
async def list_tests(current_user: dict = Depends(get_current_user)):
    """Lista A/B tests da agência"""
    agencia_id = current_user.get("agencia_id")
    if not agencia_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    tests = await ab_test_service.list_tests(UUID(agencia_id))
    return {"tests": tests, "total": len(tests)}

@router.post("")
async def create_test(test: ABTestCreate, current_user: dict = Depends(get_current_user)):
    """Cria novo A/B test"""
    agencia_id = current_user.get("agencia_id")
    if not agencia_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Apenas admins podem criar testes")
    
    result = await ab_test_service.create_test(UUID(agencia_id), test)
    if not result:
        raise HTTPException(status_code=500, detail="Erro ao criar teste")
    
    return {"status": "success", "test": result}

@router.get("/active")
async def get_active_test(current_user: dict = Depends(get_current_user)):
    """Busca teste ativo da agência"""
    agencia_id = current_user.get("agencia_id")
    if not agencia_id:
        raise HTTPException(status_code=400, detail="Agência não encontrada")
    
    test = await ab_test_service.get_active_test(UUID(agencia_id))
    if not test:
        return {"active_test": None}
    return {"active_test": test}

@router.get("/{test_id}/metrics")
async def get_test_metrics(test_id: UUID, current_user: dict = Depends(get_current_user)):
    """Retorna métricas do A/B test"""
    metrics = await ab_test_service.get_metrics(test_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="Teste não encontrado ou sem dados")
    return metrics

@router.post("/{test_id}/start")
async def start_test(test_id: UUID, current_user: dict = Depends(get_current_user)):
    """Inicia um A/B test"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Apenas admins podem iniciar testes")
    
    success = await ab_test_service.start_test(test_id)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao iniciar teste")
    
    return {"status": "running", "test_id": str(test_id)}

@router.post("/{test_id}/stop")
async def stop_test(test_id: UUID, vencedor: Optional[str] = None,
                    current_user: dict = Depends(get_current_user)):
    """Para um A/B test"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Apenas admins podem parar testes")
    
    if vencedor and vencedor not in ["A", "B"]:
        raise HTTPException(status_code=400, detail="Vencedor deve ser 'A' ou 'B'")
    
    success = await ab_test_service.stop_test(test_id, vencedor)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao parar teste")
    
    return {"status": "completed", "vencedor": vencedor}
