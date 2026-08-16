-- =====================================================
-- Malama — Tira as marcas de demonstração dos dados já gravados
--
-- O seed de validação da jornada de liderança deixava três marcas visíveis
-- nos cartões do RH, e este script remove as três:
--
--   1. prefixo "[DEMONSTRAÇÃO] " nos pontos, medidas e evidências;
--   2. sufixo "— validação fictícia" / "— demonstração" nos responsáveis;
--   3. a palavra "fictícia" dentro de 5 frases do roteiro.
--
-- O seed já não insere nada disso; aqui é a limpeza do que ficou no banco.
--
-- Seguro de rodar mais de uma vez: 1 e 2 removem padrão literal e não tocam
-- linha que não o tenha; 3 casa por igualdade exata, então texto editado na
-- tela fica como está. Nada além desses padrões é alterado.
--
-- ATENÇÃO: roda para TODAS as empresas, não só a da demonstração — é o que
-- foi pedido ("de todos os dados que tenha").
--
-- Aplicar via SQL Editor.
-- =====================================================

BEGIN;

-- Padrão único: início da string, com espaços em volta tolerados.
-- \[ e \] escapados porque colchete é classe de caracteres em regex.
CREATE OR REPLACE FUNCTION pg_temp.sem_marcador(t TEXT)
RETURNS TEXT AS $$
  SELECT regexp_replace(COALESCE(t, ''), '^\s*\[DEMONSTRAÇÃO\]\s*', '');
$$ LANGUAGE sql IMMUTABLE;

-- Variante para colunas OPCIONAIS: texto que sobrar vazio vira NULL em vez
-- de string em branco. Nas colunas obrigatórias (medida, risco_descricao,
-- elementos de array) usar sempre a versão acima — NULL ali violaria o
-- NOT NULL/CHECK da tabela.
CREATE OR REPLACE FUNCTION pg_temp.sem_marcador_opcional(t TEXT)
RETURNS TEXT AS $$
  SELECT NULLIF(pg_temp.sem_marcador(t), '');
$$ LANGUAGE sql IMMUTABLE;

-- Sufixos dos responsáveis: "RH — validação fictícia" e
-- "Gestor de Cozinha — demonstração". Aceita travessão, meia-risca e hífen,
-- porque o traço varia conforme quem digitou.
--
-- Se a limpeza esvaziar o campo, devolve o texto ORIGINAL: `responsavel` e
-- `responsavel_rh` têm CHECK length(trim(...)) > 0, e um nome que fosse só o
-- sufixo derrubaria o UPDATE inteiro.
CREATE OR REPLACE FUNCTION pg_temp.sem_sufixo_ficticio(t TEXT)
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(
      trim(regexp_replace(
        COALESCE(t, ''),
        '\s*[—–-]\s*(validação fictícia|demonstração)\s*$',
        '',
        'i'
      )),
      ''
    ),
    t
  );
$$ LANGUAGE sql IMMUTABLE;

-- ── 1. Ciclos de liderança: os dois arrays de pontos e a nota ──
UPDATE public.empresa_lideranca_ciclos c
SET
  pontos_fortes = (
    SELECT COALESCE(array_agg(pg_temp.sem_marcador(t.valor) ORDER BY t.ord), ARRAY[]::TEXT[])
    FROM unnest(c.pontos_fortes) WITH ORDINALITY AS t(valor, ord)
  ),
  pontos_atencao = (
    SELECT COALESCE(array_agg(pg_temp.sem_marcador(t.valor) ORDER BY t.ord), ARRAY[]::TEXT[])
    FROM unnest(c.pontos_atencao) WITH ORDINALITY AS t(valor, ord)
  ),
  nota_evolucao = pg_temp.sem_marcador_opcional(c.nota_evolucao),
  responsavel_rh = pg_temp.sem_sufixo_ficticio(c.responsavel_rh),
  updated_at = now()
WHERE EXISTS (SELECT 1 FROM unnest(c.pontos_fortes)  x WHERE x LIKE '%[DEMONSTRAÇÃO]%')
   OR EXISTS (SELECT 1 FROM unnest(c.pontos_atencao) x WHERE x LIKE '%[DEMONSTRAÇÃO]%')
   OR c.nota_evolucao LIKE '%[DEMONSTRAÇÃO]%'
   OR c.responsavel_rh ~* '[—–-]\s*(validação fictícia|demonstração)\s*$';

-- ── 2. Plano de ação: risco, medida e evidência ──
UPDATE public.empresa_planos_acao
SET
  risco_descricao = pg_temp.sem_marcador(risco_descricao),
  medida          = pg_temp.sem_marcador(medida),
  evidencia       = pg_temp.sem_marcador_opcional(evidencia),
  responsavel     = pg_temp.sem_sufixo_ficticio(responsavel)
WHERE risco_descricao LIKE '%[DEMONSTRAÇÃO]%'
   OR medida          LIKE '%[DEMONSTRAÇÃO]%'
   OR evidencia       LIKE '%[DEMONSTRAÇÃO]%'
   OR responsavel     ~* '[—–-]\s*(validação fictícia|demonstração)\s*$';

-- ── 3. Frases do seed que citavam a própria demonstração ──
--
-- Estas não têm marcador: a palavra "fictícia" está no meio do texto, e sai
-- impressa no cartão ("Escala fictícia apresentada à equipe"). São 5 frases
-- conhecidas do roteiro, trocadas por igualdade EXATA — se alguém editou o
-- texto na tela, a linha não casa e fica como está.

UPDATE public.empresa_planos_acao SET evidencia = novo.texto
FROM (VALUES
  ('Escala fictícia apresentada à equipe e registrada em ata de validação.',
   'Escala apresentada à equipe e registrada em ata.'),
  ('Três revisões fictícias registradas para validação do fluxo.',
   'Três revisões semanais registradas.')
) AS novo(antigo, texto)
WHERE evidencia = novo.antigo;

UPDATE public.empresa_lideranca_ciclos SET nota_evolucao = novo.texto, updated_at = now()
FROM (VALUES
  ('A rotina fictícia foi compreendida e passou a fazer parte do início do turno.',
   'A rotina foi compreendida e passou a fazer parte do início do turno.'),
  ('A revisão fictícia passou a ocorrer semanalmente.',
   'A revisão passou a ocorrer semanalmente.'),
  ('A prática fictícia foi mantida durante o período de validação.',
   'A prática foi mantida durante todo o período.')
) AS novo(antigo, texto)
WHERE nota_evolucao = novo.antigo;

-- ── 4. Notas dos marcos de verificação (migração 20260841) ──
DO $$
BEGIN
  IF to_regclass('public.empresa_lideranca_marco_eventos') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.empresa_lideranca_marco_eventos
      SET nota = pg_temp.sem_marcador(nota)
      WHERE nota LIKE '%[DEMONSTRAÇÃO]%'
    $sql$;
  END IF;
END $$;

-- ── Conferência: deve voltar zero em todas as linhas ──
SELECT 'ciclos.pontos_fortes' AS origem, count(*) AS restantes
  FROM public.empresa_lideranca_ciclos c
 WHERE EXISTS (SELECT 1 FROM unnest(c.pontos_fortes) x WHERE x LIKE '%[DEMONSTRAÇÃO]%')
UNION ALL
SELECT 'ciclos.pontos_atencao', count(*)
  FROM public.empresa_lideranca_ciclos c
 WHERE EXISTS (SELECT 1 FROM unnest(c.pontos_atencao) x WHERE x LIKE '%[DEMONSTRAÇÃO]%')
UNION ALL
SELECT 'ciclos.nota_evolucao', count(*)
  FROM public.empresa_lideranca_ciclos WHERE nota_evolucao LIKE '%[DEMONSTRAÇÃO]%'
UNION ALL
SELECT 'ciclos.responsavel_rh', count(*)
  FROM public.empresa_lideranca_ciclos
 WHERE responsavel_rh ~* '[—–-]\s*(validação fictícia|demonstração)\s*$'
UNION ALL
SELECT 'planos_acao', count(*)
  FROM public.empresa_planos_acao
 WHERE risco_descricao LIKE '%[DEMONSTRAÇÃO]%'
    OR medida LIKE '%[DEMONSTRAÇÃO]%'
    OR evidencia LIKE '%[DEMONSTRAÇÃO]%'
UNION ALL
SELECT 'planos_acao.responsavel', count(*)
  FROM public.empresa_planos_acao
 WHERE responsavel ~* '[—–-]\s*(validação fictícia|demonstração)\s*$'
UNION ALL
-- Varredura ampla: qualquer "fictício/fictícia" que tenha sobrado no texto
-- visível. Não é corrigido automaticamente — só apontado para revisão.
SELECT 'texto com "fictício" (revisar à mão)', count(*)
  FROM public.empresa_planos_acao
 WHERE risco_descricao ~* 'fictíci' OR medida ~* 'fictíci' OR evidencia ~* 'fictíci'
UNION ALL
SELECT 'ciclos com "fictício" (revisar à mão)', count(*)
  FROM public.empresa_lideranca_ciclos c
 WHERE c.nota_evolucao ~* 'fictíci'
    OR EXISTS (SELECT 1 FROM unnest(c.pontos_fortes)  x WHERE x ~* 'fictíci')
    OR EXISTS (SELECT 1 FROM unnest(c.pontos_atencao) x WHERE x ~* 'fictíci');

COMMIT;
