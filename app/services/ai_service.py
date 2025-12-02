
"""
Serviço de IA para geração de respostas usando Google Gemini.
"""
import logging
from typing import Optional
import google.generativeai as genai
from app.config import settings

# Configurar logging
logging.basicConfig(level=logging.INFO)


class AIService:
    """
    Serviço para integração com a API do Google Gemini.
    Responsável por gerar respostas contextualizadas usando IA.
    """
    
    def __init__(self):
        """
        Inicializa o serviço de IA e configura a API do Gemini.
        
        Raises:
            ValueError: Se GEMINI_API_KEY não estiver configurada.
        """
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não está configurada nas variáveis de ambiente")
        
        # Configurar a API do Gemini com a chave de API
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        logging.info("AIService inicializado com sucesso")
    
    async def generate_response(self, message_text: str, context_prompt: str) -> str:
        """
        Gera uma resposta usando IA baseada no contexto e mensagem do cliente.
        
        Args:
            message_text: Texto da mensagem recebida do cliente
            context_prompt: Contexto ou instruções para guiar a IA
            
        Returns:
            str: Resposta gerada pela IA
            
        Raises:
            Exception: Se houver erro na comunicação com a API do Gemini
        """
        try:
            logging.info("Iniciando geração de resposta IA")
            
            # Montar o prompt completo combinando contexto e mensagem
            full_prompt = f"Contexto: {context_prompt}\n\nMensagem do cliente: {message_text}\n\nResposta:"
            logging.info("Prompt montado")
            
            # Gerar resposta usando o modelo Gemini
            response = self.model.generate_content(full_prompt)
            
            # Extrair o texto da resposta
            response_text = response.text
            logging.info("Resposta da IA recebida")
            
            return response_text
            
        except Exception as e:
            logging.error(f"Erro ao gerar resposta: {str(e)}")
            raise Exception(f"Falha ao gerar resposta com IA: {str(e)}")
