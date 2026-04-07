-- =====================================================
-- CORREÇÃO COMPLETA - Adicionar colunas faltantes na tabela doctors
-- =====================================================
-- O schema supabase-portal-medico.sql NÃO incluiu as colunas
-- rating e total_consultations que são necessárias para o
-- sistema de agendamento funcionar corretamente.
-- =====================================================

-- 1. Adicionar colunas faltantes na tabela doctors
DO $$
BEGIN
  -- Adicionar coluna rating se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' AND column_name = 'rating'
  ) THEN
    ALTER TABLE doctors ADD COLUMN rating NUMERIC DEFAULT 4.5;
    RAISE NOTICE '✅ Coluna "rating" adicionada à tabela doctors';
  ELSE
    RAISE NOTICE '⚠️  Coluna "rating" já existe na tabela doctors';
  END IF;

  -- Adicionar coluna total_consultations se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' AND column_name = 'total_consultations'
  ) THEN
    ALTER TABLE doctors ADD COLUMN total_consultations INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Coluna "total_consultations" adicionada à tabela doctors';
  ELSE
    RAISE NOTICE '⚠️  Coluna "total_consultations" já existe na tabela doctors';
  END IF;
END $$;

-- 2. Verificar se os médicos mock estão no banco
DO $$
DECLARE
  doctor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doctor_count FROM doctors WHERE status = 'approved';
  
  IF doctor_count = 0 THEN
    RAISE NOTICE '⚠️  Nenhum médico aprovado encontrado. Inserindo médicos mock...';
    
    -- Inserir médicos mock se não existirem
    INSERT INTO doctors (id, name, email, crm, crm_state, specialty, bio, consultation_duration, consultation_price, status, rating, total_consultations, platform_fee_percent)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'Dra. Ana Rodrigues', 'ana@nura.app', '12345', 'SP', 'Endocrinologista', 'Especialista em tratamentos GLP-1 e obesidade há 10 anos.', 30, 249, 'approved', 4.9, 142, 25),
      ('22222222-2222-2222-2222-222222222222', 'Dr. Carlos Silva', 'carlos@nura.app', '67890', 'SP', 'Endocrinologista', 'Referência em endocrinologia metabólica e emagrecimento.', 30, 249, 'approved', 4.8, 98, 25),
      ('33333333-3333-3333-3333-333333333333', 'Dra. Mariana Costa', 'mariana@nura.app', '11223', 'RJ', 'Nutrólogo', 'Nutróloga clínica com foco em saúde metabólica.', 30, 249, 'approved', 4.7, 67, 25)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      crm = EXCLUDED.crm,
      crm_state = EXCLUDED.crm_state,
      specialty = EXCLUDED.specialty,
      bio = EXCLUDED.bio,
      consultation_duration = EXCLUDED.consultation_duration,
      consultation_price = EXCLUDED.consultation_price,
      status = 'approved',
      rating = EXCLUDED.rating,
      total_consultations = EXCLUDED.total_consultations,
      platform_fee_percent = EXCLUDED.platform_fee_percent;
    
    RAISE NOTICE '✅ Médicos mock inseridos/atualizados com sucesso';
  ELSE
    RAISE NOTICE '✅ % médicos aprovados encontrados no banco', doctor_count;
  END IF;
END $$;

-- 3. Garantir que a política de leitura pública existe
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

-- 4. Inserir disponibilidade se não existir
DO $$
DECLARE
  avail_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO avail_count FROM doctor_availability WHERE is_active = true;
  
  IF avail_count = 0 THEN
    RAISE NOTICE '⚠️  Nenhuma disponibilidade ativa encontrada. Inserindo horários padrão...';
    
    -- Inserir disponibilidade padrão (seg-sex, 8h-18h) para todos os médicos aprovados
    INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
    SELECT d.id, dow, '08:00'::TIME, '18:00'::TIME
    FROM doctors d, generate_series(1,5) AS dow
    WHERE d.status = 'approved'
    ON CONFLICT (doctor_id, day_of_week, start_time, end_time) DO NOTHING;
    
    RAISE NOTICE '✅ Disponibilidade padrão inserida (Seg-Sex, 08:00-18:00)';
  ELSE
    RAISE NOTICE '✅ % registros de disponibilidade ativa encontrados', avail_count;
  END IF;
END $$;

-- 5. Verificação final - mostrar estrutura da tabela doctors
SELECT '📋 ESTRUTURA DA TABELA DOCTORS' AS info;
SELECT 
  column_name AS coluna,
  data_type AS tipo,
  is_nullable AS permite_nulo,
  column_default AS valor_padrao
FROM information_schema.columns
WHERE table_name = 'doctors'
ORDER BY ordinal_position;

-- 6. Verificar médicos aprovados
SELECT '✅ MÉDICOS APROVADOS' AS info;
SELECT 
  id,
  name,
  crm,
  crm_state,
  specialty,
  status,
  consultation_price,
  rating,
  total_consultations
FROM doctors
WHERE status = 'approved'
ORDER BY rating DESC;

-- 7. Verificar disponibilidade
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
WHERE d.status = 'approved'
ORDER BY d.name, da.day_of_week;

-- 8. Resumo final
SELECT '📊 RESUMO FINAL' AS info;
SELECT 
  (SELECT COUNT(*) FROM doctors) AS total_medicos,
  (SELECT COUNT(*) FROM doctors WHERE status = 'approved') AS medicos_aprovados,
  (SELECT COUNT(*) FROM doctor_availability WHERE is_active = true) AS disponibilidades_ativas,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'doctors' AND policyname = 'Pacientes podem ver médicos aprovados') AS politica_leitura_existe;

-- =====================================================
-- RESUMO DA CORREÇÃO
-- =====================================================
-- ✅ Colunas rating e total_consultations adicionadas
-- ✅ Médicos mock inseridos com todos os campos corretos
-- ✅ Política RLS criada para pacientes verem médicos
-- ✅ Disponibilidade padrão inserida
-- 
-- Execute este script no Supabase SQL Editor.
-- =====================================================
