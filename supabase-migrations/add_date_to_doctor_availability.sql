-- Migration: Adicionar suporte a datas específicas na disponibilidade do médico
-- Data: 07/04/2026
-- Descrição: Permite que médicos configurem disponibilidade por data específica,
--            além da recorrência semanal por dia_da_semana.

-- 1. Adicionar coluna date (nullable)
ALTER TABLE doctor_availability
ADD COLUMN IF NOT EXISTS date DATE NULL;

-- 2. Atualizar constraint UNIQUE para incluir date
-- Primeiro, remover a constraint antiga
ALTER TABLE doctor_availability
DROP CONSTRAINT IF EXISTS doctor_availability_doctor_id_day_of_week_start_time_end_time_key;

-- Adicionar nova constraint que considera date
ALTER TABLE doctor_availability
ADD CONSTRAINT doctor_availability_unique_slot 
UNIQUE(doctor_id, day_of_week, start_time, end_time, date);

-- 3. Criar índice por data para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_doctor_availability_date 
ON doctor_availability(date) 
WHERE date IS NOT NULL;

-- 4. Criar índice composto para consultas por médico e período
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_date 
ON doctor_availability(doctor_id, date) 
WHERE date IS NOT NULL;

-- 5. Comentários para documentação
COMMENT ON COLUMN doctor_availability.date IS 'Data específica para este horário (opcional). Se NULL, aplica-se toda semana no day_of_week correspondente.';

-- 6. Dados de teste (opcional - remover em produção)
-- Exemplo: Médico tem disponibilidade específica para 14/04/2026
-- INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active, date)
-- VALUES ('doctor-uuid-aqui', 1, '08:00:00', '12:00:00', true, '2026-04-14');

-- 7. Rollback (para referência):
-- ALTER TABLE doctor_availability DROP COLUMN IF EXISTS date;
-- ALTER TABLE doctor_availability DROP CONSTRAINT IF EXISTS doctor_availability_unique_slot;
-- ALTER TABLE doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_day_of_week_start_time_end_time_key UNIQUE(doctor_id, day_of_week, start_time, end_time);
-- DROP INDEX IF EXISTS idx_doctor_availability_date;
-- DROP INDEX IF EXISTS idx_doctor_availability_doctor_date;
