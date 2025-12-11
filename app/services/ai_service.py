"""
Serviço de IA para geração de respostas usando Google Gemini.
Inclui suporte a histórico de conversas e extração de dados do lead.
"""
import logging
import json
import re
from typing import Optional, Dict, Any, List
import google.generativeai as genai
from app.config import settings

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIService:
    """
    Serviço para integração com Google Gemini AI.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa o serviço de IA.

        Args:
            api_key: Chave da API do Gemini (opcional, usa settings se não fornecida)
        """
        self.api_key = api_key or settings.GEMINI_API_KEY

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY não configurada")

        # Configurar a API
        genai.configure(api_key=self.api_key)

        # Usar modelo gemini-2.0-flash
        self.model = genai.GenerativeModel('gemini-2.0-flash')

        logger.info("AIService inicializado com sucesso")

    async def generate_response(
        self,
        message: str,
        agency_name: str,
        agency_prompt: Optional[str] = None,
        conversation_history: Optional[str] = None,
        lead_data: Optional[Dict[str, Any]] = None,
        agent_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Gera uma resposta usando o Gemini AI.

        Args:
            message: Mensagem do usuário
            agency_name: Nome da agência
            agency_prompt: Prompt personalizado da agência (opcional)
            conversation_history: Histórico formatado da conversa (opcional)
            lead_data: Dados já conhecidos do lead (opcional)
            agent_config: Configurações personalizadas para o agente (opcional)

        Returns:
            Dict contendo resposta e dados extraídos do lead
        """
        try:
            logger.info("Iniciando geração de resposta IA")

            # Construir contexto do lead
            lead_context = ""
            if lead_data:
                known_data = []
                if lead_data.get("nome"):
                    known_data.append(f"Nome: {lead_data['nome']}")
                if lead_data.get("empresa"):
                    known_data.append(f"Empresa: {lead_data['empresa']}")
                if lead_data.get("cargo"):
                    known_data.append(f"Cargo: {lead_data['cargo']}")
                if lead_data.get("desafio"):
                    known_data.append(f"Desafio: {lead_data['desafio']}")
                if known_data:
                    lead_context = "\n=== DADOS JÁ CONHECIDOS DO LEAD ===\n" + "\n".join(known_data) + "\n=== FIM DOS DADOS ===\n\n"

            # Montar o prompt base com configurações personalizadas
            if agent_config:
                base_prompt = self._build_custom_prompt(agency_name, agent_config)
            elif agency_prompt:
                base_prompt = agency_prompt
            else:
                base_prompt = self._get_default_prompt(agency_name)

            # Adicionar instruções de extração de dados
            extraction_instructions = """

=== INSTRUÇÕES DE QUALIFICAÇÃO ===
Ao responder, tente naturalmente descobrir e extrair as seguintes informações do lead durante a conversa:
- Nome do contato
- Nome da empresa
- Cargo/função
- Principal desafio ou necessidade
- Orçamento disponível (se mencionado)
- Urgência (se mencionado)

Não force perguntas, mas conduza a conversa de forma natural para obter essas informações.
Seja amigável e focado em ajudar o cliente.

Após sua resposta conversacional, SEMPRE inclua um bloco JSON no seguinte formato (mesmo que vazio):
```json
{"nome": null, "empresa": null, "cargo": null, "desafio": null, "orcamento": null, "urgencia": null}
```
Preencha apenas os campos que conseguiu identificar na conversa atual ou anterior.
=== FIM DAS INSTRUÇÕES ===
"""

            # Montar prompt completo
            full_prompt = f"""{base_prompt}

{extraction_instructions}

{lead_context}{conversation_history or ''}Mensagem atual do cliente: {message}

Responda de forma natural e profissional:"""

            logger.info("Prompt montado")

            # Gerar resposta
            response = self.model.generate_content(full_prompt)

            logger.info("Resposta da IA recebida")

            # Processar resposta e extrair dados
            full_response = response.text

            # Separar resposta conversacional dos dados extraídos
            conversational_response, extracted_data = self._parse_response(full_response)

            return {
                "response": conversational_response,
                "extracted_data": extracted_data,
                "success": True
            }

        except Exception as e:
            logger.error(f"Erro ao gerar resposta: {str(e)}")
            raise Exception(f"Falha ao gerar resposta com IA: {str(e)}")

    def _parse_response(self, full_response: str) -> tuple:
        """
        Separa a resposta conversacional dos dados JSON extraídos.

        Args:
            full_response: Resposta completa do modelo

        Returns:
            Tuple (resposta_conversacional, dados_extraidos)
        """
        extracted_data = {}
        conversational_response = full_response

        try:
            # Procurar por bloco JSON na resposta
            json_pattern = r'```json\s*(\{[^}]+\})\s*```'
            json_match = re.search(json_pattern, full_response, re.DOTALL)

            if json_match:
                json_str = json_match.group(1)
                extracted_data = json.loads(json_str)

                # Remover bloco JSON da resposta conversacional
                conversational_response = re.sub(json_pattern, '', full_response, flags=re.DOTALL).strip()

                # Limpar dados extraídos (remover nulls e vazios)
                extracted_data = {k: v for k, v in extracted_data.items() if v and v != "null"}

                if extracted_data:
                    logger.info(f"Dados extraídos do lead: {list(extracted_data.keys())}")
            else:
                # Tentar encontrar JSON sem markdown
                json_pattern_simple = r'\{["\']?nome["\']?\s*:.*?\}'
                json_match_simple = re.search(json_pattern_simple, full_response, re.DOTALL)

                if json_match_simple:
                    try:
                        extracted_data = json.loads(json_match_simple.group())
                        extracted_data = {k: v for k, v in extracted_data.items() if v and v != "null"}
                        conversational_response = full_response.replace(json_match_simple.group(), '').strip()
                    except json.JSONDecodeError:
                        pass

        except Exception as e:
            logger.warning(f"Não foi possível extrair dados JSON: {str(e)}")

        # Limpar resposta de possíveis artefatos
        conversational_response = self._clean_response(conversational_response)

        return conversational_response, extracted_data

    def _clean_response(self, response: str) -> str:
        """
        Limpa a resposta de artefatos indesejados.

        Args:
            response: Resposta a ser limpa

        Returns:
            Resposta limpa
        """
        # Remover linhas vazias extras
        response = re.sub(r'\n{3,}', '\n\n', response)

        # Remover possíveis instruções vazadas
        patterns_to_remove = [
            r'=== INSTRUÇÕES.*?===',
            r'=== FIM DAS INSTRUÇÕES ===',
            r'```json.*?```',
            r'\{["\']?nome["\']?\s*:\s*null.*?\}',
        ]

        for pattern in patterns_to_remove:
            response = re.sub(pattern, '', response, flags=re.DOTALL)

        return response.strip()

    def _get_default_prompt(self, agency_name: str) -> str:
        """
        Retorna o prompt padrão para uma agência.

        Args:
            agency_name: Nome da agência

        Returns:
            Prompt padrão
        """
        return f"""Você é um assistente virtual de vendas da {agency_name}, especializado em qualificação de leads.

Seu objetivo é:
1. Entender as necessidades do cliente
2. Apresentar os serviços da agência de forma consultiva
3. Qualificar o lead coletando informações importantes
4. Agendar uma reunião com um especialista quando apropriado

Diretrizes:
- Seja cordial, profissional e objetivo
- Use linguagem adequada ao contexto brasileiro
- Faça perguntas abertas para entender melhor o cliente
- Não seja invasivo ao coletar informações
- Quando o cliente demonstrar interesse claro, sugira agendar uma conversa com um especialista
- Use emojis com moderação para tornar a conversa mais amigável

A {agency_name} oferece serviços de marketing digital incluindo:
- SEO e otimização de sites
- Gestão de redes sociais
- Campanhas de mídia paga (Google Ads, Meta Ads)
- Marketing de conteúdo
- E-mail marketing
- Desenvolvimento de sites e landing pages"""

    def _build_custom_prompt(self, agency_name: str, config: Dict[str, Any]) -> str:
        """
        Constrói um prompt personalizado com base nas configurações da agência.

        Args:
            agency_name: Nome da agência
            config: Configurações do agente

        Returns:
            Prompt personalizado
        """
        agent_name = config.get("agent_name", "Assistente")
        personality = config.get("personality", "profissional e amigável")
        welcome_message = config.get("welcome_message", "")
        qualification_questions = config.get("qualification_questions", [])
        qualification_criteria = config.get("qualification_criteria", "")
        closing_message = config.get("closing_message", "")

        # Formatar perguntas de qualificação
        questions_text = ""
        if qualification_questions:
            questions_list = "\n".join([f"- {q}" for q in qualification_questions if q])
            questions_text = f"""
Perguntas importantes para fazer durante a conversa (de forma natural, não todas de uma vez):
{questions_list}
"""

        # Formatar critérios de qualificação
        criteria_text = ""
        if qualification_criteria:
            criteria_text = f"""
Critérios para considerar o lead qualificado:
{qualification_criteria}
"""

        return f"""Você é {agent_name}, assistente virtual de vendas da {agency_name}.

Sua personalidade: {personality}

Seu objetivo é:
1. Entender as necessidades do cliente
2. Apresentar os serviços da agência de forma consultiva
3. Qualificar o lead coletando informações importantes
4. Agendar uma reunião com um especialista quando apropriado

Diretrizes de comunicação:
- Seja {personality}
- Use linguagem adequada ao contexto brasileiro
- Faça perguntas abertas para entender melhor o cliente
- Não seja invasivo ao coletar informações
- Use emojis com moderação para tornar a conversa mais amigável
{questions_text}
{criteria_text}
Quando o lead estiver qualificado ou demonstrar interesse claro, use uma mensagem como:
"{closing_message or 'Obrigado pelo contato! Em breve nossa equipe entrará em contato com você.'}"
"""


    async def analyze_qualification_status(
        self,
        lead_data: Dict[str, Any],
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Analisa se o lead está qualificado com base nos dados coletados.

        Args:
            lead_data: Dados extraídos do lead
            conversation_history: Histórico da conversa

        Returns:
            Status sugerido: 'em_andamento', 'qualificado', 'perdido'
        """
        # Campos importantes para qualificação
        required_fields = ["nome", "empresa", "desafio"]
        optional_fields = ["cargo", "orcamento", "urgencia"]

        # Contar campos preenchidos
        required_filled = sum(1 for f in required_fields if lead_data.get(f))
        optional_filled = sum(1 for f in optional_fields if lead_data.get(f))

        # Verificar sinais de perda na conversa
        loss_indicators = ["não tenho interesse", "não preciso", "obrigado, mas não", "agora não"]
        last_messages = [m.get("content", "").lower() for m in conversation_history[-4:] if m.get("role") == "user"]

        for msg in last_messages:
            for indicator in loss_indicators:
                if indicator in msg:
                    return "perdido"

        # Verificar qualificação
        if required_filled >= 2 and (optional_filled >= 1 or len(conversation_history) >= 6):
            return "qualificado"

        return "em_andamento"