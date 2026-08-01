// =====================================================
// NURA — Edge Function: activity-health-insights
// Gera análise de IA sobre impacto das atividades físicas
// na saúde e alimentação do paciente
// POST { patient_id }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateClinicalText } from '../_shared/clinical-ai.ts';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getAuthDoctor(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: doctor } = await supabase
    .from('doctors')
    .select('id, name, specialty')
    .eq('user_id', user.id)
    .single();
  return doctor ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const doctor = await getAuthDoctor(req);
    if (!doctor) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Acesso clínico exige vínculo real entre o médico autenticado e o paciente.
    const [{ data: hasConsult }, { data: isReferred }] = await Promise.all([
      supabase.from('consultations').select('id')
        .eq('doctor_id', doctor.id).eq('patient_id', patient_id).limit(1).maybeSingle(),
      supabase.from('profiles').select('id')
        .eq('id', patient_id).eq('referred_by_doctor_id', doctor.id).maybeSingle(),
    ]);
    if (!hasConsult && !isReferred) {
      return new Response(JSON.stringify({ error: 'Paciente não vinculado a este médico' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const since30dDate = since30d.slice(0, 10); // 'YYYY-MM-DD' p/ coluna DATE

    const [profileRes, activitiesRes, mealsRes, dailyRes] = await Promise.all([
      supabase.from('profiles')
        .select('display_name, age, gender, weight, height, goal, target_calories, target_protein, target_carbs, target_fats, glp1_mode, glp1_medication')
        .eq('id', patient_id)
        .single(),

      supabase.from('activities')
        .select('activity_type, name, calories_burned, duration_seconds, distance_meters, activity_date, service')
        .eq('user_id', patient_id)
        .gte('activity_date', since30d)
        .order('activity_date', { ascending: false }),

      supabase.from('meals')
        .select('created_at, calories, protein, carbs, fats')
        .eq('user_id', patient_id)
        .gte('created_at', since30d)
        .order('created_at', { ascending: false }),

      // Sinais diários de wearable / Health Connect (passos, FC, sono, % gordura)
      supabase.from('health_daily_metrics')
        .select('metric_date, steps, active_calories, total_calories, distance_meters, resting_heart_rate, avg_heart_rate, sleep_minutes, body_fat_pct, weight_kg')
        .eq('user_id', patient_id)
        .gte('metric_date', since30dDate)
        .order('metric_date', { ascending: false }),
    ]);

    const profile    = profileRes.data;
    const activities = activitiesRes.data ?? [];
    const meals      = mealsRes.data ?? [];
    const daily      = dailyRes.data ?? [];

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Paciente não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Estatísticas de atividade
    const totalActivities  = activities.length;
    const totalCalBurned   = activities.reduce((s, a) => s + (a.calories_burned ?? 0), 0);
    const totalDurationMin = Math.round(activities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0) / 60);
    const typeFreq: Record<string, number> = {};
    activities.forEach(a => { typeFreq[a.activity_type] = (typeFreq[a.activity_type] ?? 0) + 1; });
    const topTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Dias ativos vs dias com refeição registrada
    const activeDays = new Set(activities.map(a => a.activity_date.split('T')[0])).size;
    const mealDays   = new Set(meals.map(m => m.created_at.split('T')[0])).size;

    // Calorias médias em dias com atividade vs dias sem
    const activeDaySet = new Set(activities.map(a => a.activity_date.split('T')[0]));
    const mealsOnActiveDays    = meals.filter(m => activeDaySet.has(m.created_at.split('T')[0]));
    const mealsOnInactiveDays  = meals.filter(m => !activeDaySet.has(m.created_at.split('T')[0]));
    const avgCalActive   = mealsOnActiveDays.length   > 0 ? Math.round(mealsOnActiveDays.reduce((s, m)   => s + (m.calories ?? 0), 0) / Math.max(mealsOnActiveDays.length, 1))   : 0;
    const avgCalInactive = mealsOnInactiveDays.length > 0 ? Math.round(mealsOnInactiveDays.reduce((s, m) => s + (m.calories ?? 0), 0) / Math.max(mealsOnInactiveDays.length, 1)) : 0;
    const avgProtActive  = mealsOnActiveDays.length   > 0 ? Math.round(mealsOnActiveDays.reduce((s, m)   => s + (m.protein  ?? 0), 0) / Math.max(mealsOnActiveDays.length, 1))   : 0;

    // Sinais diários (wearable / Health Connect) — `daily` vem em ordem decrescente
    const avgOf = (vals: number[]) => vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    const stepsArr     = daily.filter(d => d.steps != null).map(d => d.steps as number);
    const avgSteps     = avgOf(stepsArr);
    const avgHR        = avgOf(daily.filter(d => d.avg_heart_rate != null).map(d => d.avg_heart_rate as number));
    const avgResting   = avgOf(daily.filter(d => d.resting_heart_rate != null).map(d => d.resting_heart_rate as number));
    const avgActiveCal = avgOf(daily.filter(d => d.active_calories != null).map(d => d.active_calories as number));
    const sleepArr     = daily.filter(d => d.sleep_minutes != null).map(d => d.sleep_minutes as number);
    const avgSleepH    = sleepArr.length ? (sleepArr.reduce((s, v) => s + v, 0) / sleepArr.length / 60).toFixed(1) : null;
    const bfRows       = daily.filter(d => d.body_fat_pct != null);
    const latestBf     = bfRows.length ? bfRows[0].body_fat_pct : null;
    const hasDaily     = avgSteps != null || avgHR != null || avgSleepH != null || latestBf != null;

    const dailySection = hasDaily ? `
## Sinais Diários — Wearable / Health Connect (últimos 30 dias)
Dias com dados de dispositivo: ${daily.length}
Passos (média/dia): ${avgSteps != null ? avgSteps.toLocaleString('pt-BR') : 'N/A'}
Calorias ativas (média/dia): ${avgActiveCal != null ? `${avgActiveCal} kcal` : 'N/A'}
Frequência cardíaca média: ${avgHR != null ? `${avgHR} bpm` : 'N/A'}
FC de repouso média: ${avgResting != null ? `${avgResting} bpm` : 'N/A'}
Sono (média/noite): ${avgSleepH != null ? `${avgSleepH} h` : 'N/A'}
% Gordura (mais recente): ${latestBf != null ? `${latestBf}%` : 'N/A'}
` : `
## Sinais Diários — Wearable / Health Connect
Sem dados de dispositivo no período (paciente ainda não conectou um wearable / Health Connect).
`;

    const prompt = `Você é um especialista em medicina do esporte e nutrição clínica assistindo o Dr(a). ${doctor.name}.
Analise os dados de atividade física do paciente e gere um resumo clínico focado nos efeitos na saúde e alimentação.
Seja objetivo, baseado em dados, e use linguagem adequada para um profissional de saúde. Não invente informações.

## Perfil do Paciente
Nome: ${profile.display_name ?? 'N/A'} | Idade: ${profile.age ?? 'N/A'} anos | Gênero: ${profile.gender ?? 'N/A'}
Peso: ${profile.weight ?? 'N/A'} kg | Altura: ${profile.height ?? 'N/A'} cm
Objetivo: ${profile.goal ?? 'N/A'}
GLP-1: ${profile.glp1_mode ? `${profile.glp1_medication ?? 'ativo'}` : 'Não usa'}

## Metas Nutricionais
Calorias: ${profile.target_calories ?? 'N/A'} kcal | Proteína: ${profile.target_protein ?? 'N/A'}g | Carbs: ${profile.target_carbs ?? 'N/A'}g | Gorduras: ${profile.target_fats ?? 'N/A'}g

## Atividades Físicas (últimos 30 dias)
Total de atividades: ${totalActivities}
Dias ativos: ${activeDays}/30
Duração total: ${totalDurationMin} minutos
Calorias totais queimadas: ${totalCalBurned} kcal
Tipos mais frequentes: ${topTypes.length > 0 ? topTypes.map(([t, n]) => `${t} (${n}x)`).join(', ') : 'nenhum'}
${activities.slice(0, 8).map(a =>
  `- ${new Date(a.activity_date).toLocaleDateString('pt-BR')}: ${a.activity_type} "${a.name}" — ${Math.round((a.duration_seconds ?? 0) / 60)}min, ${a.calories_burned ?? 0} kcal${a.distance_meters ? `, ${(a.distance_meters / 1000).toFixed(1)}km` : ''}`
).join('\n')}

## Comportamento Alimentar vs Atividade
Dias com registro de refeição: ${mealDays}/30
Média calórica em dias COM atividade: ${avgCalActive} kcal
Média calórica em dias SEM atividade: ${avgCalInactive} kcal
Média de proteína em dias com atividade: ${avgProtActive}g
${dailySection}
## Análise Solicitada

Gere uma análise em português com as seguintes seções (use markdown com ##):

### 1. Nível de Atividade Física
Avalie a frequência, intensidade e consistência. Compare com recomendações da OMS (150min/semana de atividade moderada).

### 2. Impacto na Saúde
Analise os efeitos observados: gasto calórico total, potencial impacto em composição corporal, progressão esperada.
${profile.glp1_mode ? 'Considere a interação entre atividade física e uso de GLP-1.' : ''}

### 3. Relação Atividade × Alimentação
Compare a ingestão calórica e proteica nos dias com e sem atividade. O paciente ajusta a alimentação conforme o treino? Há compensação calórica?

### 4. Sinais Fisiológicos — Frequência Cardíaca e Sono
${hasDaily
  ? 'Interprete a FC de repouso (faixa e tendência), a FC média e a duração média de sono (referência 7–9h) — relacionando com recuperação, estresse/sobrecarga de treino e adesão. Avalie o volume de passos diários como marcador de NEAT/sedentarismo (referência ~7–10 mil passos/dia) e a evolução da % de gordura.'
  : 'Não há dados de wearable/Health Connect no período. Destaque, em uma linha, que conectar um dispositivo (passos, FC, sono) enriqueceria a avaliação clínica.'}

### 5. Recomendações para o Médico
3-4 sugestões práticas de ajuste de conduta (treino, metas nutricionais, timing de macros), considerando também sono e sinais cardiovasculares quando disponíveis.

Seja conciso e direto. Máximo de 450 palavras no total.`;

    const generation = await generateClinicalText(prompt, 1536);

    return new Response(JSON.stringify({
      insights: generation.text,
      provider: generation.provider,
      model: generation.model,
      fallback_used: generation.fallbackUsed,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('activity-health-insights error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
