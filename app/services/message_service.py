
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client
import logging

from app.database import get_supabase_client
from app.models.mensagem import (
    MensagemCreate,
    MensagemResponse,
    MensagemList,
    MessageRole
)

logger = logging.getLogger(__name__)


class MessageService:
    """
    Serviço para gerenciamento de mensagens individuais.
    """
    
    def __init__(self, supabase_client: Client):
        """
        Inicializa o serviço de mensagens.
        
        Args:
            supabase_client: Cliente Supabase configurado
        """
        self.supabase = supabase_client
        logger.info("MessageService inicializado com sucesso")
    
    async def create_message(
        self, 
        message_data: MensagemCreate
    ) -> Optional[MensagemResponse]:
        """
        Cria uma nova mensagem no banco de dados.
        
        Args:
            message_data: Dados da mensagem a ser criada
            
        Returns:
            MensagemResponse ou None em caso de erro
        """
        try:
            logger.info(f"Criando mensagem para conversa {message_data.conversa_id}")
            
            insert_data = {
                "conversa_id": str(message_data.conversa_id),
                "role": message_data.role.value,
                "content": message_data.content,
                "tokens_used": message_data.tokens_used,
                "metadata": message_data.metadata or {}
            }
            
            response = self.supabase.table("mensagens").insert(insert_data).execute()
            
            if response.data and len(response.data) > 0:
                message = response.data[0]
                logger.info(f"Mensagem criada com sucesso: {message['id']}")
                return MensagemResponse(**message)
            
            logger.error("Nenhum dado retornado ao criar mensagem")
            return None
            
        except Exception as e:
            logger.error(f"Erro ao criar mensagem: {str(e)}")
            return None
    
    async def get_message_by_id(
        self, 
        message_id: UUID
    ) -> Optional[MensagemResponse]:
        """
        Busca uma mensagem específica por ID.
        
        Args:
            message_id: UUID da mensagem
            
        Returns:
            MensagemResponse ou None se não encontrada
        """
        try:
            response = self.supabase.table("mensagens").select("*").eq(
                "id", str(message_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return MensagemResponse(**response.data[0])
            
            logger.warning(f"Mensagem não encontrada: {message_id}")
            return None
            
        except Exception as e:
            logger.error(f"Erro ao buscar mensagem: {str(e)}")
            return None
    
    async def get_messages_by_conversation(
        self,
        conversa_id: UUID,
        limit: int = 50,
        offset: int = 0,
        role_filter: Optional[MessageRole] = None
    ) -> MensagemList:
        """
        Busca mensagens de uma conversa específica.
        
        Args:
            conversa_id: UUID da conversa
            limit: Número máximo de mensagens a retornar
            offset: Número de mensagens a pular
            role_filter: Filtrar por role específico (user, assistant, system)
            
        Returns:
            MensagemList com as mensagens encontradas
        """
        try:
            logger.info(f"Buscando mensagens da conversa {conversa_id}")
            
            query = self.supabase.table("mensagens").select(
                "*", count="exact"
            ).eq("conversa_id", str(conversa_id))
            
            if role_filter:
                query = query.eq("role", role_filter.value)
            
            query = query.order("created_at", desc=False).range(offset, offset + limit - 1)
            
            response = query.execute()
            
            mensagens = [MensagemResponse(**msg) for msg in response.data]
            total = response.count if response.count else len(mensagens)
            
            logger.info(f"Encontradas {len(mensagens)} mensagens (total: {total})")
            
            return MensagemList(mensagens=mensagens, total=total)
            
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens: {str(e)}")
            return MensagemList(mensagens=[], total=0)
    
    async def update_message(
        self,
        message_id: UUID,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tokens_used: Optional[int] = None
    ) -> Optional[MensagemResponse]:
        """
        Atualiza uma mensagem existente.
        
        Args:
            message_id: UUID da mensagem
            content: Novo conteúdo (opcional)
            metadata: Novos metadados (opcional)
            tokens_used: Número de tokens usados (opcional)
            
        Returns:
            MensagemResponse atualizada ou None em caso de erro
        """
        try:
            update_data = {}
            
            if content is not None:
                update_data["content"] = content
            if metadata is not None:
                update_data["metadata"] = metadata
            if tokens_used is not None:
                update_data["tokens_used"] = tokens_used
            
            if not update_data:
                logger.warning("Nenhum campo para atualizar")
                return await self.get_message_by_id(message_id)
            
            response = self.supabase.table("mensagens").update(update_data).eq(
                "id", str(message_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Mensagem atualizada: {message_id}")
                return MensagemResponse(**response.data[0])
            
            logger.error(f"Falha ao atualizar mensagem: {message_id}")
            return None
            
        except Exception as e:
            logger.error(f"Erro ao atualizar mensagem: {str(e)}")
            return None
    
    async def delete_message(self, message_id: UUID) -> bool:
        """
        Deleta uma mensagem.
        
        Args:
            message_id: UUID da mensagem
            
        Returns:
            True se deletada com sucesso, False caso contrário
        """
        try:
            response = self.supabase.table("mensagens").delete().eq(
                "id", str(message_id)
            ).execute()
            
            if response.data:
                logger.info(f"Mensagem deletada: {message_id}")
                return True
            
            logger.warning(f"Mensagem não encontrada para deletar: {message_id}")
            return False
            
        except Exception as e:
            logger.error(f"Erro ao deletar mensagem: {str(e)}")
            return False
    
    async def get_conversation_stats(
        self, 
        conversa_id: UUID
    ) -> Dict[str, Any]:
        """
        Retorna estatísticas sobre as mensagens de uma conversa.
        
        Args:
            conversa_id: UUID da conversa
            
        Returns:
            Dicionário com estatísticas
        """
        try:
            response = self.supabase.table("mensagens").select(
                "role, tokens_used", count="exact"
            ).eq("conversa_id", str(conversa_id)).execute()
            
            total_messages = response.count if response.count else 0
            total_tokens = sum(msg.get("tokens_used", 0) for msg in response.data)
            
            user_messages = len([m for m in response.data if m["role"] == "user"])
            assistant_messages = len([m for m in response.data if m["role"] == "assistant"])
            system_messages = len([m for m in response.data if m["role"] == "system"])
            
            return {
                "total_messages": total_messages,
                "total_tokens": total_tokens,
                "user_messages": user_messages,
                "assistant_messages": assistant_messages,
                "system_messages": system_messages,
                "avg_tokens_per_message": total_tokens / total_messages if total_messages > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Erro ao calcular estatísticas: {str(e)}")
            return {
                "total_messages": 0,
                "total_tokens": 0,
                "user_messages": 0,
                "assistant_messages": 0,
                "system_messages": 0,
                "avg_tokens_per_message": 0
            }
    
    async def delete_messages_by_conversation(
        self, 
        conversa_id: UUID
    ) -> int:
        """
        Deleta todas as mensagens de uma conversa.
        
        Args:
            conversa_id: UUID da conversa
            
        Returns:
            Número de mensagens deletadas
        """
        try:
            response = self.supabase.table("mensagens").delete().eq(
                "conversa_id", str(conversa_id)
            ).execute()
            
            deleted_count = len(response.data) if response.data else 0
            logger.info(f"Deletadas {deleted_count} mensagens da conversa {conversa_id}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Erro ao deletar mensagens da conversa: {str(e)}")
            return 0
