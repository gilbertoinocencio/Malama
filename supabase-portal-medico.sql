-- =====================================================
-- NURA — Portal do Médico + Super Admin
-- Script completo de criação do banco de dados
-- =====================================================

-- 1. Médicos
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  crm TEXT NOT NULL,
  crm_state TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending',
  icp_certificate_url TEXT,
  consultation_price DECIMAL(10,2),
  consultation_duration INTEGER DEFAULT 30,
  invite_token TEXT UNIQUE,
  platform_fee_percent DECIMAL(5,2) DEFAULT 25.00,
  pix_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disponibilidade
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(doctor_id, day_of_week, start_time, end_time)
);

-- 3. Consultas
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'scheduled',
  type TEXT DEFAULT 'initial',
  price DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  doctor_payout DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  room_id TEXT UNIQUE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Receitas
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  instructions TEXT NOT NULL,
  validity_days INTEGER DEFAULT 90,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT,
  status TEXT DEFAULT 'active'
);

-- 5. Ajustes de metas pelo médico
CREATE TABLE IF NOT EXISTS doctor_plan_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  calorie_goal INTEGER,
  protein_goal INTEGER,
  carb_goal INTEGER,
  fat_goal INTEGER,
  fiber_goal INTEGER,
  water_goal INTEGER,
  notes TEXT,
  tag TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Mensagens pós-consulta
CREATE TABLE IF NOT EXISTS doctor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  tag TEXT,
  visible_until TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Repasses
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  consultations_count INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  pix_key TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Configurações globais
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Sinais WebRTC (preparação para Parte 2)
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  from_role TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_plan_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA — MÉDICO
-- =====================================================

-- Médicos: vê e edita apenas seus próprios dados
CREATE POLICY "Doctors can view own profile" ON doctors
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Doctors can insert own profile" ON doctors
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Disponibilidade: médico gerencia apenas a sua
CREATE POLICY "Doctors can view own availability" ON doctor_availability
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage own availability" ON doctor_availability
  FOR ALL USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Consultas: médico vê apenas as suas
CREATE POLICY "Doctors can view own consultations" ON consultations
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update own consultations" ON consultations
  FOR UPDATE USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert own consultations" ON consultations
  FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Receitas: médico vê apenas as suas
CREATE POLICY "Doctors can view own prescriptions" ON prescriptions
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage own prescriptions" ON prescriptions
  FOR ALL USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Ajustes de plano
CREATE POLICY "Doctors can view own plan adjustments" ON doctor_plan_adjustments
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage own plan adjustments" ON doctor_plan_adjustments
  FOR ALL USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Mensagens
CREATE POLICY "Doctors can view own messages" ON doctor_messages
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage own messages" ON doctor_messages
  FOR ALL USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Repasses
CREATE POLICY "Doctors can view own payouts" ON payouts
  FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- =====================================================
-- POLÍTICAS DE SEGURANÇA — PACIENTE
-- =====================================================

-- Pacientes podem ver informações básicas do médico (nome, foto, especialidade, bio)
CREATE POLICY "Anyone can view basic doctor info" ON doctors
  FOR SELECT USING (status = 'approved');

-- Pacientes podem ver suas próprias consultas
CREATE POLICY "Patients can view own consultations" ON consultations
  FOR SELECT USING (patient_id = auth.uid());

-- Pacientes podem ver suas próprias receitas
CREATE POLICY "Patients can view own prescriptions" ON prescriptions
  FOR SELECT USING (patient_id = auth.uid());

-- Pacientes podem ver ajustes no seu plano
CREATE POLICY "Patients can view own plan adjustments" ON doctor_plan_adjustments
  FOR SELECT USING (patient_id = auth.uid());

-- Pacientes podem ver mensagens dirigidas a eles
CREATE POLICY "Patients can view own messages" ON doctor_messages
  FOR SELECT USING (patient_id = auth.uid() AND (visible_until IS NULL OR visible_until > NOW()));

-- =====================================================
-- POLÍTICAS DE SEGURANÇA — ADMIN
-- =====================================================

-- Admin pode ver todos os médicos
CREATE POLICY "Admin can view all doctors" ON doctors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

CREATE POLICY "Admin can update all doctors" ON doctors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Admin pode ver todas as consultas
CREATE POLICY "Admin can view all consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

CREATE POLICY "Admin can update all consultations" ON consultations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Admin pode ver todos os repasses
CREATE POLICY "Admin can view all payouts" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

CREATE POLICY "Admin can manage all payouts" ON payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Admin pode ver e editar configurações da plataforma
CREATE POLICY "Admin can view platform settings" ON platform_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

CREATE POLICY "Admin can update platform settings" ON platform_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

CREATE POLICY "Admin can insert platform settings" ON platform_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- =====================================================
-- POLÍTICAS PÚBLICAS
-- =====================================================

-- Configurações da plataforma são legíveis publicamente (para o app)
CREATE POLICY "Public can read platform settings" ON platform_settings
  FOR SELECT USING (true);

-- =====================================================
-- CONFIGURAÇÕES PADRÃO DA PLATAFORMA
-- =====================================================

INSERT INTO platform_settings (key, value) VALUES
  ('default_platform_fee', '25'),
  ('min_consultation_duration', '20'),
  ('min_consultation_price', '80'),
  ('support_email', 'suporte@nura.app')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_invite_token ON doctors(invite_token);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_patient_id ON doctor_plan_adjustments(patient_id);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_doctor_id ON doctor_plan_adjustments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON doctor_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor_id ON payouts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUCKETS DO SUPABASE STORAGE (criar via SQL ou UI)
-- =====================================================
-- Executar no SQL Editor ou criar via Dashboard:
-- 1. doctors-photos (public)
-- 2. doctors-certificates (private)
-- 3. prescriptions-pdf (private)

-- Políticas para o bucket doctors-photos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('doctors-photos', 'doctors-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('doctors-certificates', 'doctors-certificates', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions-pdf', 'prescriptions-pdf', false);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
