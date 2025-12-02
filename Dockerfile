
FROM python:3.11-slim

WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Expor porta (Railway usa variável $PORT)
EXPOSE 8000

# Comando para iniciar
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
