-- =====================================================
-- CORREÇÃO: Política RLS para pacientes verem médicos aprovados
-- =====================================================
-- PROBLEMA: O script supabase-portal-medico.sql sobrescreveu as políticas
-- e removeu a permissão para pacientes verem a lista de médicos.
-- 
-- Este script adiciona a política faltante para que pacientes
-- (qualquer usuário autenticado) possam ver médicos com status 'approved'.
-- =====================================================

-- 1. Verificar se a política já existe
DO $$
BEGIN
  -- Verifica se a política "Pacientes podem ver médicos aprovados" já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'doctors' 
    AND policyname = 'Pacientes podem ver médicos aprovados'
  ) THEN
    -- Criar a política que permite qualquer usuário autenticado ver médicos aprovados
    CREATE POLICY "Pacientes podem ver médicos aprovados" ON doctors
      FOR SELECT 
      USING (status = 'approved');
    
    RAISE NOTICE '✅ Política criada com sucesso: Pacientes podem ver médicos aprovados';
  ELSE
    RAISE NOTICE '⚠️  Política já existe: Pacientes podem ver médicos aprovados';
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
      status = 'approved',
      consultation_price = EXCLUDED.consultation_price;
    
    RAISE NOTICE '✅ Médicos mock inseridos com sucesso';
  ELSE
    RAISE NOTICE '✅ % médicos aprovados encontrados no banco', doctor_count;
  END IF;
END $$;

-- 3. Verificar disponibilidade dos médicos
DO $$
DECLARE
  avail_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO avail_count FROM doctor_availability WHERE is_active = true;
  
  IF avail_count = 0 THEN
    RAISE NOTICE '⚠️  Nenhuma disponibilidade encontrada. Inserindo horários padrão...';
    
    -- Inserir disponibilidade padrão (seg-sex, 8h-18h) para todos os médicos aprovados
    INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
    SELECT id, dow, '08:00'::TIME, '18:00'::TIME
    FROM doctors, generate_series(1,5) AS dow
    WHERE status = 'approved'
    ON CONFLICT (doctor_id, day_of_week, start_time, end_time) DO NOTHING;
    
    RAISE NOTICE '✅ Disponibilidade padrão inserida com sucesso';
  ELSE
    RAISE NOTICE '✅ % registros de disponibilidade encontrados', avail_count;
  END IF;
END $$;

-- 4. Verificar todas as políticas atuais na tabela doctors
SELECT 
  policyname AS "Política",
  cmd AS "Tipo",
  roles AS "Papéis",
  qual AS "Condição"
FROM pg_policies
WHERE tablename = 'doctors'
ORDER BY policyname;

-- =====================================================
-- RESUMO DA CORREÇÃO
-- =====================================================
-- ✅ Política adicionada: "Pacientes podem ver médicos aprovados"
-- ✅ Médicos mock verificados/inseridos
-- ✅ Disponibilidade padrão verificada/inserida
-- 
-- Execute este script no Supabase SQL Editor para corrigir o problema.
-- =====================================================
