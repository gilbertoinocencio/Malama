-- =====================================================
-- Malama — Taxa de transação no repasse ao profissional
-- Migration: 20260816_taxa_transacao_repasse.sql
--
-- O profissional recebe o valor da consulta MENOS a taxa de transação
-- cobrada pelo gateway (Asaas). Ex.: consulta R$100 + taxa 5% => R$95
-- líquidos transferidos por PIX.
--
-- Antes desta migration, payouts.amount guardava o valor cheio e a tela
-- de repasses do admin derivava a "taxa" na hora, usando a chave
-- default_platform_fee (25%) — que é a comissão de indicação de
-- suplementos, nada a ver com repasse. Resultado: o admin via líquido
-- R$75 enquanto o Asaas transferia R$100.
--
-- Agora o split grava os três valores no momento em que acontece, e as
-- telas apenas leem. Taxa é snapshot: mudar a configuração não reescreve
-- repasse já processado.
-- =====================================================

-- 1. Taxa de transação configurável (percentual sobre o valor da consulta)
INSERT INTO platform_settings (key, value) VALUES
  ('transaction_fee_percent', '5')
ON CONFLICT (key) DO NOTHING;

-- 2. Valores por nível do médico.
--    Rede de segurança: 20260624_doctor_patentes.sql semeia as chaves
--    antigas (bronze/prata/ouro) e 20260625 as renomeia, mas quem aplicou
--    as migrations fora de ordem pode estar sem as chaves finais. Sem elas
--    o valor cai no default do código e a tela de Configurações mostra
--    campo vazio.
INSERT INTO platform_settings (key, value) VALUES
  ('doctor_value_nivel1', '90'),
  ('doctor_value_nivel2', '100'),
  ('doctor_value_nivel3', '120')
ON CONFLICT (key) DO NOTHING;

-- 3. Decomposição do repasse.
--    amount permanece sendo o LÍQUIDO efetivamente transferido — é ele que
--    o reprocessamento manda pro Asaas, então a semântica não pode mudar.
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS fee_percent  DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS fee_amount   DECIMAL(10,2);

COMMENT ON COLUMN payouts.amount       IS 'Líquido transferido ao profissional (bruto - taxa de transação)';
COMMENT ON COLUMN payouts.gross_amount IS 'Bruto: consultas realizadas x valor do nível';
COMMENT ON COLUMN payouts.fee_percent  IS 'Taxa de transação aplicada, em % (snapshot do momento do split)';
COMMENT ON COLUMN payouts.fee_amount   IS 'Valor absoluto da taxa de transação retida';

-- 4. Backfill dos repasses já existentes.
--    Eles foram transferidos pelo valor cheio, sem dedução — registrar
--    taxa zero preserva a verdade histórica em vez de aplicar
--    retroativamente uma taxa que ninguém cobrou.
UPDATE payouts
SET gross_amount = amount,
    fee_percent  = 0,
    fee_amount   = 0
WHERE gross_amount IS NULL;
