-- =====================================================
-- Malama — JSS: nome e descrição em linguagem corrente
--
-- `psychosocial_instruments.nome` não é rótulo interno: ele aparece na
-- lista de instrumentos do RH, na linha da campanha e na tela em que o
-- COLABORADOR responde o questionário. "Job Stress Scale (demanda-
-- controle-apoio)" não diz nada para nenhum dos dois.
--
-- O vocabulário de tela passa a ser carga / cobrança / autonomia / apoio.
-- O nome técnico da escala não se perde: continua em `fonte` e na
-- metodologia do relatório do PGR.
--
-- Precisa bater com JSS.nome em src/services/psychosocialInstruments.ts.
-- =====================================================

UPDATE public.psychosocial_instruments
SET nome      = 'Carga de trabalho (JSS)',
    descricao = 'Mede o que no trabalho pesa sobre as pessoas: cobrança, '
              || 'autonomia para decidir e apoio de colegas e chefia. Versão '
              || 'resumida do modelo demanda-controle de Karasek, validada no '
              || 'Brasil (ELSA-Brasil) — nela, cobrança = demanda psicológica e '
              || 'autonomia = controle sobre o trabalho.'
WHERE code = 'jss';
