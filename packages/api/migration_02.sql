-- Script de Refinamento de Prioridades
-- Rode este script no "SQL Editor" do seu painel do Supabase.

-- 1. Farmácia/Remédio -> Urgent
UPDATE transactions 
SET urgency = 'urgent' 
WHERE (category = 'Saúde' AND subcategory = 'Farmácia')
   OR (description ILIKE '%remédio%')
   OR (description ILIKE '%remedio%');

-- 2. Alimentação/Mercado -> Necessity
UPDATE transactions 
SET urgency = 'necessity' 
WHERE (category = 'Alimentação' AND subcategory = 'Mercado')
   OR (description ILIKE '%mercado%');

-- 3. Atualizar também em installments se houver correspondência
UPDATE installments
SET urgency = 'necessity'
WHERE (category = 'Alimentação')
  AND (description ILIKE '%mercado%');
