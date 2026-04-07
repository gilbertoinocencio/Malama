-- =====================================================
-- Verificar e Corrigir Disponibilidades do Médico
-- =====================================================
-- Este script verifica as disponibilidades do médico
-- e ajuda a diagnosticar por que os horários não aparecem
-- =====================================================

-- 1. Ver médico Romarinho
SELECT '👨‍⚕️ MÉDICO ROMARINHO' AS info;
SELECT 
  id,
  name,
  email,
  crm,
  specialty,
  status,
  consultation_price,
  consultation_duration
FROM doctors
WHERE name ILIKE '%romarin%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Ver todas as disponibilidades do médico
SELECT '📅 DISPONIBILIDADES DO MÉDICO' AS info;
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
  da.start_time AS hora_inicio,
  da.end_time AS hora_fim,
  da.is_active
FROM doctor_availability da
JOIN doctors d ON da.doctor_id = d.id
WHERE d.name ILIKE '%romarin%'
ORDER BY da.day_of_week, da.start_time;

-- 3. Contar disponibilidades por dia
SELECT '📊 CONTAGEM POR DIA' AS info;
SELECT 
  CASE da.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda'
    WHEN 2 THEN 'Terça'
    WHEN 3 THEN 'Quarta'
    WHEN 4 THEN 'Quinta'
    WHEN 5 THEN 'Sexta'
    WHEN 6 THEN 'Sábado'
  END AS dia_semana,
  COUNT(*) AS total_horarios,
  COUNT(CASE WHEN da.is_active = true THEN 1 END) AS horarios_ativos
FROM doctor_availability da
JOIN doctors d ON da.doctor_id = d.id
WHERE d.name ILIKE '%romarin%'
GROUP BY da.day_of_week
ORDER BY da.day_of_week;

-- 4. Se não houver disponibilidades, inserir padrão (Seg-Sex, 8h-18h)
DO $$
DECLARE
  v_doctor_id UUID;
BEGIN
  -- Buscar ID do médico Romarinho
  SELECT id INTO v_doctor_id FROM doctors WHERE name ILIKE '%romarin%' LIMIT 1;
  
  IF v_doctor_id IS NOT NULL THEN
    -- Verificar se já existem disponibilidades
    IF NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = v_doctor_id LIMIT 1) THEN
      RAISE NOTICE '⚠️  Nenhuma disponibilidade encontrada para Romarinho. Inserindo horários padrão...';
      
      -- Inserir disponibilidade padrão (Seg-Sex, 08:00-18:00)
      INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
      SELECT v_doctor_id, dow, '08:00'::TIME, '18:00'::TIME
      FROM generate_series(1,5) AS dow;
      
      RAISE NOTICE '✅ Disponibilidade padrão inserida (Seg-Sex, 08:00-18:00)';
    ELSE
      RAISE NOTICE '✅ Médico Romarinho já possui disponibilidades configuradas';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Médico Romarinho não encontrado no banco';
  END IF;
END $$;

-- 5. Verificação final
SELECT '✅ VERIFICAÇÃO FINAL' AS info;
SELECT 
  d.name AS medico,
  COUNT(da.id) AS total_disponibilidades,
  COUNT(CASE WHEN da.is_active = true THEN 1 END) AS disponibilidades_ativas,
  MIN(CASE WHEN da.is_active = true THEN da.start_time END) AS primeiro_horario,
  MAX(CASE WHEN da.is_active = true THEN da.end_time END) AS ultimo_horario
FROM doctors d
LEFT JOIN doctor_availability da ON d.id = da.doctor_id
WHERE d.name ILIKE '%romarin%'
GROUP BY d.name;

-- =====================================================
-- RESUMO
-- =====================================================
-- Este script mostra:
-- 1. Dados do médico Romarinho
-- 2. Todas as disponibilidades configuradas
-- 3. Contagem de horários por dia da semana
-- 4. Insere disponibilidade padrão se não existir
-- 5. Resumo final com primeiro e último horário
-- =====================================================
