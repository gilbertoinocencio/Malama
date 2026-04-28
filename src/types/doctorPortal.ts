// =====================================================
// Malama — Portal do Médico: Tipos TypeScript
// =====================================================

export enum DoctorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended'
}

export enum DoctorSpecialty {
  ENDOCRINOLOGISTA = 'Endocrinologista',
  NUTROLOGO = 'Nutrólogo',
  CLINICO_GERAL = 'Clínico Geral',
  OUTRO = 'Outro'
}

export enum ConsultationStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum ConsultationType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  PRESCRIPTION_RENEWAL = 'prescription_renewal'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  EXTERNAL = 'external'
}

export enum PrescriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum PayoutStatus {
  PENDING    = 'pending',
  PAID       = 'paid',
  CANCELLED  = 'cancelled',
  PROCESSING = 'processing',
  FAILED     = 'failed'
}

export enum InfluencerStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface Doctor {
  id: string;
  user_id: string;
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
  crm: string;
  crm_state: string;
  specialty: DoctorSpecialty | string;
  specialty_custom?: string | null;
  bio: string | null;
  photo_url: string | null;
  status: DoctorStatus;
  icp_certificate_url: string | null;
  consultation_price: number | null;
  consultation_duration: number;
  invite_token: string | null;
  patient_referral_token: string | null;
  platform_fee_percent: number;
  pix_key: string | null;
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  is_active: boolean;
  date?: string | null; // Data específica (YYYY-MM-DD), opcional. Se NULL, aplica-se toda semana.
}

export interface Consultation {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: ConsultationStatus;
  type: ConsultationType;
  price: number;
  platform_fee: number;
  doctor_payout: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  room_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  rating: number | null; // 1-5
  rating_comment: string | null;
  notes: string | null;
  created_at: string;
  // Dados do paciente (joined)
  patient_name?: string;
  patient_photo?: string;
  patient_age?: number;
  patient_gender?: string;
  // Reagendamento com múltiplas propostas
  reschedule_proposals?: { date: string }[] | null;
  reschedule_message?: string | null;
  reschedule_status?: 'pending' | 'accepted' | 'rejected' | null;
}

export interface Prescription {
  id: string;
  consultation_id: string | null;
  doctor_id: string;
  patient_id: string;
  medication: string;
  dosage: string;
  instructions: string;
  validity_days: number;
  issued_at: string;
  expires_at: string | null;
  pdf_url: string | null;
  status: PrescriptionStatus;
}

export interface DoctorPlanAdjustment {
  id: string;
  consultation_id: string | null;
  doctor_id: string;
  patient_id: string;
  calorie_goal: number | null;
  protein_goal: number | null;
  carb_goal: number | null;
  fat_goal: number | null;
  fiber_goal: number | null;
  water_goal: number | null;
  notes: string | null;
  tag: string | null;
  applied_at: string;
}

export interface DoctorMessage {
  id: string;
  consultation_id: string | null;
  doctor_id: string;
  patient_id: string;
  message: string;
  tag: string | null;
  visible_until: string | null;
  seen_at: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  doctor_id: string;
  amount: number;
  period_start: string; // DATE
  period_end: string; // DATE
  consultations_count: number;
  status: PayoutStatus;
  pix_key: string | null;
  paid_at: string | null;
  created_at: string;
  // Campos Asaas (adicionados na migration 20260417)
  asaas_transfer_id: string | null;
  paid_at_asaas: string | null;
  processing_error: string | null;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface WebRTCSignal {
  id: string;
  room_id: string;
  from_role: string;
  type: string;
  payload: Record<string, any>;
  created_at: string;
}

// =====================================================
// Tipos para formulários
// =====================================================

export interface DoctorRegistrationFormData {
  // Etapa 1: Dados pessoais
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Endereço
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;

  // Etapa 2: Dados profissionais
  crm: string;
  crmState: string;
  specialty: DoctorSpecialty | string;
  bio: string;
  photo: File | null;

  // Etapa 3: Certificado digital
  icpCertificate: File | null;

  // Etapa 4: Configurações
  consultationPrice: number;
  consultationDuration: number;
  pixKey: string;
  consultationTypes: ConsultationType[];
}

export interface AdminDoctorApprovalData {
  doctorId: string;
  platformFeePercent: number;
  notes: string;
}

// =====================================================
// Tipos para o dashboard
// =====================================================

export interface DashboardSummary {
  todayConsultations: number;
  weekConsultations: number;
  pendingReceivable: number;
}

export interface PatientSummary {
  id: string;
  name: string;
  photo_url: string | null;
  lastConsultation: string | null;
  nextConsultation: string | null;
  imc: number | null;
  age: number | null;
  gender: string | null;
  is_glp1_active: boolean;
  glp1_phase: string | null;
}

export interface PatientFullProfile {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  gender: string | null;
  imc: number | null;
  imc_classification: string | null;
  is_glp1_active: boolean;
  glp1_phase: string | null;
  glp1_medication: string | null;
  current_weight: number | null;
  weight_history: WeightEntry[];
  current_goals: PatientGoals;
  adherence: PatientAdherence;
  weekly_history: WeeklyNutritionHistory[];
  symptom_checkins: SymptomCheckin[];
  past_consultations: Consultation[];
  doctor_adjustments: DoctorPlanAdjustment[];
}

export interface WeightEntry {
  date: string;
  weight: number;
  target_weight?: number;
}

export interface PatientGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  adjusted_by_doctor?: boolean;
  doctor_name?: string;
}

export interface PatientAdherence {
  registration_percentage: number; // 0-100
  average_calories: number;
  calorie_goal: number;
  average_protein: number;
  protein_goal: number;
}

export interface WeeklyNutritionHistory {
  week_start: string;
  week_end: string;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  adherence_percent: number;
  avg_weight: number;
}

export interface SymptomCheckin {
  id: string;
  date: string;
  symptoms: string[]; // 'náusea', 'fadiga', 'bem', etc.
  mood: string | null;
  energy: string | null;
}

// =====================================================
// Tipos para Admin
// =====================================================

export interface AdminDashboardSummary {
  approvedDoctors: number;
  monthConsultations: number;
  platformRevenue: number;
  pendingPayouts: number;
  pendingDoctors: Doctor[];
}

export interface FinancialSummary {
  grossRevenue: number;
  platformFee: number;
  totalPaid: number;
  pendingPayouts: number;
}

export interface PendingPayout {
  id: string;
  doctor_id: string;
  doctor_name: string;
  period_start: string;
  period_end: string;
  consultations_count: number;
  gross_amount: number;
  fee_percent: number;
  fee_amount: number;
  net_amount: number;
  pix_key: string | null;
  status: PayoutStatus;
  // Campos Asaas (adicionados na migration 20260417)
  asaas_transfer_id: string | null;
  processing_error: string | null;
}

// =====================================================
// Utilitários
// =====================================================

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  [ConsultationType.INITIAL]: 'Consulta inicial',
  [ConsultationType.FOLLOW_UP]: 'Retorno / Correção de rota',
  [ConsultationType.PRESCRIPTION_RENEWAL]: 'Renovação de receita'
};

export const CONSULTATION_TYPE_OPTIONS = [
  { value: ConsultationType.INITIAL, label: 'Consulta inicial' },
  { value: ConsultationType.FOLLOW_UP, label: 'Retorno / Correção de rota' },
  { value: ConsultationType.PRESCRIPTION_RENEWAL, label: 'Renovação de receita' }
];

export const SPECIALTY_OPTIONS = [
  { value: DoctorSpecialty.ENDOCRINOLOGISTA, label: 'Endocrinologista' },
  { value: DoctorSpecialty.NUTROLOGO, label: 'Nutrólogo' },
  { value: DoctorSpecialty.CLINICO_GERAL, label: 'Clínico Geral' },
  { value: DoctorSpecialty.OUTRO, label: 'Outro' }
];

export const DAY_OF_WEEK_LABELS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export const IMC_CLASSIFICATION = (imc: number): string => {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 24.9) return 'Peso normal';
  if (imc < 29.9) return 'Sobrepeso';
  if (imc < 34.9) return 'Obesidade Grau I';
  if (imc < 39.9) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
};

export const IMC_COLOR = (imc: number): string => {
  if (imc < 18.5) return '#3498db';
  if (imc < 24.9) return '#2ecc71';
  if (imc < 29.9) return '#f39c12';
  if (imc < 34.9) return '#e67e22';
  return '#e74c3c';
};

// =====================================================
// Tipos — Etapa 2: Prontuário clínico, chats e exames
// =====================================================

export interface ClinicalNote {
  id: string;
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  // Seções estruturadas
  chief_complaint: string | null;
  history_illness: string | null;
  relevant_history: string | null;
  physical_exam: string | null;
  diagnosis: string | null;
  plan: string | null;
  free_text: string | null;
  // Métricas clínicas
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  heart_rate: number | null;
  waist_cm: number | null;
  // Controle
  is_draft: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ChatStatus = 'open' | 'closed' | 'expired';

export interface AppointmentChat {
  id: string;
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  status: ChatStatus;
  sla_hours: number;
  last_patient_msg_at: string | null;
  last_doctor_msg_at: string | null;
  sla_breach_at: string | null;
  opened_at: string;
  expires_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  // Campos computed (join)
  unread_count?: number;
  patient_name?: string;
  patient_photo?: string | null;
}

export type ChatSenderRole = 'doctor' | 'patient';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Campos joined
  sender_name?: string;
  sender_photo?: string | null;
}

export interface PatientExam {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  consultation_id: string | null;
  chat_id: string | null;
  exam_name: string;
  exam_date: string | null;
  lab_name: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size_kb: number | null;
  doctor_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// Resposta da RPC can_close_appointment
export interface CanCloseResult {
  can_close: boolean;
  reason: string | null;
}

// Resposta da RPC get_patient_full_history
export interface PatientFullHistory {
  consultations: Array<{
    id: string;
    scheduled_at: string;
    status: ConsultationStatus;
    type: ConsultationType;
    notes: string | null;
    clinical_note: Pick<ClinicalNote,
      'id' | 'is_draft' | 'finalized_at' | 'diagnosis' | 'plan' | 'weight_kg' | 'bmi'
    > | null;
  }>;
  exams: PatientExam[];
  open_chat: (Pick<AppointmentChat,
    'id' | 'status' | 'expires_at' | 'last_patient_msg_at' | 'last_doctor_msg_at' | 'sla_breach_at'
  > & { unread_count: number }) | null;
}

// Formulário de prontuário
export interface ClinicalNoteFormData {
  chief_complaint: string;
  history_illness: string;
  relevant_history: string;
  physical_exam: string;
  diagnosis: string;
  plan: string;
  free_text: string;
  weight_kg: string;
  height_cm: string;
  blood_pressure_sys: string;
  blood_pressure_dia: string;
  heart_rate: string;
  waist_cm: string;
}
