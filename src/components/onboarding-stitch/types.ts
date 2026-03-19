import { Profile } from '../../types';

export interface StitchOnboardingData extends Partial<Profile> {
  additionalGoals?: string[];
  knowsIntermittentFasting?: boolean;
  reminderSchedule?: string;
  mealsPerDay?: number;
  eatingWindowStart?: string;
  eatingWindowEnd?: string;
  eatingLocation?: string;
  dietType?: string;
  dietaryRestrictions?: string[];
  drinksEnoughWater?: string;
  habitChanges?: string[];
  targetWeight?: number;
  goalSpeed?: number;
  bmi?: number;
  calorieExperience?: 'beginner' | 'intermediate' | 'pro';
  waterIntakeAwareness?: string;
}

export interface StepProps {
  data: StitchOnboardingData;
  updateData: (newData: Partial<StitchOnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export enum OnboardingStep {
  METODOLOGIA = 'metodologia',
  OBJETIVOS = 'objetivos',
  CONHECE_JEJUM = 'conhece_jejum',
  BENEFICIOS_JEJUM = 'beneficios_jejum',
  EDUCA_JEJUM = 'educa_jejum',
  JANELA_ALIMENTAR = 'janela_alimentar',
  REFEICOES_DIARIAS = 'refeicoes_diarias',
  LOCAL_REFEICOES = 'local_refeicoes',
  TIPO_DIETA = 'tipo_dieta',
  RESTRIÇÕES = 'restricoes',
  CONSUMO_AGUA = 'consumo_agua',
  EDUCA_HIDRATACAO = 'educa_hidratacao',
  MUDANCA_HABITOS = 'mudanca_habitos',
  RESUMO_BIOMÉTRICO = 'resumo_biometrico',
  PESO_OBJETIVO = 'peso_objetivo',
  VELOCIDADE_META = 'velocidade_meta',
  PROJECAO_SUCESSO = 'projecao_sucesso',
  PROVA_SUCESSO = 'prova_sucesso',
  LEMBRETES_ROTINA = 'lembretes_rotina',
  CRIANDO_PLANO = 'criando_plano',
  PLANO_PERSONALIZADO = 'plano_personalizado',
  EXPERIENCIA_CALORIAS = 'experiencia_calorias',
  FLOW = 'flow',
  HOME_FEED = 'home_feed',
}
