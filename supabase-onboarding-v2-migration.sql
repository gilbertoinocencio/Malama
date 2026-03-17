-- ============================================
-- NURA Onboarding V2 Migration
-- ============================================
-- Adiciona campos necessários para o novo onboarding BitePal

-- Adicionar novos campos ao profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS primary_goal TEXT,
ADD COLUMN IF NOT EXISTS calorie_tracking_experience TEXT,
ADD COLUMN IF NOT EXISTS additional_goals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS knows_intermittent_fasting BOOLEAN,
ADD COLUMN IF NOT EXISTS reminder_schedule TEXT,
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS eating_window_start TIME,
ADD COLUMN IF NOT EXISTS eating_window_end TIME,
ADD COLUMN IF NOT EXISTS eating_location TEXT,
ADD COLUMN IF NOT EXISTS diet_type TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS drinks_enough_water TEXT,
ADD COLUMN IF NOT EXISTS habit_changes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS goal_speed_kg_per_week NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
  ON profiles(onboarding_completed);

CREATE INDEX IF NOT EXISTS idx_profiles_diet_type
  ON profiles(diet_type);

-- Comentários para documentação
COMMENT ON COLUMN profiles.primary_goal IS 'Objetivo principal do usuário (lose_weight, maintain_weight, gain_weight)';
COMMENT ON COLUMN profiles.calorie_tracking_experience IS 'Experiência com contagem de calorias (new, tried_quit, currently_tracking)';
COMMENT ON COLUMN profiles.additional_goals IS 'Array de objetivos adicionais do usuário (ex: melhorar sono, reduzir stress)';
COMMENT ON COLUMN profiles.knows_intermittent_fasting IS 'Se o usuário conhece jejum intermitente';
COMMENT ON COLUMN profiles.reminder_schedule IS 'Horários de lembretes (comma-separated: manha,almoco,tarde,jantar)';
COMMENT ON COLUMN profiles.meals_per_day IS 'Número de refeições por dia (1-6)';
COMMENT ON COLUMN profiles.eating_window_start IS 'Início da janela de alimentação';
COMMENT ON COLUMN profiles.eating_window_end IS 'Fim da janela de alimentação';
COMMENT ON COLUMN profiles.eating_location IS 'Onde costuma comer (cozinhar_casa, pedir_entrega, comer_fora)';
COMMENT ON COLUMN profiles.diet_type IS 'Tipo de dieta preferida (equilibrada, vegetariana, vegan, paleo, etc)';
COMMENT ON COLUMN profiles.dietary_restrictions IS 'Array de restrições alimentares e alergias';
COMMENT ON COLUMN profiles.drinks_enough_water IS 'Consumo de água (sim, nao, nao_sei)';
COMMENT ON COLUMN profiles.habit_changes IS 'Array de hábitos que o usuário quer mudar';
COMMENT ON COLUMN profiles.goal_speed_kg_per_week IS 'Velocidade desejada para atingir objetivo (kg por semana)';
COMMENT ON COLUMN profiles.target_weight_kg IS 'Peso objetivo do usuário';
COMMENT ON COLUMN profiles.bmi IS 'Índice de Massa Corporal calculado';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Se o usuário completou o onboarding V2';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Onboarding V2 migration completed successfully!';
  RAISE NOTICE '📊 Added 16 new columns to profiles';
  RAISE NOTICE '🔍 Created performance indexes';
  RAISE NOTICE '📝 Added column documentation';
END $$;
