-- =====================================================
-- Malama — Corrige acesso RH à tabela empresas
-- Migration: 20260618_rh_empresa_read_policy.sql
--
-- A tabela `empresas` só tinha policy para super_admin.
-- O usuário de RH (role='rh') não conseguia ler a própria
-- empresa, causando "Nenhuma empresa vinculada a esta conta"
-- no portal /rh mesmo com o registro em rh_usuarios correto.
-- =====================================================

DROP POLICY IF EXISTS "rh reads own empresa" ON empresas;
CREATE POLICY "rh reads own empresa"
  ON empresas FOR SELECT TO authenticated
  USING (
    id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );
