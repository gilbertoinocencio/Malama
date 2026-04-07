-- =====================================================
-- INSERÇÃO DIRETA DE DISPONIBILIDADE
-- =====================================================
-- Insere disponibilidades diretamente para o médico
-- com base nos horários configurados no painel
-- =====================================================

-- 1. Ver o médico com este ID específico
SELECT '👨‍⚕️ VERIFICANDO MÉDICO' AS info;
SELECT 
  id,
  name,
  email,
  specialty,
  status
FROM doctors
WHERE id = '50e7b384-1083-4217-b769-c95695d3d832';

-- 2. Ver TODAS as disponibilidades deste médico
SELECT '📅 DISPONIBILIDADES ATUAIS' AS info;
SELECT 
  da.id,
  da.doctor_id,
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
WHERE da.doctor_id = '50e7b384-1083-4217-b769-c95695d3d832'
ORDER BY da.day_of_week, da.start_time;

-- 3. Se houver disponibilidades antigas, remover para inserir as novas
DELETE FROM doctor_availability
WHERE doctor_id = '50e7b384-1083-4217-b769-c95695d3d832';

-- 4. Inserir disponibilidades baseadas no painel do médico
-- Conforme imagem: Domingo (07:00, 08:00, 09:00), Segunda (10:00), 
-- Terça (07:00, 08:30, 10:00, 11:30, 14:00, 14:30, 15:00, 15:30),
-- Quarta (10:30, 12:30, 13:30, 14:30), Quinta (10:00, 11:00, 11:30)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active) VALUES
-- Domingo (0)
('50e7b384-1083-4217-b769-c95695d3d832', 0, '07:00', '07:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 0, '08:00', '08:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 0, '09:00', '09:30', true),

-- Segunda (1)
('50e7b384-1083-4217-b769-c95695d3d832', 1, '10:00', '10:30', true),

-- Terça (2)
('50e7b384-1083-4217-b769-c95695d3d832', 2, '07:00', '07:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '08:30', '09:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '10:00', '10:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '11:30', '12:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '14:00', '14:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '14:30', '15:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '15:00', '15:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 2, '15:30', '16:00', true),

-- Quarta (3)
('50e7b384-1083-4217-b769-c95695d3d832', 3, '10:30', '11:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 3, '12:30', '13:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 3, '13:30', '14:00', true),
('50e7b384-1083-4217-b769-c95695d3d832', 3, '14:30', '15:00', true),

-- Quinta (4)
('50e7b384-1083-4217-b769-c95695d3d832', 4, '10:00', '10:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 4, '11:00', '11:30', true),
('50e7b384-1083-4217-b769-c95695d3d832', 4, '11:30', '12:00', true)
ON CONFLICT (doctor_id, day_of_week, start_time, end_time) DO UPDATE SET
  is_active = true;

-- 5. Verificação final
SELECT '✅ VERIFICAÇÃO FINAL' AS info;
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
  da.day_of_week,
  STRING_AGG(da.start_time || ' - ' || da.end_time, ', ' ORDER BY da.start_time) AS horarios,
  COUNT(*) AS total_slots
FROM doctor_availability da
WHERE da.doctor_id = '50e7b384-1083-4217-b769-c95695d3d832'
  AND da.is_active = true
GROUP BY da.day_of_week
ORDER BY da.day_of_week;

-- 6. Resumo total
SELECT '📊 RESUMO' AS info;
SELECT 
  COUNT(*) AS total_disponibilidades,
  COUNT(CASE WHEN is_active = true THEN 1 END) como_ativas,
  MIN(start_time) AS primeiro_horario,
  MAX(end_time) AS ultimo_horario
FROM doctor_availability
WHERE doctor_id = '50e7b384-1083-4217-b769-c95695d3d832';

-- =====================================================
-- RESUMO
-- =====================================================
-- Este script:
-- 1. Verifica o médico com o ID específico
-- 2. Mostra disponibilidades atuais
-- 3. Remove disponibilidades antigas
-- 4. Insere disponibilidades baseadas no painel do médico
-- 5. Verifica horários inseridos por dia
-- 6. Mostra resumo total
-- =====================================================
