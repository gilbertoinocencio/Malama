-- Migration: Unificar taxa de comissão - remover taxa individual do médico
-- Data: 2026-04-08
-- Descrição: Remove a coluna platform_fee_percent da tabela doctors, pois agora
--             a taxa é gerenciada globalmente em platform_settings (key: default_platform_fee)

-- 1. Remover a coluna platform_fee_percent da tabela doctors
ALTER TABLE doctors DROP COLUMN IF EXISTS platform_fee_percent;

-- 2. Atualizar a função de cálculo de taxa para usar sempre a taxa global
--    (já foi tratada no código TypeScript - doctorPortalService.ts)

-- 3. Notificar sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Taxa de comissão unificada em Configurações Globais';
  RAISE NOTICE '📊 Coluna platform_fee_percent removida da tabela doctors';
  RAISE NOTICE '🔧 Todas as consultas agora usam a taxa global (default_platform_fee)';
  RAISE NOTICE '📋 Para alterar a taxa, acesse: Admin > Configurações > Taxa de comissão padrão';
END $$;
