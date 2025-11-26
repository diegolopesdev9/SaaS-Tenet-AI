
# SDR Agent SaaS - Multi-Tenant AI Platform

Sistema SaaS Multi-Tenant de Agentes SDR com IA para automação de prospecção e vendas.

## Descrição do Projeto

Plataforma completa para gerenciamento de agentes SDR com inteligência artificial, oferecendo:

- **Multi-Tenancy**: Suporte para múltiplas agências isoladas
- **IA Personalizada**: Super-prompts customizados por agência
- **Integrações**: WhatsApp e RD Station via webhooks
- **Segurança**: Criptografia de tokens sensíveis com Fernet
- **RAG**: Sistema de Retrieval-Augmented Generation configurável

## Como Gerar ENCRYPTION_KEY

A `ENCRYPTION_KEY` é necessária para criptografar dados sensíveis. Gere uma chave usando Python:

```python
from cryptography.fernet import Fernet

# Gerar chave
key = Fernet.generate_key()
print(key.decode())
```

Copie a saída e use como valor de `ENCRYPTION_KEY` no arquivo `.env`.

## Setup do Supabase

1. Crie um projeto no Supabase
2. Execute o script SQL em `sql/schema.sql` no SQL Editor do Supabase
3. Copie a URL do projeto e a chave anon/service
4. Configure no arquivo `.env`

## Como Rodar com Docker

```bash
# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Build e iniciar
docker-compose up --build
```

A API estará disponível em `http://localhost:8000`

## Como Rodar Localmente

```bash
# Instalar dependências
pip install -r requirements.txt

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints Disponíveis

### Health Check
- **GET** `/health`
  - Verifica status da API e conexão com banco de dados
  - Retorna: `{"status": "ok", "service": "SDR Agent SaaS", "database": "connected"}`

### Webhooks
- **POST** `/webhooks/whatsapp`
  - Recebe eventos do WhatsApp Business API
  - Retorna: `{"status": 200, "message": "WhatsApp webhook received"}`

- **POST** `/webhooks/rdstation`
  - Recebe eventos do RD Station
  - Retorna: `{"status": 200, "message": "RD Station webhook received"}`

## Próximos Passos

- [ ] Implementar lógica de processamento dos webhooks do WhatsApp
- [ ] Implementar lógica de processamento dos webhooks do RD Station
- [ ] Adicionar sistema RAG para enriquecimento de contexto
- [ ] Implementar autenticação e autorização multi-tenant
- [ ] Adicionar endpoints CRUD para agências
- [ ] Implementar sistema de agentes SDR com IA
- [ ] Adicionar monitoramento e logs estruturados
- [ ] Implementar testes automatizados

## Tecnologias

- **FastAPI**: Framework web assíncrono
- **Supabase**: Backend-as-a-Service (PostgreSQL)
- **Cryptography**: Criptografia de dados sensíveis
- **Pydantic**: Validação de dados
- **Docker**: Containerização

## Licença

Proprietary - Todos os direitos reservados
