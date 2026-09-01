-- =====================================================================
-- Descoberta: o que existe DE FATO neste banco
--
-- Rode inteiro no SQL Editor e me mande as 4 saídas. Ele não altera nada.
--
-- Existe porque a migração 20260901 abortou em dois pontos:
--   • bloco 1: relation "public.patient_exams" does not exist
--   • bloco 3: rh_campanha_links(uuid) não encontrada
-- Ou seja: o conjunto de migrations aplicado aqui é diferente do que está
-- versionado. Sem saber qual é a diferença, qualquer correção é chute.
-- =====================================================================

-- 1) Tabelas que a migração toca — quais existem?
SELECT t.nome,
       to_regclass('public.' || t.nome) IS NOT NULL AS existe
FROM (VALUES
  ('patient_exams'), ('patient_notifications'), ('doctors'),
  ('empresa_afastamentos'), ('empresa_ambulatorio'), ('empresa_faturas'),
  ('empresa_compliance_docs'), ('empresa_certificados_esg'),
  ('empresa_relatorios_emitidos'), ('empresa_ingestao_lotes'),
  ('psychosocial_campaigns'), ('empresa_planos_acao'),
  ('rh_usuarios'), ('empresa_colaboradores'), ('payouts'),
  ('platform_settings'), ('profiles')
) AS t(nome)
ORDER BY existe, t.nome;


-- 2) Todas as funções rh_* que existem, com a assinatura real.
--    É esta lista que decide quais wrappers a migração pode criar.
SELECT p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS assinatura,
       pg_get_function_result(p.oid) AS retorno
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'rh\_%'
ORDER BY p.proname;


-- 3) O helper de permissão existe? (a migração inteira depende dele)
SELECT to_regprocedure('public.rh_tem_permissao(text)') IS NOT NULL AS rh_tem_permissao_existe,
       to_regprocedure('public.is_super_admin()')       IS NOT NULL AS is_super_admin_existe;


-- 4) Policies de storage.objects hoje — confirma se a do F1 sequer existe
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
