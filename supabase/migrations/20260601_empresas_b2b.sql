-- =====================================================
-- Malama — Módulo Empresas (B2B)
-- Migration: 20260601_empresas_b2b.sql
--
-- Empresas contratam a Malama como benefício corporativo.
-- RH gerencia colaboradores elegíveis; super admin gerencia
-- contas, assentos e MRR. Tudo aditivo — nenhuma tabela
-- existente é alterada.
-- =====================================================

-- Garante a função de updated_at (já existe no projeto; idempotente)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: o JWT do chamador é de um super_admin?
--
-- Lê app_metadata, NUNCA user_metadata. user_metadata é gravável pelo
-- próprio usuário (supabase.auth.updateUser({ data: { role } })), e esta
-- função é o ponto único que todas as policies administrativas consultam:
-- com user_metadata aqui, qualquer usuário do app se promovia a
-- super_admin e abria empresas, payouts, platform_settings e profiles de
-- uma vez só. Corrigido em 20260626_rbac_app_metadata.sql; a definição
-- foi alinhada aqui também porque este arquivo continua executável e
-- reaplicá-lo reintroduziria a falha em silêncio.
-- Auditoria de segurança, 01/09/2026 — achado F9.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false);
$$ LANGUAGE sql STABLE;

-- Helper: resolve o user_id de um e-mail (usado pela edge function invite-colaborador
-- com service_role para vincular colaboradores já cadastrados no app).
-- Execução restrita ao service_role — não exposto a anon/authenticated.
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = auth, public;

REVOKE ALL ON FUNCTION get_user_id_by_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO service_role;

-- =====================================================
-- 1. TABELA: empresas
-- =====================================================

CREATE TABLE IF NOT EXISTS empresas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  cnpj                  TEXT UNIQUE,
  responsavel_nome      TEXT,
  responsavel_email     TEXT,
  responsavel_telefone  TEXT,
  valor_por_assento     NUMERIC(10,2),
  max_assentos          INTEGER,
  status                TEXT NOT NULL DEFAULT 'ativa'
                          CHECK (status IN ('ativa', 'pausada', 'encerrada')),
  data_inicio           DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all empresas" ON empresas;
CREATE POLICY "super_admin all empresas"
  ON empresas FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- 2. TABELA: rh_usuarios
--    user_id vincula à conta auth (login do RH criado pelo super admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS rh_usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT UNIQUE NOT NULL,
  nome        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_usuarios_empresa ON rh_usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_rh_usuarios_user    ON rh_usuarios(user_id);

ALTER TABLE rh_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all rh_usuarios" ON rh_usuarios;
CREATE POLICY "super_admin all rh_usuarios"
  ON rh_usuarios FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "rh reads own record" ON rh_usuarios;
CREATE POLICY "rh reads own record"
  ON rh_usuarios FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 3. TABELA: empresa_colaboradores
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_colaboradores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'convidado'
                  CHECK (status IN ('convidado', 'ativo', 'removido')),
  data_adicao   TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_ativacao TIMESTAMPTZ,
  removido_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON empresa_colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_email   ON empresa_colaboradores(email);
CREATE INDEX IF NOT EXISTS idx_colaboradores_user    ON empresa_colaboradores(user_id);

ALTER TABLE empresa_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all colaboradores" ON empresa_colaboradores;
CREATE POLICY "super_admin all colaboradores"
  ON empresa_colaboradores FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RH acessa somente colaboradores da sua própria empresa
DROP POLICY IF EXISTS "rh reads own empresa colaboradores" ON empresa_colaboradores;
CREATE POLICY "rh reads own empresa colaboradores"
  ON empresa_colaboradores FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rh inserts own empresa colaboradores" ON empresa_colaboradores;
CREATE POLICY "rh inserts own empresa colaboradores"
  ON empresa_colaboradores FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rh updates own empresa colaboradores" ON empresa_colaboradores;
CREATE POLICY "rh updates own empresa colaboradores"
  ON empresa_colaboradores FOR UPDATE TO authenticated
  USING (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. TABELA: empresa_leads (captação pública da landing /empresas)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT,
  empresa           TEXT,
  email             TEXT,
  num_colaboradores TEXT,
  status            TEXT NOT NULL DEFAULT 'novo'
                      CHECK (status IN ('novo', 'em_contato', 'convertido', 'descartado')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE empresa_leads ENABLE ROW LEVEL SECURITY;

-- Insert público (formulário da landing, usuário não autenticado)
DROP POLICY IF EXISTS "anon insert empresa_leads" ON empresa_leads;
CREATE POLICY "anon insert empresa_leads"
  ON empresa_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "super_admin reads empresa_leads" ON empresa_leads;
CREATE POLICY "super_admin reads empresa_leads"
  ON empresa_leads FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "super_admin updates empresa_leads" ON empresa_leads;
CREATE POLICY "super_admin updates empresa_leads"
  ON empresa_leads FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
