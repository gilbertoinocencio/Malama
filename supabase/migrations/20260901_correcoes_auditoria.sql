-- =====================================================================
-- Malama — correções da auditoria de segurança de 01/09/2026
-- Relatório: docs/security-audit/relatorio-auditoria-seguranca.pdf
--
-- COMO APLICAR
-- Quatro BLOCOS independentes, cada um com seu BEGIN/COMMIT. Rode UM
-- BLOCO POR VEZ no SQL Editor: o editor aborta tudo no primeiro erro, e
-- colar o arquivo inteiro faria uma falha no bloco 3 desfazer os blocos
-- 1 e 2 junto.
--
--   Bloco 1 (P1) — F1: leitura do bucket de exames
--   Bloco 2 (P2) — F6: notificações forjadas na caixa do paciente
--   Bloco 3 (P2) — F2/F3: permissões por módulo do RH no servidor
--   Bloco 4 (P3) — F9: migrations legadas com user_metadata
--
-- ESTE BANCO NÃO É IGUAL AO REPOSITÓRIO
-- A primeira execução mostrou isso: dois objetos do repositório não
-- foram encontrados aqui. Confirmado via docs/security-audit/descoberta.sql:
--
--   • public.patient_exams: EXISTE (o erro veio de outra causa — a tabela
--     foi confirmada presente na consulta 1 de descoberta.sql).
--
--   • rh_campanha_links(uuid): NÃO existe, e não é lacuna de aplicação —
--     é código morto. Definida em duas migrations do repositório
--     (20260731_campanha_links.sql, 20260803_corrige_duplicata_colaborador.sql),
--     foi substituída por rh_campanha_links_setor, e o frontend nunca chama
--     a versão sem _setor (grep em src/ confirma). Por isso ela NÃO entra
--     na lista de RPCs protegidas abaixo — não há nada a proteger.
--
-- As demais 32 RPCs do bloco 3 e todas as 9 tabelas empresa_* foram
-- conferidas uma a uma contra este banco (mesma consulta) e batem campo a
-- campo com o que a migração espera.
--
-- Por isso os blocos 1 e 3 checam o que existe antes de agir:
--   • objeto AUSENTE  → pula e avisa por NOTICE (não há o que proteger);
--   • objeto PRESENTE com assinatura DIFERENTE da esperada → ABORTA, e
--     diz qual. Esse caso não é pulável: a função ficaria viva e sem
--     gate, que é exatamente o buraco a fechar.
--
-- Leia os NOTICEs ao final de cada bloco. Eles são a lista do que este
-- banco não tem.
-- =====================================================================


-- =====================================================================
-- BLOCO 1 (P1) — F1: médico lia o bucket inteiro de exames
--
-- A policy vulnerável é a de 20260802_acesso_por_tipo_profissional.sql:175
-- (substituiu a de 20260422_storage_buckets.sql:43):
--
--     AND pe.file_url LIKE '%' || name      -- <= `name` NU
--
-- `name` está sem qualificação, e `doctors` — que está no FROM da própria
-- subquery — TEM uma coluna `name`. Em SQL a referência nua se liga ao
-- FROM mais interno, então isto não compara com storage.objects.name:
-- compara com o NOME DO MÉDICO. Verificado em PostgreSQL 16.
--
-- Duas consequências:
--
--   1. Com nome normal a condição nunca casa: o médico não abre exame
--      NENHUM, nem dos próprios pacientes. Quebrado, e em silêncio —
--      signStoragePaths engole o erro e devolve file_url = null.
--
--   2. O EXISTS deixou de ser correlacionado ao objeto. Se o médico puser
--      em doctors.name um sufixo de um file_url dele (basta "pdf"), a
--      subquery vira constante verdadeira e libera TODOS os objetos do
--      bucket. doctors_own_update permite editar o próprio nome, e
--      protect_doctor_privileged_fields não protege o nome.
--
-- A correção qualifica a coluna e ancora o objeto na PASTA do paciente da
-- linha — o upload sempre grava em `<patient_id>/...` e a policy de INSERT
-- obriga a pasta a ser o auth.uid(), então é um vínculo que o médico não
-- move. Preserva `tipo_profissional = 'medico'` de 20260802; sem isso a
-- correção ALARGARIA o acesso a psicólogos.
--
-- Junto vem patient_exams_doctor_update, que valida a posse no USING mas
-- termina em WITH CHECK (true) — o USING filtra ANTES da escrita, o WITH
-- CHECK valida DEPOIS.
--
-- MUDANÇA DE COMPORTAMENTO VISÍVEL: onde a tabela existir, os médicos
-- voltam a abrir os exames dos próprios pacientes. É a correção do item
-- 1, não efeito colateral.
-- =====================================================================

BEGIN;

-- A função do trigger pode ser criada sempre: plpgsql não resolve a
-- tabela no momento da criação.
CREATE OR REPLACE FUNCTION public.protect_patient_exam()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  -- service_role e triggers internos passam direto.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    -- Só o paciente cria exame, e sempre para si. Espelha a policy
    -- patient_exams_patient_crud e fecha também o caminho do arquivo:
    -- sem isto a linha pode nascer apontando para a pasta de outro.
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
  -- Identidade da linha e ponteiro do arquivo não mudam, para ninguém.
  NEW.patient_id := OLD.patient_id;
  NEW.file_url   := OLD.file_url;
  NEW.created_at := OLD.created_at;

  -- O dono segue editando os metadados do próprio exame.
  IF OLD.patient_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Médico: só a revisão clínica. reviewExam() grava exatamente
  -- doctor_note / reviewed_at / reviewed_by.
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
$fn$;

-- O resto do bloco depende da tabela existir neste banco.
DO $b1$
BEGIN
  IF to_regclass('public.patient_exams') IS NULL THEN
    RAISE NOTICE '[1] public.patient_exams NAO existe neste banco — F1 nao se aplica aqui.';
    RAISE NOTICE '[1] Nada foi alterado. Se o portal medico deveria ter exames, o que falta';
    RAISE NOTICE '[1] e a migration 20260422_doctor_panel_v2.sql, nao esta correcao.';
    RETURN;
  END IF;

  -- 1.1 WITH CHECK igual ao USING
  EXECUTE $ddl$
    DROP POLICY IF EXISTS "patient_exams_doctor_update" ON public.patient_exams
  $ddl$;
  EXECUTE $ddl$
    CREATE POLICY "patient_exams_doctor_update" ON public.patient_exams
      FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.doctors d
                WHERE d.id = patient_exams.doctor_id AND d.user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.doctors d
                WHERE d.id = patient_exams.doctor_id AND d.user_id = auth.uid())
      )
  $ddl$;

  -- 1.2 Trigger congelando o que nenhum dos dois lados reescreve
  EXECUTE $ddl$
    DROP TRIGGER IF EXISTS protect_patient_exam ON public.patient_exams
  $ddl$;
  EXECUTE $ddl$
    CREATE TRIGGER protect_patient_exam
      BEFORE INSERT OR UPDATE ON public.patient_exams
      FOR EACH ROW EXECUTE FUNCTION public.protect_patient_exam()
  $ddl$;

  -- 1.3 Storage: qualifica a coluna e ancora na pasta do paciente
  EXECUTE $ddl$
    DROP POLICY IF EXISTS "doctor_exams_read" ON storage.objects
  $ddl$;
  EXECUTE $ddl$
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
            AND pe.file_url = storage.objects.name
            AND (storage.foldername(storage.objects.name))[1] = pe.patient_id::text
        )
      )
  $ddl$;

  RAISE NOTICE '[1] F1 corrigido: policy de UPDATE, trigger e policy de storage.';
END
$b1$;

COMMIT;


-- =====================================================================
-- BLOCO 2 (P2) — F6: qualquer autenticado inseria notificação na caixa
--                    de qualquer paciente
--
-- A policy dizia, no comentário, "service role pode inserir". O SQL não
-- dizia isso: sem cláusula TO, `FOR INSERT WITH CHECK (true)` vale para
-- authenticated e anon, e o Supabase concede INSERT por padrão. Dava para
-- forjar title/body/data de uma notificação exibida ao paciente com a
-- credibilidade da plataforma.
--
-- A tabela irmã já fazia certo desde o início — ver
-- 20260422_doctor_panel_notifications.sql:60, `WITH CHECK (false)`.
-- Os triggers que justificavam a policy são SECURITY DEFINER e escrevem
-- como o dono da função, então não dependem dela.
-- =====================================================================

BEGIN;

DO $b2$
BEGIN
  IF to_regclass('public.patient_notifications') IS NULL THEN
    RAISE NOTICE '[2] public.patient_notifications NAO existe neste banco — F6 nao se aplica.';
    RETURN;
  END IF;

  EXECUTE $ddl$
    DROP POLICY IF EXISTS "patient_notifications_insert_service"
      ON public.patient_notifications
  $ddl$;
  EXECUTE $ddl$
    CREATE POLICY "patient_notifications_insert_service"
      ON public.patient_notifications
      FOR INSERT TO authenticated
      WITH CHECK (false)
  $ddl$;
  EXECUTE $ddl$
    REVOKE INSERT ON public.patient_notifications FROM anon, authenticated
  $ddl$;
  EXECUTE $ddl$
    COMMENT ON POLICY "patient_notifications_insert_service"
      ON public.patient_notifications IS
      'Ninguem insere por PostgREST. Notificacao nasce so nos triggers/RPCs SECURITY DEFINER.'
  $ddl$;

  RAISE NOTICE '[2] F6 corrigido.';
END
$b2$;

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
-- sessão do portal chamava a RPC direto do console do navegador.
--
-- POR QUE WRAPPER, E NÃO REESCRITA DO CORPO
-- Várias destas funções foram redefinidas 2 ou 3 vezes (rh_relatorio_jss
-- em 20260803 e 20260835; rh_relatorio_psicossocial em 20260723, 20260727
-- e 20260803). Colar um corpo aqui significaria escolher uma dessas
-- versões — e escolher a errada regride o relatório em silêncio. Renomear
-- para __base e criar um wrapper preserva o corpo vigente byte a byte,
-- seja ele qual for. Para desfazer: dropa o wrapper e renomeia de volta.
--
-- O MÓDULO DE CADA RPC saiu de qual tela a consome, não de palpite. Três
-- casos que contrariam a intuição e foram conferidos no código:
--   • rh_certificado_colaboradores devolve a nominata, mas vive em
--     RhDocumentos → o gate é 'compliance', não 'colaboradores';
--   • rh_metricas_bemestar / rh_evolucao_bemestar estão em RhCompliance
--     → 'compliance', não 'saude_mental';
--   • rh_relatorio_jss e rh_relatorio_psicossocial são lidas por
--     RhSaudeMental, RhDocumentos E PlanoAcaoKanban → aceitam qualquer um
--     dos três módulos, senão duas telas legítimas quebram.
--
-- IDEMPOTÊNCIA: só renomeia se `<nome>__base` ainda não existir.
-- =====================================================================

BEGIN;

-- ── 3.1 Guard reutilizável ───────────────────────────────────────────
-- Aceita vários módulos porque algumas telas compartilham a mesma RPC.
-- rh_tem_permissao() já exige conta ativa e trata `principal` como
-- coringa, então isto também fecha a falta de `AND ativo` que várias
-- RPCs tinham.
DO $pre$
BEGIN
  IF to_regprocedure('public.rh_tem_permissao(text)') IS NULL THEN
    RAISE EXCEPTION 'rh_tem_permissao(text) nao existe neste banco. Aplique antes a '
                    'migration 20260836_rh_permissoes_e_relatos_confidenciais.sql — '
                    'sem ela o bloco 3 nao tem em que se apoiar.';
  END IF;
END
$pre$;

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
-- Em loop, e nao 14 blocos soltos, para poder PULAR tabela que nao
-- existe neste banco em vez de abortar o bloco inteiro. As policies de
-- super_admin nao sao tocadas: o painel admin segue por is_super_admin().
DO $pol$
DECLARE
  r record;
  v_cond TEXT;
  v_pulados TEXT[] := ARRAY[]::TEXT[];
  v_feitos INT := 0;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('empresa_afastamentos', 'rh reads own afastamentos', 'SELECT', 'absenteismo'),
    ('empresa_afastamentos', 'rh inserts own afastamentos', 'INSERT', 'absenteismo'),
    ('empresa_afastamentos', 'rh deletes own afastamentos', 'DELETE', 'absenteismo'),
    ('empresa_ambulatorio', 'rh reads own ambulatorio', 'SELECT', 'absenteismo'),
    ('empresa_ambulatorio', 'rh inserts own ambulatorio', 'INSERT', 'absenteismo'),
    ('empresa_ambulatorio', 'rh deletes own ambulatorio', 'DELETE', 'absenteismo'),
    ('empresa_faturas', 'rh reads own empresa faturas', 'SELECT', 'financeiro'),
    ('empresa_compliance_docs', 'rh reads own compliance docs', 'SELECT', 'compliance'),
    ('empresa_compliance_docs', 'rh inserts own compliance docs', 'INSERT', 'compliance'),
    ('empresa_certificados_esg', 'rh reads own certificados', 'SELECT', 'compliance'),
    ('empresa_relatorios_emitidos', 'rh reads own relatorios emitidos', 'SELECT', 'compliance'),
    ('empresa_ingestao_lotes', 'rh reads own ingestao_lotes', 'SELECT', 'importar'),
    ('psychosocial_campaigns', 'rh reads own empresa campaigns', 'SELECT', 'saude_mental'),
    ('empresa_planos_acao', 'rh reads own planos acao', 'SELECT', 'plano_acao')
  ) AS t(tabela, policy, cmd, modulo)
  LOOP
    IF to_regclass('public.' || r.tabela) IS NULL THEN
      v_pulados := v_pulados || r.tabela;
      CONTINUE;
    END IF;
    v_cond := format(
      'public.rh_tem_permissao(%L) AND empresa_id IN (SELECT empresa_id FROM rh_usuarios WHERE user_id = auth.uid() AND ativo)',
      r.modulo);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policy, r.tabela);
    IF r.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', r.policy, r.tabela, v_cond);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)', r.policy, r.tabela, r.cmd, v_cond);
    END IF;
    v_feitos := v_feitos + 1;
  END LOOP;

  RAISE NOTICE '[3.2] % policies aplicadas.', v_feitos;
  IF cardinality(v_pulados) > 0 THEN
    RAISE NOTICE '[3.2] PULADAS (tabela nao existe neste banco): %',
      array_to_string(v_pulados, ', ');
  END IF;
END
$pol$;

-- ── 3.3 RPCs: wrapper com o gate, corpo original intacto ─────────────
-- Cada entrada carrega o DDL do proprio wrapper, para que a criacao possa
-- ser condicional: funcao que nao existe neste banco e PULADA (nao ha o
-- que proteger), e nao derruba as outras 32.
--
-- A distincao que importa: "nao existe com nenhuma assinatura" e pulada em
-- silencio util (NOTICE). Mas se existir uma funcao com o MESMO NOME e
-- assinatura DIFERENTE, o bloco ABORTA — essa ficaria viva e sem gate, que
-- e exatamente o buraco que esta migracao veio fechar.
DO $fn$
DECLARE
  r record;
  v_ausentes TEXT[] := ARRAY[]::TEXT[];
  v_divergentes TEXT[] := ARRAY[]::TEXT[];
  v_feitos INT := 0;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('rh_absenteismo_resumo', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_absenteismo_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_absenteismo_resumo__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_ambulatorio_resumo', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_ambulatorio_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_ambulatorio_resumo__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_lancar_afastamento', 'text,character,integer,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_lancar_afastamento(p_setor TEXT, p_cid_grupo CHAR, p_dias INTEGER, p_data_inicio DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_lancar_afastamento__base(p_setor, p_cid_grupo, p_dias, p_data_inicio);
END;
$wrap$;$ddl$),
    ('rh_lancar_ambulatorio', 'text,text,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_lancar_ambulatorio(p_setor TEXT, p_categoria TEXT, p_data DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('absenteismo');
  RETURN public.rh_lancar_ambulatorio__base(p_setor, p_categoria, p_data);
END;
$wrap$;$ddl$),
    ('rh_matriz_psicossocial', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_matriz_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_matriz_psicossocial__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_criar_campanha', 'text,date,date,text[]', $ddl$CREATE OR REPLACE FUNCTION public.rh_criar_campanha(p_instrument TEXT, p_janela_inicio DATE, p_janela_fim DATE, p_setores TEXT[] DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_criar_campanha__base(p_instrument, p_janela_inicio, p_janela_fim, p_setores);
END;
$wrap$;$ddl$),
    ('rh_encerrar_campanha', 'uuid,boolean', $ddl$CREATE OR REPLACE FUNCTION public.rh_encerrar_campanha(p_campaign_id UUID, p_cancelar BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_encerrar_campanha__base(p_campaign_id, p_cancelar);
END;
$wrap$;$ddl$),
    ('rh_campanha_participacao', 'uuid', $ddl$CREATE OR REPLACE FUNCTION public.rh_campanha_participacao(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_participacao__base(p_campaign_id);
END;
$wrap$;$ddl$),
    ('rh_campanha_links_setor', 'uuid', $ddl$CREATE OR REPLACE FUNCTION public.rh_campanha_links_setor(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_campanha_links_setor__base(p_campaign_id);
END;
$wrap$;$ddl$),
    ('rh_alvo_total', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_alvo_total()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN public.rh_alvo_total__base();
END;
$wrap$;$ddl$),
    ('rh_criar_plano_acao', 'text,text,text,text,text,text,text,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_criar_plano_acao(p_setor TEXT, p_origem TEXT, p_fator TEXT, p_risco_descricao TEXT, p_medida TEXT, p_nivel_controle TEXT, p_responsavel TEXT, p_prazo DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_criar_plano_acao__base(p_setor, p_origem, p_fator, p_risco_descricao, p_medida, p_nivel_controle, p_responsavel, p_prazo);
END;
$wrap$;$ddl$),
    ('rh_atualizar_plano_acao', 'uuid,text,text', $ddl$CREATE OR REPLACE FUNCTION public.rh_atualizar_plano_acao(p_id UUID, p_status TEXT, p_evidencia TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_atualizar_plano_acao__base(p_id, p_status, p_evidencia);
END;
$wrap$;$ddl$),
    ('rh_excluir_plano_acao', 'uuid', $ddl$CREATE OR REPLACE FUNCTION public.rh_excluir_plano_acao(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_excluir_plano_acao__base(p_id);
END;
$wrap$;$ddl$),
    ('rh_planos_acao_resumo', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_planos_acao_resumo(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_planos_acao_resumo__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_vincular_cpfs', 'jsonb', $ddl$CREATE OR REPLACE FUNCTION public.rh_vincular_cpfs(p_pares JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_vincular_cpfs__base(p_pares);
END;
$wrap$;$ddl$),
    ('rh_ingerir_afastamentos', 'jsonb,text,text,integer,integer', $ddl$CREATE OR REPLACE FUNCTION public.rh_ingerir_afastamentos(p_eventos JSONB, p_arquivo TEXT DEFAULT NULL, p_arquivo_hash TEXT DEFAULT NULL, p_sem_destino INT DEFAULT 0, p_eventos_lidos INT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_ingerir_afastamentos__base(p_eventos, p_arquivo, p_arquivo_hash, p_sem_destino, p_eventos_lidos);
END;
$wrap$;$ddl$),
    ('rh_lotes_ingestao', 'integer', $ddl$CREATE OR REPLACE FUNCTION public.rh_lotes_ingestao(p_limite INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_lotes_ingestao__base(p_limite);
END;
$wrap$;$ddl$),
    ('rh_cobertura_cpf', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_cobertura_cpf()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('importar');
  RETURN public.rh_cobertura_cpf__base();
END;
$wrap$;$ddl$),
    ('rh_alocar_psicologo', 'uuid,boolean', $ddl$CREATE OR REPLACE FUNCTION public.rh_alocar_psicologo(p_colaborador_id UUID, p_ativar BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN public.rh_alocar_psicologo__base(p_colaborador_id, p_ativar);
END;
$wrap$;$ddl$),
    ('rh_definir_setor_colaborador', 'uuid,text', $ddl$CREATE OR REPLACE FUNCTION public.rh_definir_setor_colaborador(p_colaborador_id UUID, p_setor TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN public.rh_definir_setor_colaborador__base(p_colaborador_id, p_setor);
END;
$wrap$;$ddl$),
    ('rh_relatorio_psicossocial', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_relatorio_psicossocial(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental', 'compliance', 'plano_acao');
  RETURN public.rh_relatorio_psicossocial__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_relatorio_jss', 'date,date', $ddl$CREATE OR REPLACE FUNCTION public.rh_relatorio_jss(p_inicio DATE, p_fim DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental', 'compliance', 'plano_acao');
  RETURN public.rh_relatorio_jss__base(p_inicio, p_fim);
END;
$wrap$;$ddl$),
    ('rh_registrar_relatorio', 'text,date,date,jsonb,text', $ddl$CREATE OR REPLACE FUNCTION public.rh_registrar_relatorio(p_tipo TEXT, p_periodo_inicio DATE, p_periodo_fim DATE, p_payload JSONB, p_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance', 'saude_mental');
  RETURN public.rh_registrar_relatorio__base(p_tipo, p_periodo_inicio, p_periodo_fim, p_payload, p_hash);
END;
$wrap$;$ddl$),
    ('rh_obter_relatorio_emitido', 'uuid', $ddl$CREATE OR REPLACE FUNCTION public.rh_obter_relatorio_emitido(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance', 'saude_mental');
  RETURN public.rh_obter_relatorio_emitido__base(p_id);
END;
$wrap$;$ddl$),
    ('rh_metricas_bemestar', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_metricas_bemestar()
RETURNS TABLE (
  agua_com_dados INT, agua_melhoraram INT, proteina_com_dados INT, proteina_melhoraram INT, atividade_com_dados INT, atividade_melhoraram INT, ativos_total INT, ativos_engajados INT, dias_em_flow INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_metricas_bemestar__base();
END;
$wrap$;$ddl$),
    ('rh_evolucao_bemestar', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_evolucao_bemestar()
RETURNS TABLE (
  mes DATE, n_contribuintes INT, media_agua NUMERIC, media_proteina NUMERIC, media_minutos NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_evolucao_bemestar__base();
END;
$wrap$;$ddl$),
    ('rh_compliance_metricas', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_compliance_metricas()
RETURNS TABLE (
  empresa_id UUID, nome TEXT, cnpj TEXT, data_inicio DATE, colaboradores_elegiveis INT, colaboradores_ativos INT, consultas_realizadas INT, modo_mental BOOLEAN, modo_metabolico BOOLEAN, consultas_psicologo INT, consultas_medico INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_compliance_metricas__base();
END;
$wrap$;$ddl$),
    ('rh_certificado_colaboradores', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_certificado_colaboradores()
RETURNS TABLE (
  colaborador_id UUID, nome TEXT, setor TEXT, funcao TEXT, data_adicao TIMESTAMPTZ, data_ativacao TIMESTAMPTZ, data_saida TIMESTAMPTZ, status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_certificado_colaboradores__base();
END;
$wrap$;$ddl$),
    ('rh_listar_relatorios_emitidos', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_listar_relatorios_emitidos()
RETURNS TABLE (
  id UUID, tipo TEXT, numero_doc TEXT, periodo_inicio DATE, periodo_fim DATE, hash_verificacao TEXT, emitido_por_nome TEXT, emitido_em TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('compliance');
  RETURN QUERY SELECT * FROM public.rh_listar_relatorios_emitidos__base();
END;
$wrap$;$ddl$),
    ('rh_listar_campanhas', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_listar_campanhas()
RETURNS TABLE (
  id UUID, instrument TEXT, instrument_nome TEXT, eixo TEXT, janela_inicio DATE, janela_fim DATE, setores TEXT[], status TEXT, encerrada_em TIMESTAMPTZ, created_at TIMESTAMPTZ, n_convidados INT, n_respondentes INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('saude_mental');
  RETURN QUERY SELECT * FROM public.rh_listar_campanhas__base();
END;
$wrap$;$ddl$),
    ('rh_listar_planos_acao', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_listar_planos_acao()
RETURNS TABLE (
  id UUID, setor TEXT, origem TEXT, fator TEXT, risco_descricao TEXT, medida TEXT, nivel_controle TEXT, responsavel TEXT, prazo DATE, status TEXT, evidencia TEXT, concluida_em DATE, atrasada BOOLEAN, created_at TIMESTAMPTZ, lideranca_ciclo_id UUID, lideranca_setor TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN QUERY SELECT * FROM public.rh_listar_planos_acao__base();
END;
$wrap$;$ddl$),
    ('rh_resumo_psicologico', '', $ddl$CREATE OR REPLACE FUNCTION public.rh_resumo_psicologico()
RETURNS TABLE (
  plano_ativo BOOLEAN, max_assentos INT, assentos_em_uso INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $wrap$
BEGIN
  PERFORM public.rh_exige_modulo('colaboradores');
  RETURN QUERY SELECT * FROM public.rh_resumo_psicologico__base();
END;
$wrap$;$ddl$)
  ) AS t(nome, args, ddl)
  LOOP
    -- Ja renomeada numa execucao anterior: so recria o wrapper.
    IF to_regprocedure(format('public.%s__base(%s)', r.nome, r.args)) IS NULL THEN
      IF to_regprocedure(format('public.%s(%s)', r.nome, r.args)) IS NULL THEN
        IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                   WHERE n.nspname = 'public' AND p.proname = r.nome) THEN
          v_divergentes := v_divergentes || format('%s(%s)', r.nome, r.args);
        ELSE
          v_ausentes := v_ausentes || r.nome;
        END IF;
        CONTINUE;
      END IF;
      EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I',
                     r.nome, r.args, r.nome || '__base');
    END IF;

    EXECUTE r.ddl;
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I__base(%s) FROM PUBLIC, anon, authenticated', r.nome, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.nome, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
                   r.nome, r.args);
    v_feitos := v_feitos + 1;
  END LOOP;

  RAISE NOTICE '[3.3] % RPCs protegidas.', v_feitos;
  IF cardinality(v_ausentes) > 0 THEN
    RAISE NOTICE '[3.3] PULADAS (nao existem neste banco, nada a proteger): %',
      array_to_string(v_ausentes, ', ');
  END IF;

  -- Divergencia de assinatura NAO e pulavel: a funcao esta viva e
  -- continuaria sem gate. Aborta e mostra qual.
  IF cardinality(v_divergentes) > 0 THEN
    RAISE EXCEPTION 'Estas funcoes existem com assinatura DIFERENTE da esperada e ficariam sem gate: %. Rode docs/security-audit/descoberta.sql (consulta 2) e ajuste a lista.', array_to_string(v_divergentes, ', ');
  END IF;
END
$fn$;
COMMIT;


-- =====================================================================
-- BLOCO 4 (P3) — F9: migrations legadas ainda checam papel por
--                     user_metadata
--
-- user_metadata é gravável pelo próprio usuário
-- (supabase.auth.updateUser({ data: { role: 'super_admin' } })), então
-- toda checagem de privilégio que o lê é auto-promoção.
-- 20260626_rbac_app_metadata.sql fechou isso e o banco está correto HOJE.
-- O risco é de reintrodução: CINCO arquivos vulneráveis continuavam
-- executáveis em supabase/migrations/, e aqui as migrations são aplicadas
-- à mão, sem registro do que já rodou. Rodar um deles de novo — num
-- ambiente novo, num restore, por engano de ordem — recriava a falha sem
-- erro nenhum. (A execução desta migração provou o ponto: este banco tem
-- um conjunto de migrations diferente do repositório.)
--
-- O pior dos cinco era 20260601_empresas_b2b.sql:21-24: ali não é uma
-- policy, é a DEFINIÇÃO de is_super_admin() — o ponto único que todas as
-- policies administrativas consultam.
--
-- Os cinco arquivos foram reescritos para chamar is_super_admin(), de
-- modo que reaplicá-los em qualquer ordem passou a ser inofensivo. Este
-- bloco é a rede de baixo: reafirma o estado correto e falha alto se
-- alguma policy ou função ainda referenciar user_metadata.
--
-- ATUALIZAÇÃO (rodada em produção, 01/09/2026): o smoke test achou MAIS
-- três policies com o mesmo problema, que não estão em NENHUM arquivo do
-- repositório — nem em supabase/migrations/, nem nos supabase-*.sql
-- antigos. "Admin can view/update all consultations" e
-- "plan_prices_admin_write" só existiam no banco, aplicadas por fora do
-- controle de versão em algum momento não documentado. Texto confirmado
-- ao vivo via docs/security-audit/descoberta.sql (consulta 5): as três
-- são idênticas — só `(auth.jwt() -> 'user_metadata' ->> 'role') =
-- 'super_admin'`, sem lógica extra combinada, então a correção é trocar
-- pelo predicado padrão do projeto sem perder nenhuma regra.
-- =====================================================================

BEGIN;

-- ── 4.1 Reafirma as definições corretas (idempotente) ────────────────
DO $b4$
DECLARE v_pulados TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE $ddl$DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles$ddl$;
    EXECUTE $ddl$CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT TO authenticated
      USING (is_super_admin() OR auth.uid() = id)$ddl$;
  ELSE
    v_pulados := v_pulados || 'profiles';
  END IF;

  IF to_regclass('public.payouts') IS NOT NULL THEN
    EXECUTE $ddl$DROP POLICY IF EXISTS "Admins manage payouts" ON payouts$ddl$;
    EXECUTE $ddl$CREATE POLICY "Admins manage payouts"
      ON payouts FOR ALL TO authenticated
      USING (is_super_admin()) WITH CHECK (is_super_admin())$ddl$;
  ELSE
    v_pulados := v_pulados || 'payouts';
  END IF;

  IF to_regclass('public.platform_settings') IS NOT NULL THEN
    EXECUTE $ddl$DROP POLICY IF EXISTS "Admins can manage settings" ON platform_settings$ddl$;
    EXECUTE $ddl$CREATE POLICY "Admins can manage settings"
      ON platform_settings FOR ALL TO authenticated
      USING (is_super_admin()) WITH CHECK (is_super_admin())$ddl$;
  ELSE
    v_pulados := v_pulados || 'platform_settings';
  END IF;

  -- Achadas pelo smoke test, não catalogadas em nenhum arquivo (ver nota
  -- no cabeçalho do bloco). Texto original idêntico nas três: só o
  -- predicado de papel, sem lógica extra a preservar.
  IF to_regclass('public.consultations') IS NOT NULL THEN
    EXECUTE $ddl$DROP POLICY IF EXISTS "Admin can view all consultations" ON consultations$ddl$;
    EXECUTE $ddl$CREATE POLICY "Admin can view all consultations"
      ON consultations FOR SELECT TO authenticated
      USING (is_super_admin())$ddl$;
    EXECUTE $ddl$DROP POLICY IF EXISTS "Admin can update all consultations" ON consultations$ddl$;
    EXECUTE $ddl$CREATE POLICY "Admin can update all consultations"
      ON consultations FOR UPDATE TO authenticated
      USING (is_super_admin())$ddl$;
  ELSE
    v_pulados := v_pulados || 'consultations';
  END IF;

  IF to_regclass('public.plan_prices') IS NOT NULL THEN
    EXECUTE $ddl$DROP POLICY IF EXISTS "plan_prices_admin_write" ON plan_prices$ddl$;
    EXECUTE $ddl$CREATE POLICY "plan_prices_admin_write"
      ON plan_prices FOR ALL TO authenticated
      USING (is_super_admin()) WITH CHECK (is_super_admin())$ddl$;
  ELSE
    v_pulados := v_pulados || 'plan_prices';
  END IF;

  IF cardinality(v_pulados) > 0 THEN
    RAISE NOTICE '[4.1] PULADAS (tabela nao existe neste banco): %',
      array_to_string(v_pulados, ', ');
  END IF;
END
$b4$;

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

  RAISE NOTICE '[4.2] Nenhuma policy ou funcao decide privilegio por user_metadata.';
END
$smoke$;

COMMIT;


-- =====================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO (não altera nada — pode rodar solto)
-- =====================================================================
--
-- 1. Os wrappers estão no ar e os __base ficaram sem GRANT:
--
--   SELECT p.proname,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_executa
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname LIKE 'rh\_%'
--   ORDER BY p.proname;
--
--   Esperado: toda linha terminada em __base com authenticated_executa = false.
--
-- 2. Policies das tabelas corrigidas:
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('patient_exams','patient_notifications',
--                       'empresa_afastamentos','empresa_faturas')
--   ORDER BY tablename, policyname;
--
-- 3. Teste funcional do gate (com a sessão de um RH sem o módulo):
--
--   SELECT rh_absenteismo_resumo('2026-01-01','2026-12-31');
--   -- esperado: ERROR 42501 "Acesso restrito: este usuário não tem o
--   --           módulo absenteismo liberado"
-- =====================================================================
