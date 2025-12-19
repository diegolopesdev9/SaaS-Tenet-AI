
"""Serviço para gerar embeddings usando Google Gemini"""

import google.generativeai as genai
from typing import List, Optional
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class EmbeddingService:
    """Gera embeddings de texto usando Gemini"""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = "models/embedding-001"
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Gera embedding para um texto"""
        try:
            # Limita tamanho do texto
            text = text[:8000] if len(text) > 8000 else text
            
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            
            return result['embedding']
            
        except Exception as e:
            logger.error(f"Erro ao gerar embedding: {e}")
            return None
    
    async def generate_query_embedding(self, query: str) -> Optional[List[float]]:
        """Gera embedding para uma query de busca"""
        try:
            result = genai.embed_content(
                model=self.model,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Erro ao gerar query embedding: {e}")
            return None

# Singleton
embedding_service = EmbeddingService()
