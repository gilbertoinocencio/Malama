import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../services/supabase';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const MODEL_NAME = 'gemini-2.5-flash';

export async function generateConsultationBriefing(patientId: string): Promise<string> {
  // 1. Fetch patient profile
  const { data: patient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patient) throw new Error('Paciente não encontrado');

  // Calculate age from date_of_birth
  const patientAge = (() => {
    if (!patient.date_of_birth) return null;
    const birth = new Date(patient.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  })();

  // 2. Weight history (last 90 days)
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const { data: weightLogs } = await supabase
    .from('daily_logs')
    .select('date, weight')
    .eq('user_id', patientId)
    .not('weight', 'is', null)
    .gte('date', since90.toISOString().split('T')[0])
    .order('date', { ascending: true });

  const weights = (weightLogs || []).filter((w: any) => w.weight);
  const weightStart = weights[0]?.weight || patient.weight || '—';
  const weightCurrent = weights[weights.length - 1]?.weight || patient.weight || '—';
  const weightDiff =
    typeof weightStart === 'number' && typeof weightCurrent === 'number'
      ? (weightCurrent - weightStart).toFixed(1)
      : '—';

  // 3. Nutrition averages (last 28 days)
  const since28 = new Date();
  since28.setDate(since28.getDate() - 28);

  const { data: mealLogs } = await supabase
    .from('meals')
    .select('name, calories, protein, created_at')
    .eq('user_id', patientId)
    .gte('created_at', since28.toISOString());

  const totalDays = 28;
  const meals = mealLogs || [];
  const loggedDays = new Set(meals.map((m: any) => m.created_at?.split('T')[0])).size;
  const adherencePercent = Math.round((loggedDays / totalDays) * 100);

  const totalCal  = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
  const totalProt = meals.reduce((s: number, m: any) => s + (m.protein  || 0), 0);
  const avgCalories = loggedDays > 0 ? Math.round(totalCal  / loggedDays) : 0;
  const avgProtein  = loggedDays > 0 ? Math.round(totalProt / loggedDays) : 0;

  // Pratos mais consumidos (top 5 por frequência)
  const mealFreq: Record<string, { count: number; avgCal: number }> = {};
  meals.forEach((m: any) => {
    const key = (m.name || '').trim().toLowerCase();
    if (!key) return;
    if (!mealFreq[key]) mealFreq[key] = { count: 0, avgCal: 0 };
    mealFreq[key].count++;
    mealFreq[key].avgCal += (m.calories || 0);
  });
  Object.values(mealFreq).forEach(v => { v.avgCal = Math.round(v.avgCal / v.count); });

  const topMeals = Object.entries(mealFreq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, { count, avgCal }]) => `${name} (${count}x, ~${avgCal}kcal)`);

  // Refeições pesadas repetidas: > 700 kcal consumidas 2+ vezes
  const heavyMeals = Object.entries(mealFreq)
    .filter(([, { count, avgCal }]) => avgCal > 700 && count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { count, avgCal }]) => `${name} (${count}x, ~${avgCal}kcal)`);

  // 4. Integrações de fitness (Strava / Google Fit)
  // Diário pessoal: notas + energia (últimos 30 dias)
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const { data: diaryLogs } = await supabase
    .from('daily_logs')
    .select('date, notes, energy_level')
    .eq('user_id', patientId)
    .gte('date', since30.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(30);

  const diaryEntries = (diaryLogs || []) as { date: string; notes: string | null; energy_level: string | null }[];
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Média de energia (Baixa=1, Média=2, Boa=3, Flow=4)
  const energyMap: Record<string, number> = { Baixa: 1, Média: 2, Boa: 3, Flow: 4 };
  const energyValues = diaryEntries.map(e => energyMap[e.energy_level ?? ''] ?? null).filter((v): v is number => v !== null);
  const avgEnergy = energyValues.length > 0
    ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
    : null;
  const avgEnergyLabel = avgEnergy === null ? 'Sem dados'
    : avgEnergy < 1.5 ? `Baixa (média ${avgEnergy.toFixed(1)})`
    : avgEnergy < 2.5 ? `Média (média ${avgEnergy.toFixed(1)})`
    : avgEnergy < 3.5 ? `Boa (média ${avgEnergy.toFixed(1)})`
    : `Flow (média ${avgEnergy.toFixed(1)})`;

  // Notas com conteúdo
  const diaryWithNotes = diaryEntries.filter(e => e.notes && e.notes.trim() !== '');
  const diarySummary = diaryWithNotes.length > 0
    ? diaryWithNotes.slice(0, 10).map(e => `• ${fmtDate(e.date)}${e.energy_level ? ` [${e.energy_level}]` : ''}: "${e.notes}"`).join('\n')
    : null;

  const [{ data: integrations }, { data: activityLogs }, { data: hydrationLogs }] = await Promise.all([
    // Quais serviços estão conectados
    supabase
      .from('user_integrations')
      .select('service')
      .eq('user_id', patientId)
      .eq('is_connected', true),

    // Treinos dos últimos 28 dias
    supabase
      .from('activities')
      .select('activity_type, calories_burned, duration_seconds, activity_date')
      .eq('user_id', patientId)
      .gte('activity_date', since28.toISOString()),

    // Hidratação dos últimos 28 dias
    supabase
      .from('daily_logs')
      .select('water_intake, water_goal, date')
      .eq('user_id', patientId)
      .gte('date', since28.toISOString().split('T')[0])
      .not('water_intake', 'is', null),
  ]);

  const connectedServices = (integrations || []).map((i: any) => i.service);

  // Resumo de treinos por tipo
  const activitySummary: Record<string, { count: number; totalCal: number; totalMin: number }> = {};
  (activityLogs || []).forEach((a: any) => {
    const type = a.activity_type || 'Outro';
    if (!activitySummary[type]) activitySummary[type] = { count: 0, totalCal: 0, totalMin: 0 };
    activitySummary[type].count++;
    activitySummary[type].totalCal += a.calories_burned || 0;
    activitySummary[type].totalMin += Math.round((a.duration_seconds || 0) / 60);
  });
  const topActivities = Object.entries(activitySummary)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([type, { count, totalCal, totalMin }]) =>
      `${type} (${count}x, ${Math.round(totalCal / count)}kcal médio, ~${Math.round(totalMin / count)}min)`);
  const avgDailyBurn = activityLogs && activityLogs.length > 0
    ? Math.round((activityLogs as any[]).reduce((s: number, a: any) => s + (a.calories_burned || 0), 0) / 28)
    : 0;

  // Hidratação
  const waterLogs = hydrationLogs || [];
  const avgWater = waterLogs.length > 0
    ? Math.round(waterLogs.reduce((s: number, l: any) => s + (l.water_intake || 0), 0) / waterLogs.length)
    : null;
  const waterGoal = waterLogs[0]?.water_goal || patient.water_goal_ml || 2000;
  const waterAdherence = avgWater != null ? Math.round((avgWater / waterGoal) * 100) : null;

  // 5. GLP-1 symptoms (last 4 check-ins)
  const checkins = (patient.glp1_weekly_checkins || []).slice(-4);
  const symptomCounts: Record<string, number> = {};
  checkins.forEach((c: any) => {
    (c.symptoms || []).forEach((s: string) => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
  });
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  // 5. BMI
  const bmi =
    patient.weight && patient.height
      ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
      : '—';

  const concernMap: Record<string, string> = {
    muscle_loss: 'Perder massa muscular',
    long_term: 'Manter resultado a longo prazo',
    what_to_eat: 'Saber o que comer',
    side_effects: 'Lidar com efeitos colaterais',
  };

  const phaseMap: Record<string, string> = {
    start: 'Início (< 1 mês)',
    adjust: 'Ajuste (1-3 meses)',
    maintain: 'Manutenção (> 3 meses)',
  };

  // Lifestyle label helpers
  const additionalGoalLabels: Record<string, string> = {
    relacao_comida: 'Melhorar relação com comida',
    bem_estar: 'Bem-estar geral',
    gerir_stress: 'Gerir estresse',
    melhorar_sono: 'Melhorar o sono',
    aumentar_energia: 'Aumentar energia',
  };
  const habitChangeLabels: Record<string, string> = {
    comer_noite: 'Comer à noite',
    beliscar: 'Beliscar entre refeições',
    doces: 'Consumo excessivo de doces',
    sedentarismo: 'Sedentarismo',
  };
  const eatingLocationLabels: Record<string, string> = {
    casa: 'Em casa',
    trabalho: 'No trabalho',
    restaurante: 'Em restaurantes',
  };

  const additionalGoalsList = (patient.additional_goals || []).map((g: string) => additionalGoalLabels[g] ?? g);
  const habitChangesList = (patient.habit_changes || []).map((h: string) => habitChangeLabels[h] ?? h);
  const dietaryRestrictionsList = (patient.dietary_restrictions || []) as string[];

  const context = `
Paciente: ${patient.display_name || 'Paciente'}, ${patientAge ?? '—'} anos, ${patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : '—'}
IMC: ${bmi} | Peso: ${patient.weight || '—'}kg | Altura: ${patient.height || '—'}cm
GLP-1: ${patient.glp1_medication || 'Não usa'} — Fase: ${phaseMap[patient.glp1_phase] || 'N/A'}

Perfil alimentar e estilo de vida (coletado no onboarding):
- Tipo de dieta: ${patient.diet_type || 'Não informado'}
- Refeições por dia: ${patient.meals_per_day || 'Não informado'}
- Janela alimentar: ${patient.eating_window_start && patient.eating_window_end ? `${patient.eating_window_start} – ${patient.eating_window_end}` : 'Não informado'}
- Onde costuma comer: ${eatingLocationLabels[patient.eating_location] ?? patient.eating_location ?? 'Não informado'}
- Consome água suficiente: ${{ sim: 'Sim', nao: 'Não', incerto: 'Incerto' }[patient.drinks_enough_water as string] ?? 'Não informado'}
- Restrições / alergias alimentares: ${dietaryRestrictionsList.length > 0 ? dietaryRestrictionsList.join(', ') : 'Nenhuma'}${patient.dietary_restrictions_detail ? ` (detalhe: ${patient.dietary_restrictions_detail})` : ''}
- Objetivos adicionais: ${additionalGoalsList.length > 0 ? additionalGoalsList.join(', ') : 'Nenhum'}
- Hábitos que deseja mudar: ${habitChangesList.length > 0 ? habitChangesList.join(', ') : 'Nenhum informado'}

Evolução de peso (90 dias): ${weightStart}kg → ${weightCurrent}kg (${parseFloat(weightDiff) > 0 ? '+' : ''}${weightDiff}kg)

Nutrição (média 28 dias):
- Calorias: ${avgCalories}kcal/dia (meta: ${patient.target_calories || '—'}kcal)
- Proteína: ${avgProtein}g/dia (meta: ${patient.target_protein || '—'}g)
- Adesão ao plano: ${adherencePercent}% dos dias

Pratos mais consumidos (28 dias): ${topMeals.length > 0 ? topMeals.join(', ') : 'Sem dados'}
Refeições pesadas repetidas (>700kcal, 2+ vezes): ${heavyMeals.length > 0 ? heavyMeals.join(', ') : 'Nenhuma'}

Atividade física (28 dias):
- Integrações ativas: ${connectedServices.length > 0 ? connectedServices.join(', ') : 'Nenhuma'}
- Treinos: ${topActivities.length > 0 ? topActivities.join(' | ') : 'Sem dados'}
- Gasto calórico médio com treinos: ${avgDailyBurn > 0 ? `${avgDailyBurn}kcal/dia` : 'Sem dados'}

Hidratação (28 dias):
- Média: ${avgWater != null ? `${avgWater}ml/dia` : 'Sem dados'} (meta: ${waterGoal}ml${waterAdherence != null ? `, ${waterAdherence}% de adesão` : ''})

Sintomas frequentes GLP-1: ${topSymptoms.length > 0 ? topSymptoms.join(', ') : 'Nenhum relatado'}
Principal preocupação: ${concernMap[patient.glp1_main_concern] || 'N/A'}

Diário pessoal — Energia média (30 dias): ${avgEnergyLabel} (${energyValues.length} registros)
Distribuição: Baixa: ${energyValues.filter(v => v === 1).length}x | Média: ${energyValues.filter(v => v === 2).length}x | Boa: ${energyValues.filter(v => v === 3).length}x | Flow: ${energyValues.filter(v => v === 4).length}x

Notas do diário (últimos 30 dias):
${diarySummary ?? 'Nenhuma nota registrada no período.'}
  `.trim();

  // 6. Gerar briefing via Gemini (mesmo padrão do chat do paciente)
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(
      `Você é um assistente médico especializado em nutrição e emagrecimento.
Gere um briefing pré-consulta objetivo e clinicamente relevante para o médico.
Use português brasileiro. Seja direto e prático.
Formato: seções com emojis, máximo 500 palavras.

Inclua obrigatoriamente:
- Perfil alimentar e estilo de vida: mencione o tipo de dieta, restrições ou alergias (críticas para o plano), hábitos que deseja mudar e objetivos adicionais informados no onboarding — esses dados refletem a realidade do paciente e devem guiar as recomendações
- Progresso de peso e adesão ao plano
- Padrão alimentar: comente os pratos mais consumidos e destaque refeições pesadas repetidas com nome e frequência (ex: "consumiu tiramisu 3x na semana"); cruce com o tipo de dieta declarado pelo paciente (ex: dieta vegetariana mas consumindo carne frequentemente)
- Atividade física e hidratação: se há dados de treinos, comente o gasto calórico vs ingestão; alerte se o paciente treina mas não compensa na hidratação ou proteína; se não há integração ativa, mencione brevemente; cruce com a resposta de hidratação do onboarding
- Diário pessoal: se houver notas relevantes, cite textualmente as mais significativas usando o nome do paciente (ex: "em seu diário, João relatou desconforto intestinal após comer feijão em 02/05"); ignore notas triviais
- Pontos de atenção clínicos
- Sugestões objetivas para a consulta, levando em conta os hábitos que o paciente quer mudar e seus objetivos adicionais

Dados do paciente:
${context}`
    );
    return result.response.text() || buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms);
  } catch {
    return buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms);
  }
}

function buildFallbackBriefing(
  _context: string,
  patient: any,
  weightDiff: any,
  adherencePercent: number,
  topSymptoms: string[]
): string {
  const diffNum = parseFloat(weightDiff);
  const progressLine =
    diffNum < 0
      ? `perdeu ${Math.abs(diffNum)}kg nos últimos 90 dias ✅`
      : diffNum > 0
      ? `ganhou ${diffNum}kg nos últimos 90 dias ⚠️`
      : 'sem dados de evolução de peso';

  return `📋 **BRIEFING PRÉ-CONSULTA**

👤 **Paciente:** ${patient.display_name || 'Paciente'}, ${patientAge ?? '—'} anos
⚖️ **IMC:** ${patient.weight && patient.height ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1) : '—'} | ${patient.weight || '—'}kg

📉 **Progresso:** ${progressLine}

🥗 **Nutrição (28 dias):**
- Adesão ao plano: ${adherencePercent}% dos dias
${adherencePercent < 50 ? '- ⚠️ Baixa adesão — investigar barreiras' : '- ✅ Boa adesão ao registro'}

💊 **GLP-1:** ${patient.glp1_medication || 'Não usa'} — ${patient.glp1_phase || 'N/A'}
${topSymptoms.length > 0 ? `🔴 **Sintomas:** ${topSymptoms.join(', ')}` : '✅ **Sintomas:** Nenhum relatado'}

🎯 **Preocupação principal:** ${patient.glp1_main_concern || 'N/A'}

📌 **Pontos para a consulta:**
- Revisar dose atual e tolerabilidade
- Verificar ingestão proteica (meta: ${patient.weight ? Math.round(patient.weight * 1.2) : '—'}g/dia)
- Avaliar composição corporal`;
}
