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
  FOOD_GUIDE = 'FOOD_GUIDE'
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
  onboarding_completed?: boolean;
}