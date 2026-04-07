-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO - Disponibilidades do Médico
-- =====================================================
-- Verifica se as disponibilidades estão com o doctor_id correto
-- e se estão marcadas como ativas
-- =====================================================

-- 1. Ver TODOS os médicos e seus IDs
SELECT '👨‍⚕️ TODOS OS MÉDICOS' AS info;
SELECT 
  id,
  name,
  email,
  crm,
  specialty,
  status
FROM doctors
ORDER BY created_at DESC;

-- 2. Ver TODAS as disponibilidades no banco
SELECT '📅 TODAS AS DISPONIBILIDADES' AS info;
SELECT 
  da.id,
  da.doctor_id,
  d.name AS medico,
  CASE da.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda'
    WHEN 2 THEN 'Terça'
    WHEN 3 THEN 'Quarta'
    WHEN 4 THEN 'Quinta'
    WHEN 5 THEN 'Sexta'
    WHEN 6 THEN 'Sábado'
  END AS dia_semana,
  da.day_of_week,
  da.start_time,
  da.end_time,
  da.is_active
FROM doctor_availability da
LEFT JOIN doctors d ON da.doctor_id = d.id
ORDER BY d.name, da.day_of_week, da.start_time;

-- 3. Ver especificamente as disponibilidades ativas do médico Romarinho
SELECT '🔍 DISPONIBILIDADES ATIVAS DO ROMARINHO' AS info;
SELECT 
  da.id,
  da.doctor_id,
  d.name AS medico,
  CASE da.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda'
    WHEN 2 THEN 'Terça'
    WHEN 3 THEN 'Quarta'
    WHEN 4 THEN 'Quinta'
    WHEN 5 THEN 'Sexta'
    WHEN 6 THEN 'Sábado'
  END AS dia_semana,
  da.day_of_week,
  da.start_time,
  da.end_time,
  da.is_active
FROM doctor_availability da
JOIN doctors d ON da.doctor_id = d.id
WHERE d.name ILIKE '%romarin%'
  AND da.is_active = true
ORDER BY da.day_of_week, da.start_time;

-- 4. Corrigir: Ativar todas as disponibilidades do médico Romarinho
UPDATE doctor_availability da
SET is_active = true
WHERE doctor_id IN (
  SELECT id FROM doctors WHERE name ILIKE '%romarin%'
)
AND is_active = false;

-- Mostrar quantos registros foram ativados
SELECT '✅ CORREÇÃO APLICADA' AS info;
SELECT 
  d.name AS medico,
  COUNT(da.id) AS total_disponibilidades,
  COUNT(CASE WHEN da.is_active = true THEN 1 END) AS disponibilidade_ativas
FROM doctors d
LEFT JOIN doctor_availability da ON d.id = da.doctor_id
WHERE d.name ILIKE '%romarin%'
GROUP BY d.name;

-- 5. Verificação final: Mostrar horários por dia
SELECT '📊 HORÁRIOS POR DIA' AS info;
SELECT 
  d.name AS medico,
  CASE da.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda'
    WHEN 2 THEN 'Terça'
    WHEN 3 THEN 'Quarta'
    WHEN 4 THEN 'Quinta'
    WHEN 5 THEN 'Sexta'
    WHEN 6 THEN 'Sábado'
  END AS dia_semana,
  da.day_of_week,
  STRING_AGG(da.start_time || ' - ' || da.end_time, ', ' ORDER BY da.start_time) AS horarios
FROM doctors d
JOIN doctor_availability da ON d.id = da.doctor_id
WHERE d.name ILIKE '%romarin%'
  AND da.is_active = true
GROUP BY d.name, da.day_of_week
ORDER BY da.day_of_week;

-- =====================================================
-- RESUMO
-- =====================================================
-- Este script:
-- 1. Lista todos os médicos e seus IDs
-- 2. Lista TODAS as disponibilidades no banco
-- 3. Mostra disponibilidades ativas do Romarinho
-- 4. ATIVA todas as disponibilidades desativadas do Romarinho
-- 5. Mostra resumo final com horários por dia
-- =====================================================
