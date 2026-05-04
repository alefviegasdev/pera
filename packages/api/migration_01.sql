-- Script de Migração de Categorias (Tipo de Custo e Prioridade)
-- Rode este script no "SQL Editor" do seu painel do Supabase.

-- 1. Remover as constraints atuais (para permitir novos valores)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_subtype_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_urgency_check;

-- Se a tabela installments possuir o campo urgency (ela tem, com default 'planned')
ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_urgency_check;

-- 2. Atualizar os dados existentes
-- Subtype: variable -> unique
UPDATE transactions SET subtype = 'unique' WHERE subtype = 'variable';

-- Urgency: planned ou variable -> secondary
UPDATE transactions SET urgency = 'secondary' WHERE urgency = 'planned' OR urgency = 'variable';
UPDATE installments SET urgency = 'secondary' WHERE urgency = 'planned' OR urgency = 'variable';

-- 3. Adicionar as novas constraints
ALTER TABLE transactions ADD CONSTRAINT transactions_subtype_check CHECK (subtype IN ('fixed', 'semifixed', 'unique'));
ALTER TABLE transactions ADD CONSTRAINT transactions_urgency_check CHECK (urgency IN ('urgent', 'necessity', 'secondary'));

ALTER TABLE installments ADD CONSTRAINT installments_urgency_check CHECK (urgency IN ('urgent', 'necessity', 'secondary'));
