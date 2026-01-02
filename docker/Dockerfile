# ===========================================
# TENET AI - Dockerfile com Hardening de Segurança
# ===========================================

# Stage 1: Build do Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build do Backend
FROM python:3.11-slim AS builder

# Instalar dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 3: Runtime (Imagem final com hardening)
FROM python:3.11-slim

# ========== HARDENING DE SEGURANÇA ==========

# Criar usuário não-root para executar a aplicação
RUN groupadd -r tenetai && useradd -r -g tenetai -d /app -s /sbin/nologin tenetai

# Instalar apenas dependências runtime necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Configurar diretório de trabalho
WORKDIR /app

# Copiar dependências Python do builder
COPY --from=builder /root/.local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copiar código da aplicação
COPY --chown=tenetai:tenetai app/ ./app/

# Copiar frontend buildado
COPY --from=frontend-builder --chown=tenetai:tenetai /app/frontend/dist ./frontend/dist

# ========== CONFIGURAÇÕES DE SEGURANÇA ==========

# Definir variáveis de ambiente seguras
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Remover permissões desnecessárias
RUN chmod -R 550 /app && \
    chmod -R 770 /app/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expor porta
EXPOSE 8000

# Mudar para usuário não-root
USER tenetai

# Comando de inicialização
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
