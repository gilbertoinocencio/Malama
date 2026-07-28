-- =====================================================
-- Malama — Valor de repasse por consulta do psicólogo
-- Migration: 20260805_valor_repasse_psicologo.sql
--
-- Aplicar via SQL Editor.
--
-- O modelo de repasse não muda: continua sendo nível (1/2/3) × valor por
-- consulta, definido em platform_settings e editado no painel admin. O que
-- faltava era um conjunto de valores próprio para o psicólogo — hoje as
-- chaves doctor_value_nivelN são globais e um psicólogo receberia o valor
-- de médico.
--
-- Sessão de psicologia tem duração, custo e mercado diferentes de consulta
-- médica; misturar os dois na mesma chave obrigaria a escolher qual dos dois
-- fica errado.
--
-- Valores iniciais deliberadamente conservadores (80/95/110): são a base de
-- negociação com a rede, e a conversa de dimensionamento apontou que R$60
-- por sessão é piso de mercado difícil de sustentar com CRP e e-Psi ativos.
-- Ajuste no painel admin antes de credenciar.
-- =====================================================

INSERT INTO platform_settings (key, value)
VALUES
  ('psi_value_nivel1', '80'),
  ('psi_value_nivel2', '95'),
  ('psi_value_nivel3', '110')
ON CONFLICT (key) DO NOTHING;
