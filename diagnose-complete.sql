-- =====================================================
-- DIAGNÓSTICO COMPLETO - Verificar médicos e políticas
-- =====================================================
-- Execute este script no Supabase SQL Editor para
-- diagnosticar exatamente o que está acontecendo
-- =====================================================

-- 1. Verificar TODOS os médicos no banco
SELECT '📋 TODOS OS MÉDICOS' AS info;
SELECT 
  id,
  name,
  crm,
  specialty,
  status,
  price,
  rating,
  created_at
FROM doctors
ORDER BY created_at DESC;

-- 2. Verificar médicos com status 'approved'
SELECT '✅ MÉDICOS APROVADOS' AS info;
SELECT 
  id,
  name,
  crm,
  specialty,
  status,
  price,
  rating
FROM doctors
WHERE status = 'approved'
ORDER BY rating DESC;

-- 3. Verificar políticas RLS na tabela doctors
SELECT '🔒 POLÍTICAS RLS - TABELA DOCTORS' AS info;
SELECT 
  policyname AS politica,
  cmd AS tipo,
  roles AS papeis,
  qual AS condicao
FROM pg_policies
WHERE tablename = 'doctors'
ORDER BY policyname;

-- 4. Verificar disponibilidade dos médicos
SELECT '📅 DISPONIBILIDADE DOS MÉDICOS' AS info;
SELECT 
  d.name AS medico,
  d.status,
  da.day_of_week AS dia_semana,
  da.start_time AS hora_inicio,
  da.end_time AS hora_fim,
  da.is_active
FROM doctors d
LEFT JOIN doctor_availability da ON d.id = da.doctor_id
ORDER BY d.name, da.day_of_week;

-- 5. Contar registros
SELECT '📊 CONTADORES' AS info;
SELECT 
  (SELECT COUNT(*) FROM doctors) AS total_medicos,
  (SELECT COUNT(*) FROM doctors WHERE status = 'approved') AS medicos_aprovados,
  (SELECT COUNT(*) FROM doctor_availability WHERE is_active = true) AS disponibilidades_ativas;

-- 6. Se não houver médicos aprovados, inserir mocks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doctors WHERE status = 'approved' LIMIT 1) THEN
    RAISE NOTICE '⚠️  Nenhum médico aprovado encontrado! Inserindo médicos mock...';
    
    INSERT INTO doctors (id, name, crm, specialty, bio, consultation_duration, price, status, rating, total_consultations)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'Dra. Ana Rodrigues', '12345-SP', 'Endocrinologista', 'Especialista em tratamentos GLP-1 e obesidade há 10 anos.', 30, 249, 'approved', 4.9, 142),
      ('22222222-2222-2222-2222-222222222222', 'Dr. Carlos Silva', '67890-SP', 'Endocrinologista', 'Referência em endocrinologia metabólica e emagrecimento.', 30, 249, 'approved', 4.8, 98),
      ('33333333-3333-3333-3333-333333333333', 'Dra. Mariana Costa', '11223-RJ', 'Nutrólogo', 'Nutróloga clínica com foco em saúde metabólica.', 30, 249, 'approved', 4.7, 67)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = 'approved';
    
    RAISE NOTICE '✅ Médicos mock inseridos/atualizados com status "approved"';
  ELSE
    RAISE NOTICE '✅ Já existem médicos aprovados no banco';
  END IF;
END $$;

-- 7. Garantir que a política de leitura pública existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'doctors' 
    AND policyname = 'Pacientes podem ver médicos aprovados'
  ) THEN
    CREATE POLICY "Pacientes podem ver médicos aprovados" ON doctors
      FOR SELECT 
      USING (status = 'approved');
    RAISE NOTICE '✅ Política RLS criada: Pacientes podem ver médicos aprovados';
  ELSE
    RAISE NOTICE '✅ Política RLS já existe: Pacientes podem ver médicos aprovados';
  END IF;
END $$;

-- 8. Inserir disponibilidade se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doctor_availability WHERE is_active = true LIMIT 1) THEN
    RAISE NOTICE '⚠️  Nenhuma disponibilidade ativa encontrada! Inserindo horários padrão...';
    
    INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
    SELECT d.id, dow, '08:00'::TIME, '18:00'::TIME
    FROM doctors d, generate_series(1,5) AS dow
    WHERE d.status = 'approved'
    ON CONFLICT (doctor_id, day_of_week, start_time, end_time) DO NOTHING;
    
    RAISE NOTICE '✅ Disponibilidade padrão inserida (Seg-Sex, 08:00-18:00)';
  ELSE
    RAISE NOTICE '✅ Já existem disponibilidades ativas';
  END IF;
END $$;

-- 9. Verificação final
SELECT '✅ VERIFICAÇÃO FINAL' AS info;
SELECT 
  (SELECT COUNT(*) FROM doctors) AS total_medicos,
  (SELECT COUNT(*) FROM doctors WHERE status = 'approved') AS medicos_aprovados,
  (SELECT COUNT(*) FROM doctor_availability WHERE is_active = true) AS disponibilidades_ativas,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'doctors' AND policyname = 'Pacientes podem ver médicos aprovados') AS politica_leitura_existe;
