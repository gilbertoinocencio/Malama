import { Profile } from '../../types';

export interface StitchOnboardingData extends Partial<Profile> {
  // Dados biométricos
  idade?: number;
  genero?: 'masculino' | 'feminino';
  altura?: number;
  peso?: number;
  pesoObjetivo?: number;
  nivelAtividade?: 'sedentario' | 'leve' | 'moderado' | 'muito_ativo';

  // Objetivos e metas
  additionalGoals?: string[];
  targetWeight?: number;
  goalSpeed?: number;
  bmi?: number;

  // Jejum intermitente
  knowsIntermittentFasting?: boolean;
  eatingWindowStart?: string;
  eatingWindowEnd?: string;

  // Alimentação
  mealsPerDay?: number;
  eatingLocation?: string;
  dietType?: string;
  dietaryRestrictions?: string[];

  // Hidratação
  drinksEnoughWater?: string;
  waterIntakeAwareness?: string;

  // Hábitos e comportamento
  habitChanges?: string[];
  reminderSchedule?: string;
  calorieExperience?: 'beginner' | 'intermediate' | 'pro';
}

export interface StepProps {
  data: StitchOnboardingData;
  updateData: (newData: Partial<StitchOnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export enum OnboardingStep {
  OBJETIVOS_PRINCIPAIS = 'objetivos_principais',
  METODOLOGIA = 'metodologia',
  OBJETIVOS = 'objetivos',
  IDADE = 'idade',
  GENERO = 'genero',
  ALTURA_PESO = 'altura_peso',
  NIVEL_ATIVIDADE = 'nivel_atividade',
  CONHECE_JEJUM = 'conhece_jejum',
  BENEFICIOS_JEJUM = 'beneficios_jejum',
  EDUCA_JEJUM = 'educa_jejum',
  JANELA_ALIMENTAR = 'janela_alimentar',
  REFEICOES_DIARIAS = 'refeicoes_diarias',
  LOCAL_REFEICOES = 'local_refeicoes',
  TIPO_DIETA = 'tipo_dieta',
  RESTRIÇÕES = 'restricoes',
  CONSUMO_AGUA = 'consumo_agua',
  IMPACTO_AGUA = 'impacto_agua',
  EDUCA_HIDRATACAO = 'educa_hidratacao',
  MUDANCA_HABITOS = 'mudanca_habitos',
  RESUMO_IMC = 'resumo_imc',
  RESUMO_BIOMÉTRICO = 'resumo_biometrico',
  PESO_OBJETIVO = 'peso_objetivo',
  VELOCIDADE_META = 'velocidade_meta',
  CONFIRMACAO_METAS = 'confirmacao_metas',
  PROJECAO_SUCESSO = 'projecao_sucesso',
  PROVA_SUCESSO = 'prova_sucesso',
  LEMBRETES_ROTINA = 'lembretes_rotina',
  CRIANDO_PLANO = 'criando_plano',
  PLANO_PERSONALIZADO = 'plano_personalizado',
  RECOMENDACAO_MACROS = 'recomendacao_macros',
  EXPERIENCIA_CALORIAS = 'experiencia_calorias',
  VANTAGENS_PREMIUM = 'vantagens_premium',
  ASSINATURAS = 'assinaturas',
  FLOW = 'flow',
  HOME_FEED = 'home_feed',
}
