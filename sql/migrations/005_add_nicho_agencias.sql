
-- Migration: Adicionar campo nicho na tabela agencias
-- Versão: 005
-- Data: 2024-12-22

-- Adicionar coluna nicho (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencias' AND column_name = 'nicho'
    ) THEN
        ALTER TABLE agencias 
        ADD COLUMN nicho VARCHAR(50) DEFAULT 'sdr';
    END IF;
END $$;

-- Criar índice para busca por nicho
CREATE INDEX IF NOT EXISTS idx_agencias_nicho ON agencias(nicho);

-- Comentário explicativo
COMMENT ON COLUMN agencias.nicho IS 'Nicho do agente: sdr, suporte, rh, vendas, custom';

-- Atualizar agências existentes sem nicho
UPDATE agencias SET nicho = 'sdr' WHERE nicho IS NULL;
