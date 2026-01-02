"""
Serviço de retenção de dados para conformidade com LGPD.
Implementa políticas de retenção e exclusão automática.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from app.database import get_supabase_client
from app.services.audit_service import audit_service, AuditAction
from app.utils.logger import get_logger

logger = get_logger(__name__)


# Políticas de retenção (em dias)
RETENTION_POLICIES = {
    "conversas": 90,           # Conversas: 90 dias após última mensagem
    "mensagens": 90,           # Mensagens: 90 dias
    "leads_inativos": 365,     # Leads sem interação: 1 ano
    "audit_logs": 365 * 2,     # Logs de auditoria: 2 anos
    "tokens_expirados": 7,     # Tokens expirados: 7 dias
    "lgpd_requests": 365 * 5,  # Solicitações LGPD: 5 anos (requisito legal)
}


class DataRetentionService:
    """Serviço para gerenciar retenção e exclusão de dados."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def cleanup_old_conversations(self, dry_run: bool = True) -> Dict:
        """
        Remove conversas antigas conforme política de retenção.
        
        Args:
            dry_run: Se True, apenas simula sem deletar
            
        Returns:
            Estatísticas da operação
        """
        retention_days = RETENTION_POLICIES["conversas"]
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        try:
            # Buscar conversas antigas
            response = self.supabase.table("conversas").select(
                "id, tenet_id, updated_at"
            ).lt("updated_at", cutoff_date.isoformat()).execute()
            
            old_conversations = response.data or []
            count = len(old_conversations)
            
            logger.info(f"Encontradas {count} conversas para exclusão (cutoff: {cutoff_date})")
            
            if not dry_run and count > 0:
                # Deletar em lotes
                conversation_ids = [c["id"] for c in old_conversations]
                
                # Primeiro deletar mensagens associadas
                self.supabase.table("mensagens").delete().in_(
                    "conversa_id", conversation_ids
                ).execute()
                
                # Depois deletar conversas
                self.supabase.table("conversas").delete().in_(
                    "id", conversation_ids
                ).execute()
                
                # Log de auditoria
                await audit_service.log(
                    action=AuditAction.LEAD_DELETE,
                    details={
                        "type": "retention_cleanup",
                        "table": "conversas",
                        "count": count,
                        "cutoff_date": cutoff_date.isoformat()
                    }
                )
            
            return {
                "table": "conversas",
                "found": count,
                "deleted": count if not dry_run else 0,
                "dry_run": dry_run,
                "cutoff_date": cutoff_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro no cleanup de conversas: {e}")
            return {"error": str(e)}
    
    async def anonymize_inactive_leads(self, dry_run: bool = True) -> Dict:
        """
        Anonimiza leads inativos conforme política de retenção.
        Mantém dados estatísticos, remove dados pessoais.
        """
        retention_days = RETENTION_POLICIES["leads_inativos"]
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        try:
            # Buscar leads inativos
            response = self.supabase.table("leads").select(
                "id, tenet_id, updated_at"
            ).lt("updated_at", cutoff_date.isoformat()).eq(
                "status", "inativo"
            ).execute()
            
            old_leads = response.data or []
            count = len(old_leads)
            
            logger.info(f"Encontrados {count} leads para anonimização")
            
            if not dry_run and count > 0:
                lead_ids = [l["id"] for l in old_leads]
                
                # Anonimizar em vez de deletar (preserva estatísticas)
                self.supabase.table("leads").update({
                    "nome": "ANONIMIZADO",
                    "email": None,
                    "telefone": None,
                    "dados_adicionais": None,
                    "anonimizado_em": datetime.now(timezone.utc).isoformat()
                }).in_("id", lead_ids).execute()
                
                await audit_service.log(
                    action=AuditAction.LEAD_UPDATE,
                    details={
                        "type": "retention_anonymization",
                        "count": count
                    }
                )
            
            return {
                "table": "leads",
                "found": count,
                "anonymized": count if not dry_run else 0,
                "dry_run": dry_run
            }
            
        except Exception as e:
            logger.error(f"Erro na anonimização de leads: {e}")
            return {"error": str(e)}
    
    async def run_full_cleanup(self, dry_run: bool = True) -> List[Dict]:
        """
        Executa todas as políticas de retenção.
        
        Args:
            dry_run: Se True, apenas simula
            
        Returns:
            Lista de resultados de cada operação
        """
        results = []
        
        # Cleanup de conversas
        result = await self.cleanup_old_conversations(dry_run)
        results.append(result)
        
        # Anonimização de leads
        result = await self.anonymize_inactive_leads(dry_run)
        results.append(result)
        
        logger.info(f"Cleanup completo (dry_run={dry_run}): {results}")
        
        return results
    
    def get_retention_policies(self) -> Dict:
        """Retorna as políticas de retenção configuradas."""
        return {
            name: f"{days} dias" 
            for name, days in RETENTION_POLICIES.items()
        }


# Instância singleton
data_retention_service = DataRetentionService()
