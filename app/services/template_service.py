
"""Serviço para gerenciamento de templates de prompts"""

import re
from typing import List, Optional, Dict
from uuid import UUID
from app.database import get_supabase_client
from app.models.prompt_template import (
    PromptTemplateCreate, 
    PromptTemplateResponse,
    PromptCompiled,
    NichoType
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

class TemplateService:
    """Gerencia templates de prompts para diferentes nichos"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.table = "prompt_templates"
    
    async def list_templates(self, nicho: str = None, apenas_ativos: bool = True) -> List[Dict]:
        """Lista templates disponíveis"""
        try:
            query = self.supabase.table(self.table).select("*")
            
            if apenas_ativos:
                query = query.eq("ativo", True)
            if nicho:
                query = query.eq("nicho", nicho)
            
            result = query.order("nicho").order("is_default", desc=True).execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Erro ao listar templates: {e}")
            return []
    
    async def get_template(self, template_id: UUID) -> Optional[Dict]:
        """Busca template por ID"""
        try:
            result = self.supabase.table(self.table)\
                .select("*")\
                .eq("id", str(template_id))\
                .single()\
                .execute()
            return result.data
        except:
            return None
    
    async def get_default_template(self, nicho: str) -> Optional[Dict]:
        """Busca template padrão de um nicho"""
        try:
            result = self.supabase.table(self.table)\
                .select("*")\
                .eq("nicho", nicho)\
                .eq("is_default", True)\
                .eq("ativo", True)\
                .single()\
                .execute()
            return result.data
        except:
            return None
    
    async def create_template(self, template: PromptTemplateCreate) -> Optional[Dict]:
        """Cria novo template"""
        try:
            data = template.model_dump()
            data["nicho"] = data["nicho"].value  # Enum to string
            
            result = self.supabase.table(self.table).insert(data).execute()
            
            if result.data:
                logger.info(f"Template '{template.nome}' criado")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Erro ao criar template: {e}")
            return None
    
    async def compile_template(self, template_id: UUID, variaveis: Dict[str, str]) -> Optional[PromptCompiled]:
        """Compila template substituindo variáveis"""
        template = await self.get_template(template_id)
        
        if not template:
            return None
        
        prompt_sistema = template["prompt_sistema"]
        prompt_inicial = template.get("prompt_inicial")
        
        # Substitui variáveis no formato {{variavel}}
        for key, value in variaveis.items():
            pattern = r"\{\{" + key + r"\}\}"
            prompt_sistema = re.sub(pattern, value, prompt_sistema)
            if prompt_inicial:
                prompt_inicial = re.sub(pattern, value, prompt_inicial)
        
        return PromptCompiled(
            prompt_sistema=prompt_sistema,
            prompt_inicial=prompt_inicial,
            nicho=template["nicho"],
            template_id=UUID(template["id"])
        )
    
    async def list_nichos(self) -> List[Dict]:
        """Lista nichos disponíveis com contagem de templates"""
        try:
            result = self.supabase.table(self.table)\
                .select("nicho")\
                .eq("ativo", True)\
                .execute()
            
            # Conta templates por nicho
            nichos = {}
            for item in result.data or []:
                nicho = item["nicho"]
                nichos[nicho] = nichos.get(nicho, 0) + 1
            
            return [{"nicho": k, "templates": v} for k, v in nichos.items()]
            
        except Exception as e:
            logger.error(f"Erro ao listar nichos: {e}")
            return []

# Singleton
template_service = TemplateService()
