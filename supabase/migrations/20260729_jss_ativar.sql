-- =====================================================
-- Malama — Libera a Job Stress Scale para uso em campanha
-- Migration: 20260729_jss_ativar.sql
--
-- Aplicar via SQL Editor, depois de 20260728_psychosocial_campaign_engine.
--
-- A JSS nasceu inativa no catálogo porque a redação exata dos itens ainda
-- não estava conferida — e texto errado em instrumento validado invalida o
-- escore. Os 17 itens foram agora transcritos da Tabela 3 do artigo
-- original para src/services/psychosocialInstruments.ts, com a chave de
-- correção explícita item a item.
--
-- PROVENIÊNCIA
--   Alves MGM, Chor D, Faerstein E, Lopes CS, Werneck GL.
--   "Versão resumida da 'job stress scale': adaptação para o português."
--   Rev Saúde Pública 2004;38(2):164-71. Acesso aberto.
--   Confiabilidade (CCI): demanda 0,88 · controle 0,87 · apoio 0,85.
--   Consistência interna (alfa): 0,79 · 0,67 · 0,85.
--
-- LICENÇA — leia antes de usar como argumento comercial
--   O artigo registra que "os direitos dessa adaptação foram cedidos pelo
--   autor, Töres Theorell, por comunicação pessoal". É uma cessão nominal
--   aos autores da adaptação, não uma licença aberta declarada. Na prática
--   o instrumento circula livremente no Brasil há duas décadas (ELSA-Brasil,
--   Estudo Pró-Saúde) sem taxa, e está publicado em periódico de acesso
--   aberto — situação materialmente diferente de COPSOQ III e JCQ, que têm
--   licenciamento comercial formal. Ainda assim, confirmar o uso comercial
--   por e-mail com a autora correspondente (ENSP/Fiocruz) antes de tratar
--   isso como diferencial contratual.
--
-- ORTOGRAFIA
--   Única alteração ao texto publicado: atualização do trema pela reforma
--   ortográfica ("freqüência" -> "frequência"). Mudança ortográfica, não
--   semântica; não afeta a equivalência do instrumento.
-- =====================================================

UPDATE psychosocial_instruments
SET
  ativo   = true,
  licenca = 'Publicada em periódico de acesso aberto (Rev Saúde Pública). '
            || 'Adaptação cedida por Töres Theorell aos autores por comunicação pessoal — '
            || 'cessão nominal, não licença aberta declarada. Uso amplo e sem taxa no Brasil '
            || '(ELSA-Brasil, Estudo Pró-Saúde). Diferente de COPSOQ III e JCQ, que exigem '
            || 'acordo para uso comercial. Confirmação de uso comercial pendente com os autores.',
  fonte   = 'Alves MGM, Chor D, Faerstein E, Lopes CS, Werneck GL. Versão resumida da '
            || '"job stress scale": adaptação para o português. Rev Saúde Pública '
            || '2004;38(2):164-71, Tabela 3.'
WHERE code = 'jss';
