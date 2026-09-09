-- =====================================================
-- Malama — Memória do ciclo psicossocial (NR-1 / GRO)
-- Migration: 20260902_memoria_do_ciclo_psicossocial.sql
--
-- Aplicar via SQL Editor, depois de 20260901_correcoes_auditoria.
--
-- O QUE MUDA
-- O Compliance já faz medir → interpretar → sugerir → reavaliar, mas
-- ESQUECE o raciocínio: a hipótese que sustentou a sugestão some quando o
-- briefing é regerado, e a medida não sabe de qual medição nasceu. Aqui o
-- ciclo passa a guardar memória do que ele já faz:
--
--   o que vimos → por que sugerimos → o que a empresa escolheu →
--   o que foi observado no ciclo seguinte.
--
-- NÃO é um produto novo, não cria integração externa e não pede nenhum
-- campo novo ao RH. Tudo o que entra aqui já é produzido pelo uso normal.
--
-- VOCABULÁRIO — deliberado, ler antes de renomear qualquer coisa:
-- Em nenhum lugar (banco, código ou tela) se fala em "eficácia" ou
-- "impacto" da medida. O sistema NÃO estabelece relação causal. Ele
-- registra RESULTADO OBSERVADO num ciclo posterior, e a comparabilidade
-- dessa observação. "Após a implantação da medida, o indicador agregado
-- passou de X para Y" é afirmação sustentável; "a medida reduziu o risco"
-- não é, e não deve existir neste schema.
--
-- PRIVACIDADE
-- Nada aqui guarda resposta individual. As métricas gravadas são as mesmas
-- que já saem das RPCs agregadas, que aplicam k >= 5 dentro do banco. Um
-- recorte suprimido entra como NULL e o resultado vira 'inconclusivo' —
-- nunca se reconstrói o número pequeno para "salvar" o caso.
-- =====================================================


-- =====================================================
-- 0. PREFLIGHT
--
-- O SQL Editor aborta tudo no primeiro erro, e um erro cru na metade do
-- arquivo ("relation X does not exist", linha 80) não diz o que fazer.
-- Este bloco falha ANTES de qualquer criação, listando de uma vez o que
-- falta e qual migração traz cada coisa.
--
-- Só entram aqui as dependências REAIS de criação: FKs, funções usadas em
-- policy (que o Postgres valida na hora) e o trigger de updated_at. As
-- fontes opcionais do snapshot desidentificado não estão nesta lista de
-- propósito — a função que as usa degrada sozinha quando elas faltam.
-- =====================================================

DO $preflight$
DECLARE
  v_faltando TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regclass('public.empresas') IS NULL THEN
    v_faltando := v_faltando || 'tabela empresas (20260601_empresas_b2b.sql)';
  END IF;
  IF to_regclass('public.rh_usuarios') IS NULL THEN
    v_faltando := v_faltando || 'tabela rh_usuarios (20260601_empresas_b2b.sql)';
  END IF;
  IF to_regclass('public.psychosocial_campaigns') IS NULL THEN
    v_faltando := v_faltando || 'tabela psychosocial_campaigns (20260728_psychosocial_campaign_engine.sql)';
  END IF;
  IF to_regclass('public.psychosocial_instruments') IS NULL THEN
    v_faltando := v_faltando || 'tabela psychosocial_instruments (20260728_psychosocial_campaign_engine.sql)';
  END IF;
  IF to_regclass('public.empresa_planos_acao') IS NULL THEN
    v_faltando := v_faltando || 'tabela empresa_planos_acao (20260801_plano_acao.sql)';
  END IF;
  IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN
    v_faltando := v_faltando || 'função update_updated_at_column() (schema base)';
  END IF;
  IF to_regprocedure('public.is_super_admin()') IS NULL THEN
    v_faltando := v_faltando || 'função is_super_admin() (RBAC)';
  END IF;
  -- Usadas nas policies e nos gates de módulo das RPCs novas.
  IF to_regprocedure('public.rh_tem_permissao(text)') IS NULL THEN
    v_faltando := v_faltando || 'função rh_tem_permissao(text) (20260901_correcoes_auditoria.sql)';
  END IF;
  IF to_regprocedure('public.rh_exige_modulo(text[])') IS NULL THEN
    v_faltando := v_faltando || 'função rh_exige_modulo(text[]) (20260901_correcoes_auditoria.sql)';
  END IF;

  IF array_length(v_faltando, 1) > 0 THEN
    RAISE EXCEPTION E'Faltam pré-requisitos para a memória do ciclo:\n  - %\n\nAplique a(s) migração(ões) indicada(s) e rode este arquivo de novo. Nada foi criado.',
      array_to_string(v_faltando, E'\n  - ');
  END IF;
END;
$preflight$;


-- =====================================================
-- 1. CONTEXTO DESIDENTIFICADO
--
-- Snapshot do CONTEXTO DE TRABALHO (não da empresa) no momento em que a
-- hipótese ou o resultado é registrado. Existe para que, numa segunda
-- etapa, seja possível procurar padrões entre empresas sem nunca tocar em
-- dado identificável.
--
-- O que NÃO entra aqui, por decisão e não por esquecimento:
--   • empresa_id, nome ou CNPJ da empresa;
--   • nome do setor (é identificável dentro do cliente e entre clientes);
--   • nome de pessoa, liderança ou responsável;
--   • qualquer texto livre digitado pelo RH.
--
-- O CNAE entra só como divisão (2 primeiros dígitos), que é ramo de
-- atividade, não identidade — e é o recorte que torna casos comparáveis.
--
-- POR QUE plpgsql COM GUARDA, E NÃO UM SELECT DIRETO:
-- as duas fontes deste snapshot são OPCIONAIS. `empresa_contexto_operacional`
-- (perfil do copiloto, 20260848) e as colunas de organização do trabalho em
-- `empresa_setores` (20260849) podem não existir num banco que não recebeu
-- essas migrações — foi exatamente o que aconteceu na primeira execução.
--
-- Este snapshot serve à etapa 2 (padrões entre empresas) e NADA o consome
-- hoje. Ele não pode, portanto, impedir a criação do schema nem derrubar o
-- briefing em tempo de execução: fonte ausente vira chave ausente, e o
-- ciclo — que é o que importa agora — segue funcionando.
-- =====================================================

CREATE OR REPLACE FUNCTION public.psicossocial_contexto_desidentificado(
  p_empresa_id UUID,
  p_setor      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_segmento  TEXT;
  v_cnae      TEXT;
  v_modelos   JSONB;
  v_turnos    JSONB;
  v_efetivo   INT;
  v_setor     TEXT := NULLIF(TRIM(p_setor), '');
BEGIN
  -- Perfil operacional da empresa: segmento e ramo de atividade.
  IF to_regclass('public.empresa_contexto_operacional') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$
        SELECT NULLIF(TRIM(setor_atuacao), ''),
               NULLIF(LEFT(regexp_replace(COALESCE(cnae_principal, ''), '[^0-9]', '', 'g'), 2), '')
        FROM public.empresa_contexto_operacional
        WHERE empresa_id = $1
      $q$ INTO v_segmento, v_cnae USING p_empresa_id;
    EXCEPTION WHEN OTHERS THEN
      v_segmento := NULL; v_cnae := NULL;
    END;
  END IF;

  -- Organização do trabalho declarada para o setor.
  IF v_setor IS NOT NULL AND to_regclass('public.empresa_setores') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$
        SELECT to_jsonb(modelos_trabalho), to_jsonb(turnos), efetivo
        FROM public.empresa_setores
        WHERE empresa_id = $1 AND lower(trim(nome)) = lower(trim($2))
        LIMIT 1
      $q$ INTO v_modelos, v_turnos, v_efetivo USING p_empresa_id, v_setor;
    EXCEPTION WHEN OTHERS THEN
      v_modelos := NULL; v_turnos := NULL; v_efetivo := NULL;
    END;
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'segmento',         v_segmento,
    'cnae_divisao',     v_cnae,
    'modelos_trabalho', v_modelos,
    'turnos',           v_turnos,
    -- Faixa, nunca o número exato: efetivo exato de um setor pequeno é
    -- quase-identificador quando cruzado com segmento e turno.
    'porte_setor',      CASE
                          WHEN v_efetivo IS NULL THEN NULL
                          WHEN v_efetivo < 10  THEN 'ate_9'
                          WHEN v_efetivo < 50  THEN '10_49'
                          WHEN v_efetivo < 200 THEN '50_199'
                          ELSE '200_mais'
                        END,
    'recorte',          CASE WHEN v_setor IS NULL THEN 'empresa' ELSE 'setor' END
  ));
END;
$fn$;

REVOKE ALL ON FUNCTION public.psicossocial_contexto_desidentificado(UUID, TEXT) FROM PUBLIC, anon;


-- =====================================================
-- 2. HIPÓTESES
--
-- Hoje a hipótese existe só dentro do briefing (measureFor em
-- rh-briefing.ts) e morre a cada refresh. Sem ela não há como responder
-- "por que o Malama sugeriu isso" seis meses depois.
--
-- Hipótese NÃO é diagnóstico e NÃO afirma causa. É um recorte do que os
-- agregados mostram, mais as perguntas que a empresa deveria fazer para
-- validar antes de agir.
--
-- IDEMPOTÊNCIA: uma linha por (empresa, campanha de linha de base, setor,
-- indicador). O briefing pode ser regerado dez vezes no mesmo dia sem
-- inchar a tabela — e o histórico de recorrência entre ciclos continua
-- confiável, porque cada ciclo tem no máximo um registro por indicador.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psicossocial_hipoteses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  -- NULL = leitura de toda a empresa (mesma convenção de empresa_planos_acao).
  setor                TEXT,
  -- Ciclo que originou a leitura. É o vínculo que faltava entre medição e
  -- raciocínio; campanhas já são ancoradas ao ciclo de calendário
  -- (20260850), então dois registros de ciclos diferentes são comparáveis.
  campanha_baseline_id UUID NOT NULL REFERENCES public.psychosocial_campaigns(id) ON DELETE CASCADE,
  instrumento          TEXT NOT NULL REFERENCES public.psychosocial_instruments(code),
  -- Indicador agregado que disparou a hipótese ('who5_score', 'jss_demanda',
  -- 'jss_controle', 'jss_apoio'). Mesmo vocabulário das tendências do briefing.
  indicador            TEXT NOT NULL CHECK (length(trim(indicador)) > 0),
  -- Mesmo enum de empresa_planos_acao.fator: é o que permite ligar hipótese
  -- e medida escolhida sem tradução no meio do caminho.
  fator                TEXT NOT NULL
                         CHECK (fator IN ('demanda', 'controle', 'apoio', 'assedio',
                                          'jornada', 'reconhecimento', 'outro')),

  descricao            TEXT NOT NULL CHECK (length(trim(descricao)) > 0),
  -- Por que ESTA hipótese apareceu: a regra que a produziu, em linguagem
  -- de tela. É o campo que responde à auditoria.
  por_que_foi_sugerida TEXT NOT NULL CHECK (length(trim(por_que_foi_sugerida)) > 0),
  -- Evidências AGREGADAS usadas (valor, n, período). Nunca resposta individual.
  evidencias           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- O que perguntar à equipe/liderança para validar antes de agir.
  perguntas_validacao  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Caminhos possíveis na fonte/organização — sugestões, não prescrição.
  caminhos_possiveis   JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Força da evidência em CATEGORIA, nunca em porcentagem: não existe
  -- método defensável para uma probabilidade aqui, e um número inventado
  -- viraria a parte mais citada do relatório. Definição determinística de
  -- cada categoria vive em _shared/psicossocial-logica.ts.
  forca_evidencia      TEXT NOT NULL
                         CHECK (forca_evidencia IN ('evidencia_insuficiente', 'sinal_inicial',
                                                    'padrao_recorrente', 'padrao_consistente')),
  -- De onde veio a recomendação. 'historico_agregado' fica declarado desde
  -- já, mas nada o produz nesta etapa (aprendizado entre empresas é etapa 2).
  origem               TEXT NOT NULL
                         CHECK (origem IN ('regra_deterministica', 'tendencia_interna',
                                           'historico_empresa', 'historico_agregado', 'llm')),
  -- Versão da lógica que gerou o registro. Sem isto, uma mudança de regra
  -- reescreve o passado sem deixar rastro.
  logica_versao        TEXT NOT NULL,
  -- Métricas do ciclo de base, como estavam quando a hipótese nasceu.
  metricas_baseline    JSONB NOT NULL DEFAULT '{}'::jsonb,
  contexto_desidentificado JSONB,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_psicossocial_hipotese_ciclo
  ON public.psicossocial_hipoteses(empresa_id, campanha_baseline_id, COALESCE(setor, ''), indicador);
CREATE INDEX IF NOT EXISTS idx_psicossocial_hipoteses_empresa
  ON public.psicossocial_hipoteses(empresa_id, created_at DESC);
-- Recorrência entre ciclos: "este mesmo sinal já apareceu antes neste setor?"
CREATE INDEX IF NOT EXISTS idx_psicossocial_hipoteses_recorrencia
  ON public.psicossocial_hipoteses(empresa_id, indicador, COALESCE(setor, ''));

DROP TRIGGER IF EXISTS update_psicossocial_hipoteses_updated_at ON public.psicossocial_hipoteses;
CREATE TRIGGER update_psicossocial_hipoteses_updated_at
  BEFORE UPDATE ON public.psicossocial_hipoteses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.psicossocial_hipoteses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all hipoteses" ON public.psicossocial_hipoteses;
CREATE POLICY "super_admin all hipoteses"
  ON public.psicossocial_hipoteses FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Leitura só da própria empresa e só com o módulo liberado — mesmo padrão
-- aplicado às tabelas empresa_* em 20260901_correcoes_auditoria.
DROP POLICY IF EXISTS "rh reads own hipoteses" ON public.psicossocial_hipoteses;
CREATE POLICY "rh reads own hipoteses"
  ON public.psicossocial_hipoteses FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('plano_acao')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Sem policy de escrita: só a RPC abaixo grava.


-- =====================================================
-- 3. VÍNCULO DA MEDIDA COM A MEDIÇÃO QUE A ORIGINOU
--
-- `origem = 'campanha'` já existia, mas é texto solto: não diz QUAL
-- campanha. Sem isso o ciclo é irreconstruível.
--
-- REGRA DELIBERADA — ler antes de "melhorar":
-- campanha_baseline_id só é preenchido quando o vínculo é INEQUÍVOCO, ou
-- seja, quando a medida nasceu de uma hipótese concreta (briefing,
-- Copiloto ou tela de resultado). Medida criada manualmente fora desse
-- contexto fica com NULL e NÃO entra no motor de aprendizado, mesmo que
-- setor e fator coincidam com alguma campanha recente. Inferir o vínculo
-- por coincidência criaria histórico falso — é melhor perder um caso do
-- que ensinar o sistema com associação errada.
-- =====================================================

ALTER TABLE public.empresa_planos_acao
  ADD COLUMN IF NOT EXISTS hipotese_id UUID
    REFERENCES public.psicossocial_hipoteses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campanha_baseline_id UUID
    REFERENCES public.psychosocial_campaigns(id) ON DELETE SET NULL,
  -- Linha de base CONGELADA no momento da decisão: valor, n e período do
  -- indicador. Congelar (em vez de recalcular depois) é o que torna o caso
  -- auditável — é o número que o RH tinha à frente quando decidiu — e
  -- dispensa reprocessar relatórios antigos na reavaliação.
  ADD COLUMN IF NOT EXISTS baseline_metricas JSONB;

CREATE INDEX IF NOT EXISTS idx_planos_acao_baseline
  ON public.empresa_planos_acao(empresa_id, campanha_baseline_id)
  WHERE campanha_baseline_id IS NOT NULL;


-- =====================================================
-- 4. RESULTADO OBSERVADO
--
-- Uma linha por (medida × ciclo de reavaliação × indicador). É CALCULADA
-- por código determinístico, nunca digitada pelo RH e nunca produzida por
-- IA — o LLM só redige o texto em cima do que já foi calculado aqui.
--
-- 'classificacao' descreve o MOVIMENTO DO INDICADOR entre duas coletas, e
-- não o efeito da medida. 'favoravel' significa apenas "o indicador andou
-- no sentido desejado no período posterior à medida".
--
-- MEDIDA NÃO EXECUTADA também é registrada, e isso é intencional: é um
-- comparador observacional valioso. Mas NÃO é grupo de controle — a
-- empresa pode não ter executado justamente por uma razão que também
-- interfere no indicador (crise, troca de liderança, pico de demanda).
-- Fica gravado como observação descritiva, nunca como contrafactual.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.psicossocial_resultados_observados (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_acao_id        UUID NOT NULL REFERENCES public.empresa_planos_acao(id) ON DELETE CASCADE,
  hipotese_id          UUID REFERENCES public.psicossocial_hipoteses(id) ON DELETE SET NULL,
  campanha_baseline_id UUID NOT NULL REFERENCES public.psychosocial_campaigns(id) ON DELETE CASCADE,
  campanha_followup_id UUID NOT NULL REFERENCES public.psychosocial_campaigns(id) ON DELETE CASCADE,
  setor                TEXT,
  instrumento          TEXT NOT NULL REFERENCES public.psychosocial_instruments(code),
  indicador            TEXT NOT NULL CHECK (length(trim(indicador)) > 0),

  -- NULL quando o recorte ficou abaixo do piso de anonimato. Não se
  -- reconstrói o valor suprimido: o caso vira inconclusivo.
  valor_baseline       NUMERIC,
  valor_followup       NUMERIC,
  delta                NUMERIC,
  -- Direção favorável do indicador, gravada junto para o registro se
  -- explicar sozinho anos depois (WHO-5/controle/apoio sobem; demanda cai).
  favoravel_quando     TEXT NOT NULL CHECK (favoravel_quando IN ('sobe', 'cai')),
  n_baseline           INT,
  n_followup           INT,
  intervalo_dias       INT,

  -- Estado da medida na data do cálculo. 'nao_executada' é dado, não falha.
  execucao             TEXT NOT NULL
                         CHECK (execucao IN ('executada', 'em_andamento', 'nao_executada', 'cancelada')),

  classificacao        TEXT NOT NULL
                         CHECK (classificacao IN ('favoravel', 'estavel', 'desfavoravel', 'inconclusivo')),
  -- Por que o caso é (ou não é) comparável. 'comparavel' é o único valor
  -- que permite classificação diferente de 'inconclusivo'.
  comparabilidade      TEXT NOT NULL
                         CHECK (comparabilidade IN ('comparavel', 'dado_suprimido', 'amostra_insuficiente',
                                                    'participacao_divergente', 'intervalo_insuficiente',
                                                    'sem_linha_de_base')),
  -- Frase neutra já pronta para tela e relatório. Descreve movimento do
  -- indicador; nunca atribui o movimento à medida.
  narrativa            TEXT NOT NULL CHECK (length(trim(narrativa)) > 0),
  logica_versao        TEXT NOT NULL,
  contexto_desidentificado JSONB,

  calculado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_psicossocial_resultado
  ON public.psicossocial_resultados_observados(plano_acao_id, campanha_followup_id, indicador);
CREATE INDEX IF NOT EXISTS idx_psicossocial_resultados_empresa
  ON public.psicossocial_resultados_observados(empresa_id, calculado_em DESC);

DROP TRIGGER IF EXISTS update_psicossocial_resultados_updated_at ON public.psicossocial_resultados_observados;
CREATE TRIGGER update_psicossocial_resultados_updated_at
  BEFORE UPDATE ON public.psicossocial_resultados_observados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.psicossocial_resultados_observados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin all resultados observados" ON public.psicossocial_resultados_observados;
CREATE POLICY "super_admin all resultados observados"
  ON public.psicossocial_resultados_observados FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "rh reads own resultados observados" ON public.psicossocial_resultados_observados;
CREATE POLICY "rh reads own resultados observados"
  ON public.psicossocial_resultados_observados FOR SELECT TO authenticated
  USING (
    public.rh_tem_permissao('plano_acao')
    AND empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo)
  );

-- Sem policy de escrita: só a RPC abaixo grava.


-- =====================================================
-- 5. RPC: registrar hipóteses do ciclo (upsert idempotente)
--
-- Chamada pelo briefing do Copiloto, que calcula as hipóteses de forma
-- determinística no servidor. Não recebe texto do modelo sem passar pela
-- validação de enum abaixo, e não aceita hipótese de campanha que não seja
-- da empresa do usuário.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_registrar_hipoteses(JSONB);

CREATE OR REPLACE FUNCTION public.rh_registrar_hipoteses(p_hipoteses JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_item    JSONB;
  v_setor   TEXT;
  v_id      UUID;
  v_ids     JSONB := '[]'::jsonb;
  v_n       INT := 0;
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');

  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF jsonb_typeof(p_hipoteses) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Formato inválido');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_hipoteses) LOOP
    -- Teto por chamada: o briefing gera poucas hipóteses por ciclo, e um
    -- payload grande aqui só poderia vir de defeito ou abuso.
    EXIT WHEN v_n >= 40;

    -- A campanha precisa ser desta empresa. Sem isso, um payload forjado
    -- gravaria memória de ciclo cruzando tenants.
    IF NOT EXISTS (
      SELECT 1 FROM public.psychosocial_campaigns c
      WHERE c.id = (v_item ->> 'campanha_baseline_id')::UUID
        AND c.empresa_id = v_empresa
    ) THEN
      CONTINUE;
    END IF;

    v_setor := NULLIF(TRIM(v_item ->> 'setor'), '');

    INSERT INTO public.psicossocial_hipoteses (
      empresa_id, setor, campanha_baseline_id, instrumento, indicador, fator,
      descricao, por_que_foi_sugerida, evidencias, perguntas_validacao,
      caminhos_possiveis, forca_evidencia, origem, logica_versao,
      metricas_baseline, contexto_desidentificado
    ) VALUES (
      v_empresa,
      v_setor,
      (v_item ->> 'campanha_baseline_id')::UUID,
      v_item ->> 'instrumento',
      LEFT(v_item ->> 'indicador', 60),
      v_item ->> 'fator',
      LEFT(v_item ->> 'descricao', 1000),
      LEFT(v_item ->> 'por_que_foi_sugerida', 1000),
      COALESCE(v_item -> 'evidencias', '[]'::jsonb),
      COALESCE(ARRAY(SELECT LEFT(x, 300) FROM jsonb_array_elements_text(
        COALESCE(v_item -> 'perguntas_validacao', '[]'::jsonb)) AS x), ARRAY[]::TEXT[]),
      COALESCE(v_item -> 'caminhos_possiveis', '[]'::jsonb),
      v_item ->> 'forca_evidencia',
      v_item ->> 'origem',
      LEFT(v_item ->> 'logica_versao', 40),
      COALESCE(v_item -> 'metricas_baseline', '{}'::jsonb),
      public.psicossocial_contexto_desidentificado(v_empresa, v_setor)
    )
    ON CONFLICT (empresa_id, campanha_baseline_id, (COALESCE(setor, '')), indicador)
    DO UPDATE SET
      descricao            = EXCLUDED.descricao,
      por_que_foi_sugerida = EXCLUDED.por_que_foi_sugerida,
      evidencias           = EXCLUDED.evidencias,
      perguntas_validacao  = EXCLUDED.perguntas_validacao,
      caminhos_possiveis   = EXCLUDED.caminhos_possiveis,
      forca_evidencia      = EXCLUDED.forca_evidencia,
      origem               = EXCLUDED.origem,
      logica_versao        = EXCLUDED.logica_versao,
      metricas_baseline    = EXCLUDED.metricas_baseline
    RETURNING id INTO v_id;

    v_ids := v_ids || jsonb_build_object(
      'indicador', v_item ->> 'indicador',
      'setor', v_setor,
      'campanha_baseline_id', v_item ->> 'campanha_baseline_id',
      'id', v_id);
    v_n := v_n + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'hipoteses', v_ids);
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR not_null_violation THEN
    -- Payload fora do vocabulário não derruba o briefing: a memória do
    -- ciclo é acessória, a leitura agregada é o que o RH precisa ver.
    RETURN jsonb_build_object('ok', false, 'error', 'Hipótese fora do vocabulário aceito');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_registrar_hipoteses(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_registrar_hipoteses(JSONB) TO authenticated;


-- =====================================================
-- 6. RPC: criar item do plano — agora com vínculo opcional à hipótese
--
-- A assinatura antiga (8 argumentos) é substituída. O wrapper com gate de
-- módulo criado em 20260901_correcoes_auditoria é recriado junto, para não
-- deixar uma versão sem gate para trás.
--
-- Quando p_hipotese_id vem preenchido, a campanha de linha de base e o
-- snapshot de métricas são lidos DA HIPÓTESE, no servidor — o cliente não
-- escolhe a que ciclo a medida pertence.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE);
DROP FUNCTION IF EXISTS public.rh_criar_plano_acao__base(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.rh_criar_plano_acao__base(
  p_setor           TEXT,
  p_origem          TEXT,
  p_fator           TEXT,
  p_risco_descricao TEXT,
  p_medida          TEXT,
  p_nivel_controle  TEXT,
  p_responsavel     TEXT,
  p_prazo           DATE,
  p_hipotese_id     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa   UUID;
  v_id        UUID;
  v_hipotese  RECORD;
  v_campanha  UUID := NULL;
  v_baseline  JSONB := NULL;
BEGIN
  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios WHERE user_id = auth.uid() LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF COALESCE(TRIM(p_risco_descricao), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Descreva o risco identificado');
  END IF;
  IF COALESCE(TRIM(p_medida), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Descreva a medida de controle');
  END IF;
  IF COALESCE(TRIM(p_responsavel), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o responsável pela medida');
  END IF;
  IF p_prazo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe o prazo');
  END IF;

  -- Vínculo com o ciclo: só existe se a hipótese existir E for desta
  -- empresa. Hipótese de outro tenant é simplesmente ignorada (a medida é
  -- criada sem vínculo), nunca aceita.
  IF p_hipotese_id IS NOT NULL THEN
    SELECT h.id, h.campanha_baseline_id, h.metricas_baseline, h.indicador
      INTO v_hipotese
    FROM public.psicossocial_hipoteses h
    WHERE h.id = p_hipotese_id AND h.empresa_id = v_empresa;

    IF FOUND THEN
      v_campanha := v_hipotese.campanha_baseline_id;
      v_baseline := jsonb_build_object(
        'indicador', v_hipotese.indicador,
        'metricas',  v_hipotese.metricas_baseline,
        'congelado_em', to_jsonb(now()));
    ELSE
      p_hipotese_id := NULL;
    END IF;
  END IF;

  INSERT INTO public.empresa_planos_acao
    (empresa_id, setor, origem, fator, risco_descricao, medida,
     nivel_controle, responsavel, prazo, criado_por,
     hipotese_id, campanha_baseline_id, baseline_metricas)
  VALUES
    (v_empresa, NULLIF(TRIM(p_setor), ''), COALESCE(p_origem, 'manual'), p_fator,
     TRIM(p_risco_descricao), TRIM(p_medida), p_nivel_controle,
     TRIM(p_responsavel), p_prazo, auth.uid(),
     p_hipotese_id, v_campanha, v_baseline)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'vinculada_ao_ciclo', v_campanha IS NOT NULL);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fator ou nível de controle inválido');
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_criar_plano_acao(
  p_setor           TEXT,
  p_origem          TEXT,
  p_fator           TEXT,
  p_risco_descricao TEXT,
  p_medida          TEXT,
  p_nivel_controle  TEXT,
  p_responsavel     TEXT,
  p_prazo           DATE,
  p_hipotese_id     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');
  RETURN public.rh_criar_plano_acao__base(
    p_setor, p_origem, p_fator, p_risco_descricao, p_medida,
    p_nivel_controle, p_responsavel, p_prazo, p_hipotese_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_criar_plano_acao__base(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_criar_plano_acao(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, UUID) TO authenticated;


-- =====================================================
-- 7. RPC: registrar resultados observados (upsert idempotente)
--
-- Recebe o que o motor determinístico calculou. O banco revalida o
-- vínculo: a medida tem que ser da empresa e ter linha de base.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_registrar_resultados_observados(JSONB);

CREATE OR REPLACE FUNCTION public.rh_registrar_resultados_observados(p_resultados JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_item    JSONB;
  v_plano   RECORD;
  v_n       INT := 0;
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');

  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RH sem empresa vinculada');
  END IF;

  IF jsonb_typeof(p_resultados) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Formato inválido');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_resultados) LOOP
    EXIT WHEN v_n >= 200;

    -- A medida tem que ser desta empresa E ter linha de base. Medida sem
    -- vínculo inequívoco não entra no aprendizado (ver bloco 3).
    SELECT p.id, p.setor, p.hipotese_id, p.campanha_baseline_id
      INTO v_plano
    FROM public.empresa_planos_acao p
    WHERE p.id = (v_item ->> 'plano_acao_id')::UUID
      AND p.empresa_id = v_empresa
      AND p.campanha_baseline_id IS NOT NULL;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- A campanha de reavaliação também precisa ser desta empresa.
    IF NOT EXISTS (
      SELECT 1 FROM public.psychosocial_campaigns c
      WHERE c.id = (v_item ->> 'campanha_followup_id')::UUID
        AND c.empresa_id = v_empresa
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.psicossocial_resultados_observados (
      empresa_id, plano_acao_id, hipotese_id, campanha_baseline_id, campanha_followup_id,
      setor, instrumento, indicador, valor_baseline, valor_followup, delta,
      favoravel_quando, n_baseline, n_followup, intervalo_dias, execucao,
      classificacao, comparabilidade, narrativa, logica_versao, contexto_desidentificado
    ) VALUES (
      v_empresa, v_plano.id, v_plano.hipotese_id,
      v_plano.campanha_baseline_id,
      (v_item ->> 'campanha_followup_id')::UUID,
      v_plano.setor,
      v_item ->> 'instrumento',
      LEFT(v_item ->> 'indicador', 60),
      (v_item ->> 'valor_baseline')::NUMERIC,
      (v_item ->> 'valor_followup')::NUMERIC,
      (v_item ->> 'delta')::NUMERIC,
      v_item ->> 'favoravel_quando',
      (v_item ->> 'n_baseline')::INT,
      (v_item ->> 'n_followup')::INT,
      (v_item ->> 'intervalo_dias')::INT,
      v_item ->> 'execucao',
      v_item ->> 'classificacao',
      v_item ->> 'comparabilidade',
      LEFT(v_item ->> 'narrativa', 1000),
      LEFT(v_item ->> 'logica_versao', 40),
      public.psicossocial_contexto_desidentificado(v_empresa, v_plano.setor)
    )
    ON CONFLICT (plano_acao_id, campanha_followup_id, indicador)
    DO UPDATE SET
      valor_baseline  = EXCLUDED.valor_baseline,
      valor_followup  = EXCLUDED.valor_followup,
      delta           = EXCLUDED.delta,
      n_baseline      = EXCLUDED.n_baseline,
      n_followup      = EXCLUDED.n_followup,
      intervalo_dias  = EXCLUDED.intervalo_dias,
      execucao        = EXCLUDED.execucao,
      classificacao   = EXCLUDED.classificacao,
      comparabilidade = EXCLUDED.comparabilidade,
      narrativa       = EXCLUDED.narrativa,
      logica_versao   = EXCLUDED.logica_versao,
      calculado_em    = now();

    v_n := v_n + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'registrados', v_n);
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR not_null_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Resultado fora do vocabulário aceito');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_registrar_resultados_observados(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_registrar_resultados_observados(JSONB) TO authenticated;


-- =====================================================
-- 8. RPC: memória do ciclo (leitura)
--
-- Uma chamada devolve tudo que o motor precisa para decidir força de
-- evidência e resultado observado:
--   • recorrência: em quantos ciclos ANTERIORES este mesmo indicador já
--     gerou hipótese neste recorte (é o que separa "sinal inicial" de
--     "padrão consistente" sem precisar reprocessar relatórios antigos);
--   • medidas com linha de base, para o motor de resultado;
--   • resultados já observados, para a tela.
--
-- Tudo agregado e da própria empresa. Nenhuma resposta individual.
-- =====================================================

DROP FUNCTION IF EXISTS public.rh_memoria_ciclo();

CREATE OR REPLACE FUNCTION public.rh_memoria_ciclo()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_recorrencia JSONB;
  v_medidas     JSONB;
  v_resultados  JSONB;
BEGIN
  PERFORM public.rh_exige_modulo('plano_acao');

  SELECT empresa_id INTO v_empresa
  FROM public.rh_usuarios WHERE user_id = auth.uid() AND ativo LIMIT 1;
  IF v_empresa IS NULL THEN RETURN NULL; END IF;

  -- Devolve as CAMPANHAS, não uma contagem: o motor precisa saber se o
  -- ciclo atual já está entre elas para não contar o mesmo ciclo duas vezes
  -- ao decidir entre "sinal inicial" e "padrão recorrente".
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'setor', r.setor, 'indicador', r.indicador, 'campanhas', r.campanhas)), '[]'::jsonb)
  INTO v_recorrencia
  FROM (
    SELECT h.setor, h.indicador,
           jsonb_agg(DISTINCT h.campanha_baseline_id) AS campanhas
    FROM public.psicossocial_hipoteses h
    WHERE h.empresa_id = v_empresa
    GROUP BY h.setor, h.indicador
  ) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'plano_acao_id', p.id,
    'setor', p.setor,
    'fator', p.fator,
    'medida', p.medida,
    'nivel_controle', p.nivel_controle,
    'status', p.status,
    'prazo', p.prazo,
    'concluida_em', p.concluida_em,
    'tem_evidencia', COALESCE(TRIM(p.evidencia), '') <> '',
    'hipotese_id', p.hipotese_id,
    'campanha_baseline_id', p.campanha_baseline_id,
    'baseline_metricas', p.baseline_metricas,
    'baseline_instrumento', c.instrument,
    'baseline_janela_fim', c.janela_fim,
    'criada_em', p.created_at)), '[]'::jsonb)
  INTO v_medidas
  FROM public.empresa_planos_acao p
  JOIN public.psychosocial_campaigns c ON c.id = p.campanha_baseline_id
  WHERE p.empresa_id = v_empresa
    AND p.campanha_baseline_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'plano_acao_id', r.plano_acao_id,
    'setor', r.setor,
    'indicador', r.indicador,
    'instrumento', r.instrumento,
    'valor_baseline', r.valor_baseline,
    'valor_followup', r.valor_followup,
    'delta', r.delta,
    'favoravel_quando', r.favoravel_quando,
    'n_baseline', r.n_baseline,
    'n_followup', r.n_followup,
    'intervalo_dias', r.intervalo_dias,
    'execucao', r.execucao,
    'classificacao', r.classificacao,
    'comparabilidade', r.comparabilidade,
    'narrativa', r.narrativa,
    'campanha_followup_id', r.campanha_followup_id,
    'calculado_em', r.calculado_em) ORDER BY r.calculado_em DESC), '[]'::jsonb)
  INTO v_resultados
  FROM public.psicossocial_resultados_observados r
  WHERE r.empresa_id = v_empresa;

  RETURN jsonb_build_object(
    'recorrencia', v_recorrencia,
    'medidas_com_linha_de_base', v_medidas,
    'resultados_observados', v_resultados);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_memoria_ciclo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rh_memoria_ciclo() TO authenticated;
