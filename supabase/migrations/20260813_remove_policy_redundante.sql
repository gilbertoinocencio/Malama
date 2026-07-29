-- =====================================================
-- Malama — Remove a policy de leitura redundante em platform_settings
-- Migration: 20260813_remove_policy_redundante.sql
--
-- Aplicar via SQL Editor.
--
-- POR QUE ISTO EXISTE
-- A varredura de segurança de 26/06/2026 criou "Read non-secret settings"
-- direto no SQL Editor, sem migration correspondente. O repo continuou
-- mostrando a "Anyone can read settings" com USING (true) — foi por isso que
-- a auditoria seguinte reabriu um alarme já resolvido, e por isso a 20260811
-- criou uma SEGUNDA policy fazendo quase a mesma coisa.
--
-- O PROBLEMA DE DEIXAR AS DUAS
-- Policies PERMISSIVE são combinadas com OR: vale a MAIS PERMISSIVA. A
-- antiga não filtra '%api%' nem '%senha%', então esses dois termos da
-- "Read non-sensitive settings" ficam sem efeito enquanto ela existir.
-- Uma chave chamada 'asaas_api_key' seria legível por qualquer usuário
-- autenticado — inclusive paciente.
--
-- A antiga também não tem o ramo is_super_admin(), então nem para o admin
-- ela acrescenta algo. É redundância pura com o efeito colateral acima.
-- =====================================================

DROP POLICY IF EXISTS "Read non-secret settings" ON public.platform_settings;

-- Restos de versões anteriores, caso ainda existam em algum ambiente.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;

-- ── Conferência ──────────────────────────────────────────────────
-- Esperado: exatamente UMA linha, "Read non-sensitive settings".
-- Mais de uma policy de SELECT aqui é sempre suspeito: elas se somam por OR,
-- e a mais frouxa vence.
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'platform_settings' AND cmd = 'SELECT';
