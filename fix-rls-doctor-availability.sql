-- =====================================================
-- CORREÇÃO CRÍTICA - RLS para Disponibilidade
-- =====================================================
-- O problema REAL é que as políticas RLS não permitem
-- pacientes lerem a disponibilidade dos médicos!
-- 
-- A política atual só permite o médico ver sua própria
-- disponibilidade, mas pacientes também precisam ler.
-- =====================================================

-- 1. Ver políticas atuais na tabela doctor_availability
SELECT '🔒 POLÍTICAS ATUAIS' AS info;
SELECT 
  policyname AS politica,
  cmd AS tipo,
  roles AS papeis,
  qual AS condicao
FROM pg_policies
WHERE tablename = 'doctor_availability'
ORDER BY policyname;

-- 2. Criar política para permitir pacientes/anon lerem disponibilidade ativa
-- Esta política permite QUALQUER USUÁRIO (autenticado ou não) ler
-- a disponibilidade de médicos APROVADOS que esteja ATIVA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'doctor_availability' 
    AND policyname = 'Anyone can read active availability for approved doctors'
  ) THEN
    CREATE POLICY "Anyone can read active availability for approved doctors" ON doctor_availability
      FOR SELECT
      USING (
        is_active = true
        AND doctor_id IN (
          SELECT id FROM doctors WHERE status = 'approved'
        )
      );
    RAISE NOTICE '✅ Política RLS criada: Patients can read active availability';
  ELSE
    RAISE NOTICE '⚠️  Política já existe';
  END IF;
END $$;

-- 3. Verificar se a política foi criada
SELECT '✅ POLÍTICAS ATUALIZADAS' AS info;
SELECT 
  policyname AS politica,
  cmd AS tipo,
  roles AS papeis
FROM pg_policies
WHERE tablename = 'doctor_availability'
ORDER BY policyname;

-- 4. Teste: Verificar se as disponibilidades do médico podem ser lidas
SELECT '🧪 TESTE DE LEITURA' AS info;
SELECT 
  da.id,
  da.doctor_id,
  d.name AS medico,
  d.status AS status_medico,
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
WHERE da.is_active = true
  AND d.status = 'approved'
  AND d.name ILIKE '%romarin%'
ORDER BY da.day_of_week, da.start_time;

-- 5. Garantir que as disponibilidades do Romarinho estão ativas
UPDATE doctor_availability
SET is_active = true
WHERE doctor_id IN (
  SELECT id FROM doctors WHERE name ILIKE '%romarin%'
)
AND is_active = false;

-- 6. Verificação final
SELECT '📊 RESUMO FINAL' AS info;
SELECT 
  d.name AS medico,
  d.status,
  COUNT(da.id) AS total_disponibilidades,
  COUNT(CASE WHEN da.is_active = true THEN 1 END) AS disponibilidade_ativas
FROM doctors d
LEFT JOIN doctor_availability da ON d.id = da.doctor_id
WHERE d.name ILIKE '%romarin%'
GROUP BY d.name, d.status;

-- =====================================================
-- RESUMO DA CORREÇÃO
-- =====================================================
-- ✅ Adicionada política RLS: "Anyone can read active availability for approved doctors"
-- ✅ Permite pacientes/anon lerem disponibilidade ativa de médicos aprovados
-- ✅ Ativadas todas as disponibilidades do Romarinho
-- 
-- Esta era a CAUSA RAIZ do problema!
-- O código estava correto, mas o RLS bloqueava a leitura.
-- =====================================================
