-- =====================================================
-- Malama — Remove a política de privacidade B2C do Painel do RH
-- Migration: 20260827_remove_privacidade_b2c_do_painel.sql
--
-- Aplicar via SQL Editor, depois de 20260826_termos_painel_rh.
--
-- A migration 20260825 semeou a Política de Privacidade da plataforma como
-- documento informativo na área da empresa, com a ideia de que o RH deveria
-- saber o que rege os dados dos colaboradores. Foi erro de julgamento: o
-- texto apontado é o B2C, escrito para o paciente — fala de diário
-- alimentar, Body Scan, GLP-1 e Strava. O RH abre esperando o documento
-- DELE e encontra o do app.
--
-- O painel do RH passa a listar apenas documentos da relação Malama x
-- EMPRESA. O que a empresa precisa saber sobre tratamento de dados está nas
-- seções 3 a 11 dos Termos de Uso do Painel do RH, escritas para ela.
--
-- Consequência imediata e esperada: enquanto os Termos do Painel seguirem
-- como rascunho, a seção "Termos e documentos" fica vazia. Vazio é melhor do
-- que o documento errado.
-- =====================================================

DELETE FROM documentos_legais d
 WHERE d.tipo = 'privacidade'
   AND d.empresa_id IS NULL
   AND NOT EXISTS (SELECT 1 FROM empresa_aceites a WHERE a.documento_id = d.id);
