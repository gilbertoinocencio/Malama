-- Renomeia "patente" (bronze/prata/ouro) para "nível" (nivel_1/nivel_2/nivel_3)
-- na tabela doctors e nas chaves de platform_settings.
--
-- Renomeada de 20260621 para 20260625: precisa rodar DEPOIS de
-- 20260624_doctor_patentes.sql, que é quem cria a coluna `patente` e as
-- chaves doctor_value_bronze/prata/ouro. Na ordem antiga, banco novo
-- quebrava aqui com "column patente does not exist".

-- 1. Renomear coluna (só se ainda estiver com o nome antigo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'patente'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'nivel'
  ) THEN
    ALTER TABLE doctors RENAME COLUMN patente TO nivel;
  END IF;
END $$;

-- 2. Remover constraint antiga
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_patente_check;

-- 3. Migrar valores existentes
UPDATE doctors SET nivel = 'nivel_1' WHERE nivel = 'bronze';
UPDATE doctors SET nivel = 'nivel_2' WHERE nivel = 'prata';
UPDATE doctors SET nivel = 'nivel_3' WHERE nivel = 'ouro';

-- 4. Nova constraint (idempotente — reaplicar não pode falhar)
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_nivel_check;
ALTER TABLE doctors ADD CONSTRAINT doctors_nivel_check
  CHECK (nivel IN ('nivel_1', 'nivel_2', 'nivel_3'));

-- 5. Criar novas chaves em platform_settings copiando valores das antigas
INSERT INTO platform_settings (key, value)
SELECT
  CASE key
    WHEN 'doctor_value_bronze' THEN 'doctor_value_nivel1'
    WHEN 'doctor_value_prata'  THEN 'doctor_value_nivel2'
    WHEN 'doctor_value_ouro'   THEN 'doctor_value_nivel3'
  END,
  value
FROM platform_settings
WHERE key IN ('doctor_value_bronze', 'doctor_value_prata', 'doctor_value_ouro')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 6. Remover chaves antigas
DELETE FROM platform_settings
WHERE key IN ('doctor_value_bronze', 'doctor_value_prata', 'doctor_value_ouro');
