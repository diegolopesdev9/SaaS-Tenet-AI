
"""Rotas de métricas administrativas"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_supabase_client
from app.routes.auth import get_current_user
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/admin/metrics", tags=["Admin Metrics"])

@router.get("/geral")
async def get_general_metrics(
    period: str = "7d",
    current_user: dict = Depends(get_current_user)
):
    """Retorna métricas gerais do sistema (Super Admin)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        supabase = get_supabase_client()
        
        # Calcular data de início baseado no período
        days = int(period.replace("d", ""))
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Total de agências
        agencias_result = supabase.table("agencias").select("id", count="exact").execute()
        total_agencias = agencias_result.count or 0
        
        # Total de usuários
        usuarios_result = supabase.table("usuarios").select("id", count="exact").execute()
        total_usuarios = usuarios_result.count or 0
        
        # Total de conversas no período
        conversas_result = supabase.table("conversas")\
            .select("id, status, agencia_id", count="exact")\
            .gte("created_at", start_date)\
            .execute()
        
        conversas = conversas_result.data or []
        total_leads = len(conversas)
        
        # Contar por status
        status_breakdown = {}
        for conv in conversas:
            status = conv.get("status", "em_andamento")
            status_breakdown[status] = status_breakdown.get(status, 0) + 1
        
        qualificados = status_breakdown.get("qualificado", 0)
        taxa_conversao = round((qualificados / total_leads * 100), 1) if total_leads > 0 else 0
        
        # Métricas por agência
        agencias_metrics = {}
        for conv in conversas:
            ag_id = conv.get("agencia_id")
            if ag_id not in agencias_metrics:
                agencias_metrics[ag_id] = {"total": 0, "qualificado": 0}
            agencias_metrics[ag_id]["total"] += 1
            if conv.get("status") == "qualificado":
                agencias_metrics[ag_id]["qualificado"] += 1
        
        # Buscar nomes das agências
        if agencias_metrics:
            ag_ids = list(agencias_metrics.keys())
            ag_result = supabase.table("agencias")\
                .select("id, nome")\
                .in_("id", ag_ids)\
                .execute()
            
            ag_names = {a["id"]: a["nome"] for a in (ag_result.data or [])}
            
            ranking_agencias = []
            for ag_id, metrics in agencias_metrics.items():
                taxa = round((metrics["qualificado"] / metrics["total"] * 100), 1) if metrics["total"] > 0 else 0
                ranking_agencias.append({
                    "id": ag_id,
                    "nome": ag_names.get(ag_id, "Agência"),
                    "total": metrics["total"],
                    "qualificado": metrics["qualificado"],
                    "taxa": taxa
                })
            
            ranking_agencias.sort(key=lambda x: x["taxa"], reverse=True)
        else:
            ranking_agencias = []
        
        return {
            "total_agencias": total_agencias,
            "total_usuarios": total_usuarios,
            "total_leads": total_leads,
            "qualificados": qualificados,
            "taxa_conversao": taxa_conversao,
            "status_breakdown": status_breakdown,
            "ranking_agencias": ranking_agencias[:10],
            "period": period
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar métricas gerais: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar métricas")
