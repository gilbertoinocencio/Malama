-- =====================================================================
-- Malama — correções da auditoria de segurança de 01/09/2026
-- Relatório: docs/security-audit/relatorio-auditoria-seguranca.pdf
--
-- COMO APLICAR
-- Este arquivo tem 4 BLOCOS independentes, cada um com seu BEGIN/COMMIT.
-- Rode UM BLOCO POR VEZ no SQL Editor. O editor aborta tudo no primeiro
-- erro; colar o arquivo inteiro faria um erro no bloco 3 desfazer os
-- blocos 1 e 2 junto.
--
--   Bloco 1 (P1) — F1: exames clínicos de outro paciente
--   Bloco 2 (P2) — F6: notificações forjadas na caixa do paciente
--   Bloco 3 (P2) — F2/F3: permissões por módulo do RH no servidor
--   Bloco 4 (P3) — F9: migrations legadas com user_metadata
--
-- Os blocos 1, 2 e 4 são idempotentes. O bloco 3 também, mas por um
-- caminho menos óbvio — ver o comentário lá.
-- =====================================================================


-- =====================================================================
-- BLOCO 1 (P1) — F1: médico lia o bucket inteiro de exames
--
-- A policy viva é a de 20260802_acesso_por_tipo_profissional.sql:175-186
-- (ela substituiu a de 20260422_storage_buckets.sql:43). O trecho:
--
--     AND EXISTS (
--       SELECT 1 FROM public.patient_exams pe
--         JOIN public.doctors d ON d.id = pe.doctor_id
--       WHERE d.user_id = auth.uid()
--         AND pe.file_url LIKE '%' || name      -- <= aqui
--     )
--
-- `name` está NU. E `doctors` TEM uma coluna `name`. Em SQL, um nome de
-- coluna não qualificado se liga primeiro ao FROM da própria subquery,
-- então isto NÃO compara com storage.objects.name: compara com o nome do
-- médico. Verificado em PostgreSQL 16, não deduzido.
--
-- As duas consequências:
--
--   1. Com um nome normal ("Dra Ana Souza"), a condição nunca casa e o
--      médico não abre exame NENHUM, nem dos próprios pacientes. A
--      visualização de exames do portal está quebrada hoje — em silêncio,
--      porque signStoragePaths engole o erro e devolve file_url = null.
--
--   2. Pior: o EXISTS deixou de ser correlacionado ao objeto. Se o médico
--      puser em `doctors.name` um sufixo qualquer de um file_url dele
--      (basta "pdf"), a subquery vira constante verdadeira e a policy
--      libera TODOS os objetos do bucket. `doctors_own_update` deixa o
--      médico editar o próprio nome, e protect_doctor_privileged_fields
--      protege status/nivel/rating mas não o nome. Um UPDATE no próprio
--      perfil abre os exames de toda a base.
--
-- A correção qualifica a coluna e, além disso, ancora o objeto na PASTA
-- do paciente da linha. A âncora é o que importa: o upload sempre grava
-- em `<patient_id>/...` (patientExamService.uploadExam) e a policy de
-- INSERT obriga a pasta a ser o auth.uid() do paciente, então é um
-- vínculo que o médico não consegue mover.
--
-- Junto vem `patient_exams_doctor_update`, que valida a posse no USING
-- mas termina em WITH CHECK (true) — o USING filtra a linha ANTES da
-- escrita, o WITH CHECK valida DEPOIS. Sem isso o médico reatribui uma
-- linha sua para outro paciente ou outro profissional; e seria o vetor
-- de leitura se alguém corrigisse a policy de storage só qualificando a
-- coluna, sem a âncora de pasta.
--
-- ATENÇÃO — MUDANÇA DE COMPORTAMENTO VISÍVEL: depois deste bloco os
-- médicos voltam a abrir os exames dos próprios pacientes. Isso é a
-- correção do item 1, não um efeito colateral.
-- =====================================================================

BEGIN;

-- ── 1.1 WITH CHECK igual ao USING ────────────────────────────────────
DROP POLICY IF EXISTS "patient_exams_doctor_update" ON public.patient_exams;
CREATE POLICY "patient_exams_doctor_update" ON public.patient_exams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = patient_exams.doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = patient_exams.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- ── 1.2 Trigger: congela o que nenhum dos dois lados pode reescrever ──
-- Mesmo padrão de protect_chat_message (20260815_security_hardening.sql:415).
-- A policy sozinha não basta: sem congelar doctor_id, o médico ainda
-- poderia reatribuir a linha para outro profissional e continuar
-- satisfazendo o WITH CHECK acima na ida.
CREATE OR REPLACE FUNCTION public.protect_patient_exam()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- service_role e triggers internos passam direto.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    -- Só o paciente cria exame, e sempre para si. Espelha a policy
    -- patient_exams_patient_crud, mas fecha também o caminho do arquivo:
    -- sem isto a linha pode nascer já apontando para a pasta de outro.
    IF NEW.patient_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Exame só pode ser criado pelo próprio paciente';
    END IF;
    IF NEW.file_url IS NULL
       OR NEW.file_url NOT LIKE (auth.uid()::text || '/%') THEN
      RAISE EXCEPTION 'Anexo de exame fora da pasta do paciente';
    END IF;
    RETURN NEW;
  END IF;

  -- ── UPDATE ────────────────────────────────────────────────────────
  -- Identidade da linha e ponteiro do arquivo nunca mudam, para ninguém.
  NEW.patient_id := OLD.patient_id;
  NEW.file_url   := OLD.file_url;
  NEW.created_at := OLD.created_at;

  -- O dono continua editando os metadados do próprio exame.
  IF OLD.patient_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Médico: só a revisão clínica. reviewExam() grava exatamente
  -- doctor_note / reviewed_at / reviewed_by — nada mais precisa passar.
  NEW.doctor_id       := OLD.doctor_id;
  NEW.consultation_id := OLD.consultation_id;
  NEW.chat_id         := OLD.chat_id;
  NEW.exam_name       := OLD.exam_name;
  NEW.exam_date       := OLD.exam_date;
  NEW.lab_name        := OLD.lab_name;
  NEW.file_name       := OLD.file_name;
  NEW.file_type       := OLD.file_type;
  NEW.file_size_kb    := OLD.file_size_kb;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_patient_exam ON public.patient_exams;
CREATE TRIGGER protect_patient_exam
  BEFORE INSERT OR UPDATE ON public.patient_exams
  FOR EACH ROW EXECUTE FUNCTION public.protect_patient_exam();

-- ── 1.3 Storage: qualifica a coluna e ancora na pasta do paciente ─────
-- A restrição `tipo_profissional = 'medico'` vem de 20260802 e é mantida:
-- psicólogo não abre exame. Sem ela esta migration ALARGARIA o acesso.
DROP POLICY IF EXISTS "doctor_exams_read" ON storage.objects;
CREATE POLICY "doctor_exams_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-exams'
    AND EXISTS (
      SELECT 1
      FROM public.patient_exams pe
      JOIN public.doctors d ON d.id = pe.doctor_id
      WHERE d.user_id = auth.uid()
        AND COALESCE(d.tipo_profissional, 'medico') = 'medico'
        -- QUALIFICADO. Nu, `name` se ligava a d.name (doctors.name).
        -- Igualdade, não LIKE: o sufixo tornava a comparação frouxa.
        AND pe.file_url = storage.objects.name
        -- Âncora: a pasta do objeto tem que ser o paciente DA LINHA.
        AND (storage.foldername(storage.objects.name))[1] = pe.patient_id::text
    )
  );

COMMIT;


-- =====================================================================
-- BLOCO 2 (P2) — F6: qualquer autenticado inseria notificação na caixa
--                    de qualquer paciente
--
-- A policy dizia, no comentário, "service role pode inserir". O SQL
-- escrito não dizia isso: sem cláusula TO, `FOR INSERT WITH CHECK (true)`
-- vale para authenticated e anon, e o Supabase concede INSERT por padrão.
-- Dava para forjar title/body/data de uma notificação exibida ao paciente
-- com a credibilidade da plataforma.
--
-- A tabela irmã já fazia certo desde o início — ver
-- 20260422_doctor_panel_notifications.sql:60, `WITH CHECK (false)`.
-- Aqui é a mesma regra. Os triggers que justificavam a policy
-- (notify_patient_on_chat_opened) são SECURITY DEFINER e escrevem como
-- o dono da função, então não dependem dela.
-- =====================================================================

BEGIN;

DROP POLICY IF EXISTS "patient_notifications_insert_service"
  ON public.patient_notifications;

CREATE POLICY "patient_notifications_insert_service"
  ON public.patient_notifications
  FOR INSERT TO authenticated
  WITH CHECK (false);

REVOKE INSERT ON public.patient_notifications FROM anon, authenticated;

COMMENT ON POLICY "patient_notifications_insert_service"
  ON public.patient_notifications IS
  'Ninguém insere por PostgREST. Notificação nasce só nos triggers/RPCs SECURITY DEFINER.';

COMMIT;


-- =====================================================================
-- BLOCO 3 (P2) — F2 e F3: permissão por módulo do RH só existia no
--                          navegador
--
-- A migration 20260836 criou o modelo de permissões (colaboradores,
-- saude_mental, absenteismo, plano_acao, importar, financeiro,
-- compliance, empresa, usuarios, apuracao) e o helper rh_tem_permissao().
-- Ele foi aplicado em empresa_colaboradores, nos relatos confidenciais,
-- na liderança e nas duas RPCs financeiras — e em mais nada. No resto, o
-- servidor só perguntava "é um rh_usuarios desta empresa?", e quem tinha
-- sessão do portal chamava a RPC direto do console.
--
-- POR QUE WRAPPER, E NÃO REESCRITA DO CORPO
-- Várias destas funções foram redefinidas 2 ou 3 vezes (rh_relatorio_jss
-- em 20260803 e 20260835; rh_relatorio_psicossocial em 20260723, 20260727
-- e 20260803). Colar um corpo aqui significaria escolher uma dessas
-- versões — e escolher a errada regride o relatório em silêncio, sem
-- erro nenhum. Renomear para __base e criar um wrapper preserva o corpo
-- vigente byte a byte, seja ele qual for. O diff fica pequeno e
-- reversível: para desfazer, dropa o wrapper e renomeia de volta.
--
-- IDEMPOTÊNCIA
-- O DO abaixo só renomeia se `<nome>__base` ainda não existir. Rodar o
-- bloco duas vezes não empilha wrapper sobre wrapper.
--
-- O MÓDULO DE CADA RPC saiu de qual tela a consome, não de palpite.
-- Três casos que contrariam a intuição e foram conferidos no código:
--   • rh_certificado_colaboradores devolve a nominata, mas vive em
--     RhDocumentos → o gate é 'compliance', não 'colaboradores';
--   • rh_metricas_bemestar / rh_evolucao_bemestar estão em RhCompliance
--     → 'compliance', não 'saude_mental';
--   • rh_relatorio_jss e rh_relatorio_psicossocial são lidas por
--     RhSaudeMental, RhDocumentos E PlanoAcaoKanban → aceitam qualquer
--     um dos três módulos, senão duas telas legítimas quebram.
-- =====================================================================

BEGIN;

-- ── 3.1 Guard reutilizável ───────────────────────────────────────────
-- Aceita vários módulos porque algumas telas compartilham a mesma RPC.
-- rh_tem_permissao() já exige conta ativa e trata `principal` como
-- coringa, então isto também fecha a falta de `AND ativo` que várias
-- RPCs tinham.
CREATE OR REPLACE FUNCTION public.rh_exige_modulo(VARIADIC p_modulos TEXT[])
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m TEXT;
BEGIN
  FOREACH m IN ARRAY p_modulos LOOP
    IF public.rh_tem_permissao(m) THEN RETURN; END IF;
  END LOOP;
  RAISE EXCEPTION 'Acesso restrito: este usuário não tem o módulo % liberado',
    array_to_string(p_modulos, ' nem ')
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.rh_exige_modulo(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_exige_modulo(TEXT[]) TO authenticated;

-- ── 3.2 Policies das tabelas empresa_* ───────────────────────────────
-- Todas ganham o módulo E o `AND ativo` que faltava. As policies de
-- super_admin já existentes não são tocadas: o painel admin (que lê
-- empresa_faturas e empresa_colaboradores em doctorPortalService) segue
-- passando por is_super_admin().

-- Absenteísmo: CID e dias de afastamento são dado de saúde.
DROP POLICY IF EXISTS "rh reads own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh reads own afastamentos"
  ON empresa_afastamentos FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh inserts own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh inserts own afastamentos"
  ON empresa_afastamentos FOR INSERT TO authenticated
  WITH CHECK (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh deletes own afastamentos" ON empresa_afastamentos;
CREATE POLICY "rh deletes own afastamentos"
  ON empresa_afastamentos FOR DELETE TO authenticated
  USING (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh reads own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh reads own ambulatorio"
  ON empresa_ambulatorio FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh inserts own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh inserts own ambulatorio"
  ON empresa_ambulatorio FOR INSERT TO authenticated
  WITH CHECK (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh deletes own ambulatorio" ON empresa_ambulatorio;
CREATE POLICY "rh deletes own ambulatorio"
  ON empresa_ambulatorio FOR DELETE TO authenticated
  USING (
    public.rh_tem_permissao('absenteismo')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Financeiro.
DROP POLICY IF EXISTS "rh reads own empresa faturas" ON empresa_faturas;
CREATE POLICY "rh reads own empresa faturas"
  ON empresa_faturas FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('financeiro')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Compliance.
DROP POLICY IF EXISTS "rh reads own compliance docs" ON empresa_compliance_docs;
CREATE POLICY "rh reads own compliance docs"
  ON empresa_compliance_docs FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('compliance')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh inserts own compliance docs" ON empresa_compliance_docs;
CREATE POLICY "rh inserts own compliance docs"
  ON empresa_compliance_docs FOR INSERT TO authenticated
  WITH CHECK (
    public.rh_tem_permissao('compliance')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh reads own certificados" ON empresa_certificados_esg;
CREATE POLICY "rh reads own certificados"
  ON empresa_certificados_esg FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('compliance')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

DROP POLICY IF EXISTS "rh reads own relatorios emitidos" ON empresa_relatorios_emitidos;
CREATE POLICY "rh reads own relatorios emitidos"
  ON empresa_relatorios_emitidos FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('compliance')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Importação (eSocial).
DROP POLICY IF EXISTS "rh reads own ingestao_lotes" ON public.empresa_ingestao_lotes;
CREATE POLICY "rh reads own ingestao_lotes"
  ON public.empresa_ingestao_lotes FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('importar')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Saúde mental.
DROP POLICY IF EXISTS "rh reads own empresa campaigns" ON psychosocial_campaigns;
CREATE POLICY "rh reads own empresa campaigns"
  ON psychosocial_campaigns FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('saude_mental')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Plano de ação.
DROP POLICY IF EXISTS "rh reads own planos acao" ON empresa_planos_acao;
CREATE POLICY "rh reads own planos acao"
  ON empresa_planos_acao FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('plano_acao')
    AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- ── 3.3 RPCs: wrapper com o gate, corpo original intacto ─────────────
-- Renomeia cada original para <nome>__base, preservando o corpo byte a byte,
-- e recria o nome publico como um wrapper que so checa a permissao.
DO $rename$
DECLARE r record; v_faltando TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('rh_absenteismo_resumo', 'date,date'),
    ('rh_ambulatorio_resumo', 'date,date'),
    ('rh_lancar_afastamento', 'text,character,integer,date'),
    ('rh_lancar_ambulatorio', 'text,text,date'),
    ('rh_matriz_psicossocial', 'date,date'),
    ('rh_criar_campanha', 'text,date,date,text[]'),
    ('rh_encerrar_campanha', 'uuid,boolean'),
    ('rh_campanha_participacao', 'uuid'),
    ('rh_campanha_links_setor', 'uuid'),
    ('rh_campanha_links', 'uuid'),
    ('rh_alvo_total', ''),
    ('rh_criar_plano_acao', 'text,text,text,text,text,text,text,date'),
    ('rh_atualizar_plano_acao', 'uuid,text,text'),
    ('rh_excluir_plano_acao', 'uuid'),
    ('rh_planos_acao_resumo', 'date,date'),
    ('rh_vincular_cpfs', 'jsonb'),
    ('rh_ingerir_afastamentos', 'jsonb,text,text,integer,integer'),
    ('rh_lotes_ingestao', 'integer'),
    ('rh_cobertura_cpf', ''),
    ('rh_alocar_psicologo', 'uuid,boolean'),
    ('rh_definir_setor_colaborador', 'uuid,text'),
    ('rh_relatorio_psicossocial', 'date,date'),
    ('rh_relatorio_jss', 'date,date'),
    ('rh_registrar_relatorio', 'text,date,date,jsonb,text'),
    ('rh_obter_relatorio_emitido', 'uuid'),
    ('rh_metricas_bemestar', ''),
    ('rh_evolucao_bemestar', ''),
    ('rh_compliance_metricas', ''),
    ('rh_certificado_colaboradores', ''),
    ('rh_listar_relatorios_emitidos', ''),
    ('rh_listar_campanhas', ''),
    ('rh_listar_planos_acao', ''),
    ('rh_resumo_psicologico', '')
  ) AS t(nome, args)
  LOOP
    -- Ja renomeada numa execucao anterior: nada a fazer.
    IF to_regprocedure(format('public.%s__base(%s)', r.nome, r.args)) IS NOT NULL THEN
      CONTINUE;
    END IF;
    IF to_regprocedure(format('public.%s(%s)', r.nome, r.args)) IS NULL THEN
      v_faltando := v_faltando || format('%s(%s)', r.nome, r.args);
      CONTINUE;
    END IF;
    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I',
                   r.nome, r.args, r.nome || '__base');
  END LOOP;

  -- Falha alto em vez de criar um wrapper que aponta para o vazio.
  IF cardinality(v_faltando) > 0 THEN
    RAISE EXCEPTION 'Nao encontrei estas funcoes neste banco (assinatura mudou ou a migration de origem nao foi aplicada): %', array_to_string(v_faltando, ', ');
  END IF;
END
$rename$;

CREATE OR REPLACE FUNCTION public.rh_absenteismo_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_absenteismo_resumo__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_absenteismo_resumo__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_absenteismo_resumo(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_absenteismo_resumo(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_ambulatorio_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_ambulatorio_resumo__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_ambulatorio_resumo__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_ambulatorio_resumo(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_ambulatorio_resumo(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lancar_afastamento(p_setor TEXT, p_cid_grupo CHAR, p_dias INTEGER, p_data_inicio DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_lancar_afastamento__base(p_setor, p_cid_grupo, p_dias, p_data_inicio);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_lancar_afastamento__base(text,character,integer,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_lancar_afastamento(text,character,integer,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lancar_afastamento(text,character,integer,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lancar_ambulatorio(p_setor TEXT, p_categoria TEXT, p_data DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_lancar_ambulatorio__base(p_setor, p_categoria, p_data);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_lancar_ambulatorio__base(text,text,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_lancar_ambulatorio(text,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lancar_ambulatorio(text,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_matriz_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_matriz_psicossocial__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_matriz_psicossocial__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_matriz_psicossocial(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_matriz_psicossocial(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_criar_campanha(p_instrument TEXT, p_janela_inicio DATE, p_janela_fim DATE, p_setores TEXT[] DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_criar_campanha__base(p_instrument, p_janela_inicio, p_janela_fim, p_setores);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_criar_campanha__base(text,date,date,text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_criar_campanha(text,date,date,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_criar_campanha(text,date,date,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_encerrar_campanha(p_campaign_id UUID, p_cancelar BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_encerrar_campanha__base(p_campaign_id, p_cancelar);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_encerrar_campanha__base(uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_encerrar_campanha(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_encerrar_campanha(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_participacao__base(p_campaign_id);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_campanha_participacao__base(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_campanha_participacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_campanha_participacao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_campanha_links_setor(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_links_setor__base(p_campaign_id);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_campanha_links_setor__base(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_campanha_links_setor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_campanha_links_setor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_campanha_links(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_links__base(p_campaign_id);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_campanha_links__base(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_campanha_links(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_campanha_links(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_alvo_total()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_alvo_total__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_alvo_total__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_alvo_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_alvo_total() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_criar_plano_acao(p_setor TEXT, p_origem TEXT, p_fator TEXT, p_risco_descricao TEXT, p_medida TEXT, p_nivel_controle TEXT, p_responsavel TEXT, p_prazo DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_criar_plano_acao__base(p_setor, p_origem, p_fator, p_risco_descricao, p_medida, p_nivel_controle, p_responsavel, p_prazo);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_criar_plano_acao__base(text,text,text,text,text,text,text,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_criar_plano_acao(text,text,text,text,text,text,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_criar_plano_acao(text,text,text,text,text,text,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_atualizar_plano_acao(p_id UUID, p_status TEXT, p_evidencia TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_atualizar_plano_acao__base(p_id, p_status, p_evidencia);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_atualizar_plano_acao__base(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_atualizar_plano_acao(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_atualizar_plano_acao(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_excluir_plano_acao(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_excluir_plano_acao__base(p_id);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_excluir_plano_acao__base(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_excluir_plano_acao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_excluir_plano_acao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_planos_acao_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_planos_acao_resumo__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_planos_acao_resumo__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_planos_acao_resumo(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_planos_acao_resumo(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_vincular_cpfs(p_pares JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_vincular_cpfs__base(p_pares);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_vincular_cpfs__base(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_vincular_cpfs(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_vincular_cpfs(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_ingerir_afastamentos(p_eventos JSONB, p_arquivo TEXT DEFAULT NULL, p_arquivo_hash TEXT DEFAULT NULL, p_sem_destino INT DEFAULT 0, p_eventos_lidos INT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_ingerir_afastamentos__base(p_eventos, p_arquivo, p_arquivo_hash, p_sem_destino, p_eventos_lidos);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_ingerir_afastamentos__base(jsonb,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_ingerir_afastamentos(jsonb,text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_ingerir_afastamentos(jsonb,text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_lotes_ingestao(p_limite INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_lotes_ingestao__base(p_limite);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_lotes_ingestao__base(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_lotes_ingestao(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_lotes_ingestao(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_cobertura_cpf()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_cobertura_cpf__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_cobertura_cpf__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_cobertura_cpf() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_cobertura_cpf() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_alocar_psicologo(p_colaborador_id UUID, p_ativar BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN public.rh_alocar_psicologo__base(p_colaborador_id, p_ativar);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_alocar_psicologo__base(uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_alocar_psicologo(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_alocar_psicologo(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_definir_setor_colaborador(p_colaborador_id UUID, p_setor TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN public.rh_definir_setor_colaborador__base(p_colaborador_id, p_setor);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_definir_setor_colaborador__base(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_definir_setor_colaborador(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_definir_setor_colaborador(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_relatorio_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental', 'compliance', 'plano_acao');
  RETURN public.rh_relatorio_psicossocial__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_relatorio_psicossocial__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_relatorio_psicossocial(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_relatorio_psicossocial(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_relatorio_jss(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental', 'compliance', 'plano_acao');
  RETURN public.rh_relatorio_jss__base(p_inicio, p_fim);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_relatorio_jss__base(date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_relatorio_jss(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_relatorio_jss(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_registrar_relatorio(p_tipo TEXT, p_periodo_inicio DATE, p_periodo_fim DATE, p_payload JSONB, p_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance', 'saude_mental');
  RETURN public.rh_registrar_relatorio__base(p_tipo, p_periodo_inicio, p_periodo_fim, p_payload, p_hash);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_registrar_relatorio__base(text,date,date,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_registrar_relatorio(text,date,date,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_registrar_relatorio(text,date,date,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_obter_relatorio_emitido(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance', 'saude_mental');
  RETURN public.rh_obter_relatorio_emitido__base(p_id);
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_obter_relatorio_emitido__base(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_obter_relatorio_emitido(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_obter_relatorio_emitido(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_metricas_bemestar()
RETURNS TABLE (
  agua_com_dados       INT,
  agua_melhoraram      INT,
  proteina_com_dados   INT,
  proteina_melhoraram  INT,
  atividade_com_dados  INT,
  atividade_melhoraram INT,
  ativos_total         INT,
  ativos_engajados     INT,
  dias_em_flow         INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_metricas_bemestar__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_metricas_bemestar__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_metricas_bemestar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_metricas_bemestar() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_evolucao_bemestar()
RETURNS TABLE (
  mes             DATE,
  n_contribuintes INT,
  media_agua      NUMERIC,
  media_proteina  NUMERIC,
  media_minutos   NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_evolucao_bemestar__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_evolucao_bemestar__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_evolucao_bemestar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_evolucao_bemestar() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_compliance_metricas()
RETURNS TABLE (
  empresa_id              UUID,
  nome                    TEXT,
  cnpj                    TEXT,
  data_inicio             DATE,
  colaboradores_elegiveis INT,
  colaboradores_ativos    INT,
  consultas_realizadas    INT,
  modo_mental             BOOLEAN,
  modo_metabolico         BOOLEAN,
  consultas_psicologo     INT,
  consultas_medico        INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_compliance_metricas__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_compliance_metricas__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_compliance_metricas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_compliance_metricas() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_certificado_colaboradores()
RETURNS TABLE (
  colaborador_id UUID,
  nome           TEXT,
  setor          TEXT,
  funcao         TEXT,
  data_adicao    TIMESTAMPTZ,
  data_ativacao  TIMESTAMPTZ,
  data_saida     TIMESTAMPTZ,
  status         TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_certificado_colaboradores__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_certificado_colaboradores__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_certificado_colaboradores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_certificado_colaboradores() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_listar_relatorios_emitidos()
RETURNS TABLE (
  id                UUID,
  tipo              TEXT,
  numero_doc        TEXT,
  periodo_inicio    DATE,
  periodo_fim       DATE,
  hash_verificacao  TEXT,
  emitido_por_nome  TEXT,
  emitido_em        TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_listar_relatorios_emitidos__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_listar_relatorios_emitidos__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_listar_relatorios_emitidos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_relatorios_emitidos() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_listar_campanhas()
RETURNS TABLE (
  id UUID, instrument TEXT, instrument_nome TEXT, eixo TEXT,
  janela_inicio DATE, janela_fim DATE, setores TEXT[], status TEXT,
  encerrada_em TIMESTAMPTZ, created_at TIMESTAMPTZ,
  n_convidados INT, n_respondentes INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN QUERY SELECT * FROM public.rh_listar_campanhas__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_listar_campanhas__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_listar_campanhas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_campanhas() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_listar_planos_acao()
RETURNS TABLE (
  id                 UUID,
  setor              TEXT,
  origem             TEXT,
  fator              TEXT,
  risco_descricao    TEXT,
  medida             TEXT,
  nivel_controle     TEXT,
  responsavel        TEXT,
  prazo              DATE,
  status             TEXT,
  evidencia          TEXT,
  concluida_em       DATE,
  atrasada           BOOLEAN,
  created_at         TIMESTAMPTZ,
  lideranca_ciclo_id UUID,
  lideranca_setor    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN QUERY SELECT * FROM public.rh_listar_planos_acao__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_listar_planos_acao__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_listar_planos_acao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_listar_planos_acao() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_resumo_psicologico()
RETURNS TABLE (
  plano_ativo     BOOLEAN,
  max_assentos    INT,
  assentos_em_uso INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN QUERY SELECT * FROM public.rh_resumo_psicologico__base();
END;
$wrap$;
REVOKE ALL ON FUNCTION public.rh_resumo_psicologico__base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_resumo_psicologico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_resumo_psicologico() TO authenticated;
COMMIT;


-- =====================================================================
-- BLOCO 4 (P3) — F9: migrations legadas ainda checam papel por
--                     user_metadata
--
-- user_metadata é gravável pelo próprio usuário
-- (supabase.auth.updateUser({ data: { role: 'super_admin' } })), então
-- toda checagem de privilégio que o lê é auto-promoção.
-- 20260626_rbac_app_metadata.sql fechou isso e o banco de produção está
-- correto HOJE. O risco é de reintrodução: os quatro arquivos vulneráveis
-- continuam executáveis em supabase/migrations/, e aqui as migrations são
-- aplicadas à mão pelo SQL Editor, sem registro do que já rodou. Rodar um
-- deles de novo — num ambiente novo, num restore, por engano de ordem —
-- recria a policy vulnerável sem erro nenhum.
--
-- Os quatro arquivos foram reescritos para chamar is_super_admin(), de
-- modo que reaplicá-los em qualquer ordem passou a ser inofensivo. Este
-- bloco é a rede de baixo: reafirma o estado correto e falha alto se
-- alguma policy ou função ainda referenciar user_metadata.
-- =====================================================================

BEGIN;

-- ── 4.1 Reafirma as definições corretas (idempotente) ────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_super_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins manage payouts" ON payouts;
CREATE POLICY "Admins manage payouts"
  ON payouts FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admins can manage settings" ON platform_settings;
CREATE POLICY "Admins can manage settings"
  ON platform_settings FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ── 4.2 Teste de smoke: nada de privilégio pode ler user_metadata ────
-- Roda dentro da transação: se achar algo, o bloco inteiro volta atrás e
-- o operador vê exatamente qual objeto ficou para trás.
DO $smoke$
DECLARE v_achados TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT array_agg(format('policy %I em %I.%I', policyname, schemaname, tablename))
    INTO v_achados
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
    AND (coalesce(qual, '') LIKE '%user_metadata%'
      OR coalesce(with_check, '') LIKE '%user_metadata%');

  IF v_achados IS NOT NULL AND cardinality(v_achados) > 0 THEN
    RAISE EXCEPTION 'Ainda há checagem de papel por user_metadata: %',
      array_to_string(v_achados, '; ');
  END IF;

  -- TODA função de public, não só as SECURITY DEFINER: is_super_admin()
  -- é `LANGUAGE sql STABLE` comum, e era justamente ela que lia
  -- user_metadata em 20260601_empresas_b2b.sql. Um filtro por prosecdef
  -- deixaria passar exatamente o pior caso.
  SELECT array_agg(format('função %I.%I', n.nspname, p.proname))
    INTO v_achados
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND pg_get_functiondef(p.oid) LIKE '%user_metadata%';

  IF v_achados IS NOT NULL AND cardinality(v_achados) > 0 THEN
    RAISE EXCEPTION 'Função ainda lendo user_metadata para decidir privilégio: %',
      array_to_string(v_achados, '; ');
  END IF;
END
$smoke$;

COMMIT;


-- =====================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO (não altera nada — pode rodar solto)
-- =====================================================================
--
-- 1. Nenhuma policy permissiva sobrou nas tabelas corrigidas:
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('patient_exams','patient_notifications',
--                       'empresa_afastamentos','empresa_faturas')
--   ORDER BY tablename, policyname;
--
-- 2. Os 33 wrappers estão no ar e os __base ficaram sem GRANT:
--
--   SELECT p.proname,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_executa
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname LIKE 'rh\_%'
--   ORDER BY p.proname;
--
--   Esperado: toda linha terminada em __base com authenticated_executa = false.
--
-- 3. Teste funcional do gate (com a sessão de um RH sem o módulo):
--
--   SELECT rh_absenteismo_resumo('2026-01-01','2026-12-31');
--   -- esperado: ERROR 42501 "Acesso restrito: este usuário não tem o
--   --           módulo absenteismo liberado"
-- =====================================================================
