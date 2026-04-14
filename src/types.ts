import { UserLevel } from './services/gamificationService';

export interface MacroData {
  protein: number;
  carbs: number;
  fats: number;
}

export interface MicroNutrients {
  fiber?: number;         // g
  sugar?: number;         // g
  saturated_fat?: number; // g
  cholesterol?: number;   // mg
  sodium?: number;        // mg
  potassium?: number;     // mg
  calcium?: number;       // mg
  iron?: number;          // mg
  magnesium?: number;     // mg
  zinc?: number;          // mg
  vitamin_a?: number;     // mcg
  vitamin_c?: number;     // mg
  vitamin_d?: number;     // mcg
  vitamin_e?: number;     // mg
  vitamin_b12?: number;   // mcg
  vitamin_b6?: number;    // mg
  folate?: number;        // mcg
}

export interface MealItem {
  name: string;
  quantity?: string;
  weightGrams?: number;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  micros?: MicroNutrients;
}

export interface Meal {
  id: string;
  name: string;
  timestamp: Date;
  calories: number;
  macros: MacroData;
  type: 'manual' | 'ai-chat' | 'ai-photo' | 'ai-voice' | 'ai-barcode';
  imageUri?: string; // For photo logs
  items?: MealItem[];
}

export interface DailyStats {
  consumedCalories: number;
  targetCalories: number;
  macros: MacroData;
  targetMacros: MacroData;
  flowScore?: number; // 0-100
  micronutrients?: Partial<MicroNutrients>;
  waterIntake?: number; // ml
  waterGoal?: number;  // ml
}

export interface WeekDay {
  date: string;
  dayName: string;
  dayNumber: number;
  stats: DailyStats | null;
  meals: Meal[];
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

export interface MonthWeek {
  weekIndex: number;     // 0-based index in the month view
  label: string;         // "Sem 1", "Sem 2", …
  startDate: string;     // YYYY-MM-DD (Sunday)
  endDate: string;       // YYYY-MM-DD (Saturday)
  days: WeekDay[];       // exactly 7 entries
  daysMetGoal: number;
  daysWithData: number;
  isCurrent: boolean;    // contains today
  isFuture: boolean;     // startDate > today
}

export interface MonthSummary {
  totalConsumed: number;
  totalTarget: number;
  monthProgress: number; // 0–1
  weeksMetGoal: number;  // weeks with daysMetGoal >= 5
  totalDaysMetGoal: number;
  daysWithData: number;
  month: number;         // 0-based JS month
  year: number;
}

export enum AppView {
  HOME = 'HOME',
  FEED = 'FEED',
  LOG = 'LOG',
  SHARE = 'SHARE',
  SETTINGS = 'SETTINGS',
  PLAN = 'PLAN',
  PLAN_SHARE = 'PLAN_SHARE',
  PROFILE = 'PROFILE',
  HYDRATION = 'HYDRATION',
  QUARTERLY_ANALYSIS = 'QUARTERLY_ANALYSIS',
  DAILY_JOURNAL = 'DAILY_JOURNAL',
  PLAN_RENEWAL = 'PLAN_RENEWAL',
  REFINE_PLAN = 'REFINE_PLAN',
  FLOW_ADAPTATION = 'FLOW_ADAPTATION',
  VISUAL_EVOLUTION = 'VISUAL_EVOLUTION',
  VISUAL_SHARE = 'VISUAL_SHARE',
  INTEGRATIONS = 'INTEGRATIONS',
  FOOD_GUIDE = 'FOOD_GUIDE',
  GLP1_ONBOARDING = 'GLP1_ONBOARDING',
  GLP1_DASHBOARD = 'GLP1_DASHBOARD',
  GLP1_CONSULTA = 'GLP1_CONSULTA',
  AGENDAR_CONSULTA = 'AGENDAR_CONSULTA',
  MINHAS_CONSULTAS = 'MINHAS_CONSULTAS',
  CONSULTA_VIDEO = 'CONSULTA_VIDEO',
  COMMUNITY_PROFILE = 'COMMUNITY_PROFILE',
  COMMUNITY_SEARCH = 'COMMUNITY_SEARCH',
  NOTIFICATION_CENTER = 'NOTIFICATION_CENTER',
}

export type Theme = 'light' | 'dark';

export interface AIResponse {
  foodName: string;
  calories: number;
  macros: {
    p: number;
    c: number;
    f: number;
  };
  items: MealItem[];
  confidence?: number;
  message?: string; // Mensagem motivacional do coach
}

export interface Profile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  level?: UserLevel;
  current_streak?: number;
  longest_streak?: number;
  total_flow_days?: number;
  total_xp?: number;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fats?: number;
  goal?: 'aesthetic' | 'health' | 'performance';
  activity_level?: 'sedentary' | 'moderate' | 'intense';
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  body_fat?: number;
  meals_per_day?: number;
  eating_window_start?: string;
  eating_window_end?: string;
  onboarding_completed?: boolean;
  diet_type?: string;
  dietary_restrictions?: string[];
  dietary_restrictions_detail?: string;

  // Community
  community_alias?: string;
  is_private?: boolean;
  milestone_opt_out?: boolean;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;

  // GLP-1 Module
  glp1_mode?: boolean;
  /** Explicitly set to true when the user manually activates GLP-1 mode (distinct from glp1_mode which may be set by other means) */
  glp1_mode_active?: boolean;
  glp1_medication?: string;
  glp1_phase?: 'start' | 'adjust' | 'maintain';
  glp1_symptoms?: string[];
  glp1_main_concern?: string;
  /** ISO date (YYYY-MM-DD) of the day the user first activated GLP-1 mode */
  glp1_start_date?: string;
  glp1_end_date?: string;
  glp1_paused_at?: string;
  glp1_prescription_expiry?: string;
  glp1_current_dose_mg?: number;
  glp1_weekly_checkins?: Array<{ date: string; symptoms: string[]; note?: string }>;
  glp1_consultations?: Array<{
    id: string;
    doctor_name: string;
    specialty: string;
    date: string;
    time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    price: number;
  }>;
  glp1_meal_schedule?: GLP1MealSlot[];
  glp1_application_schedule?: GLP1ApplicationSchedule;
  glp1_doctor_prescription?: GLP1DoctorPrescription;
}

export interface GLP1MealSlot {
  time: string;   // "HH:MM"
  label: string;
  notes?: string;
}

/** Application schedule configured by the patient (or overridden by doctor) */
export interface GLP1ApplicationSchedule {
  frequency: 'weekly' | 'daily';
  day_of_week?: number;   // 0=Sun … 6=Sat (only for weekly)
  time: string;           // "HH:MM"
}

/** Doctor-set prescription data — displayed with "Prescrito por Dr. X" badge */
export interface GLP1DoctorPrescription {
  doctor_id: string;
  doctor_name: string;
  medication?: string;
  current_dose_mg?: number;
  next_dose_mg?: number;
  frequency?: 'weekly' | 'daily';
  day_of_week?: number;
  time?: string;
  macro_calories?: number;
  macro_protein_g?: number;
  macro_carbs_g?: number;
  macro_fats_g?: number;
  notes?: string;
  locked_fields?: string[];   // field names the patient cannot change
  prescribed_at: string;      // ISO timestamp
}

export interface GLP1Dose {
  id: string;
  user_id: string;
  medication: string;
  dose_mg: number | null;
  applied_at: string;
  notes: string | null;
  is_first: boolean;
  phase: string | null;
  next_dose_scheduled_at: string | null;
  notification_sent: boolean;
  application_site?: string | null;
  side_effects?: string[] | null;
  energy_level?: number | null;   // 1-5
  mood_level?: number | null;     // 1-5
  created_at: string;
}