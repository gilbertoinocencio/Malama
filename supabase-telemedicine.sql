-- Telemedicine Module Migration
-- Run this in your Supabase SQL Editor

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crm TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  consultation_duration INTEGER DEFAULT 30, -- minutes
  price NUMERIC NOT NULL DEFAULT 249,
  platform_fee_percent NUMERIC DEFAULT 20,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  rating NUMERIC DEFAULT 0,
  total_consultations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor availability (weekly schedule)
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(doctor_id, day_of_week)
);

-- Consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  consultation_type TEXT DEFAULT 'initial' CHECK (consultation_type IN ('initial', 'followup', 'prescription_renewal')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  room_id TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  doctor_payout NUMERIC NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  instructions TEXT,
  validity_days INTEGER DEFAULT 90,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor plan adjustments
CREATE TABLE IF NOT EXISTS doctor_plan_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calorie_goal INTEGER,
  protein_goal INTEGER,
  carbs_goal INTEGER,
  fats_goal INTEGER,
  notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor messages to patient
CREATE TABLE IF NOT EXISTS doctor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  visible_until TIMESTAMPTZ NOT NULL,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Seed mock doctors for development
INSERT INTO doctors (id, name, crm, specialty, bio, consultation_duration, price, status, rating, total_consultations)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Dra. Ana Rodrigues', '12345-SP', 'Endocrinologista', 'Especialista em tratamentos GLP-1 e obesidade há 10 anos.', 30, 249, 'approved', 4.9, 142),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Carlos Silva', '67890-SP', 'Endocrinologista', 'Referência em endocrinologia metabólica e emagrecimento.', 30, 249, 'approved', 4.8, 98),
  ('33333333-3333-3333-3333-333333333333', 'Dra. Mariana Costa', '11223-RJ', 'Nutrólogo', 'Nutróloga clínica com foco em saúde metabólica.', 30, 249, 'approved', 4.7, 67)
ON CONFLICT DO NOTHING;

-- Seed availability (Mon-Fri 8h-18h) for all mock doctors
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT id, dow, '08:00'::TIME, '18:00'::TIME
FROM doctors, generate_series(1,5) AS dow
WHERE status = 'approved'
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_plan_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Patients can read approved doctors
CREATE POLICY "Anyone can read approved doctors" ON doctors FOR SELECT USING (status = 'approved');

-- Patients can read/insert their own consultations
CREATE POLICY "Patients can manage their consultations" ON consultations
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Patients can read their prescriptions
CREATE POLICY "Patients can read their prescriptions" ON prescriptions FOR SELECT USING (patient_id = auth.uid());

-- Patients can read their goal adjustments
CREATE POLICY "Patients can read their adjustments" ON doctor_plan_adjustments FOR SELECT USING (patient_id = auth.uid());

-- Patients can read their doctor messages
CREATE POLICY "Patients can read their messages" ON doctor_messages FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Patients can update their messages" ON doctor_messages FOR UPDATE USING (patient_id = auth.uid());

-- Push subscriptions
CREATE POLICY "Users manage their push subscriptions" ON push_subscriptions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Storage bucket for prescriptions (run separately)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);
