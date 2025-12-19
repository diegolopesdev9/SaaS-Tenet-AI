
-- Migration: Criar tabela mensagens
-- Data: 2024-12-18
-- Descrição: Normaliza histórico de conversas para melhor performance

CREATE TABLE IF NOT EXISTS mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_id ON mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens(conversa_id, created_at DESC);

-- Comentários
COMMENT ON TABLE mensagens IS 'Histórico normalizado de mensagens das conversas';
COMMENT ON COLUMN mensagens.role IS 'Papel: user (lead), assistant (IA), system (sistema)';
COMMENT ON COLUMN mensagens.metadata IS 'Dados extras: intent, sentiment, extracted_data';
