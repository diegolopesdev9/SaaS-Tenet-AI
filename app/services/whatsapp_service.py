
"""
Serviço de WhatsApp para envio de mensagens usando Evolution API.
"""
import logging
from typing import Optional
import httpx

# Configurar logging
logging.basicConfig(level=logging.INFO)


class WhatsAppService:
    """
    Serviço para integração com a Evolution API para envio de mensagens WhatsApp.
    """
    
    def __init__(self, evolution_api_url: str, evolution_api_key: str):
        """
        Inicializa o serviço de WhatsApp.
        
        Args:
            evolution_api_url: URL base da Evolution API
            evolution_api_key: Chave de autenticação da Evolution API
            
        Raises:
            ValueError: Se os parâmetros obrigatórios não forem fornecidos
        """
        if not evolution_api_url:
            raise ValueError("evolution_api_url é obrigatório")
        if not evolution_api_key:
            raise ValueError("evolution_api_key é obrigatório")
            
        self.evolution_api_url = evolution_api_url.rstrip('/')
        self.evolution_api_key = evolution_api_key
        logging.info("WhatsAppService inicializado com sucesso")
    
    async def send_text_message(self, phone_number: str, message: str, instance_name: str = "agencia-teste") -> bool:
        """
        Envia uma mensagem de texto via WhatsApp.
        
        Args:
            phone_number: Número de telefone do destinatário (com código do país)
            message: Texto da mensagem a ser enviada
            instance_name: Nome da instância Evolution API (padrão: "agencia-teste")
            
        Returns:
            bool: True se a mensagem foi enviada com sucesso, False caso contrário
        """
        try:
            logging.info(f"Enviando mensagem para {phone_number}")
            
            # Preparar headers para autenticação
            headers = {
                "apikey": self.evolution_api_key,
                "Content-Type": "application/json"
            }
            
            # Preparar corpo da requisição
            payload = {
                "number": phone_number,
                "text": message
            }
            
            # Montar URL completa para envio de mensagem de texto
            url = f"{self.evolution_api_url}/message/sendText/{instance_name}"
            
            # Fazer requisição POST para a Evolution API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                # Verificar se a resposta indica sucesso (status 2xx)
                if 200 <= response.status_code < 300:
                    logging.info("Mensagem enviada com sucesso")
                    return True
                else:
                    logging.error(f"Erro ao enviar mensagem: Status {response.status_code} - {response.text}")
                    return False
                    
        except httpx.TimeoutException as e:
            logging.error(f"Erro ao enviar mensagem: Timeout - {str(e)}")
            return False
        except httpx.RequestError as e:
            logging.error(f"Erro ao enviar mensagem: Erro de requisição - {str(e)}")
            return False
        except Exception as e:
            logging.error(f"Erro ao enviar mensagem: {str(e)}")
            return False
