import { CaramelAI, CARAMEL_DEEP_MODEL } from './caramelAI';
import { supabase } from '../services/supabase';
import { ClinicalLoopService } from '../services/clinicalLoopService';
import { NutritionKnowledgeService } from '../services/nutritionKnowledgeService';

const genAI = new CaramelAI();
const MODEL_NAME = CARAMEL_DEEP_MODEL;

export interface ConsultationBriefingResult {
  text: string;
  reportId: string | null;
}

export async function generateConsultationBriefing(patientId: string): Promise<ConsultationBriefingResult> {
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

  // 2. Weight history (last 90 days) — weight_logs é onde o paciente registra
  // peso (manual/body scan/wearable); daily_logs.weight é legado e fica vazio
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('logged_at, weight_kg')
    .eq('user_id', patientId)
    .gte('logged_at', since90.toISOString())
    .order('logged_at', { ascending: true });

  const weights = (weightLogs || []).filter((w: any) => w.weight_kg).map((w: any) => ({ weight: Number(w.weight_kg) }));
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

  // 4b. Check-ins diários (humor/energia/sono em escala 1–10) — 30 dias
  const { data: dailyCheckins } = await supabase
    .from('daily_checkins')
    .select('checkin_date, mood, energy_level, sleep_hours, notes')
    .eq('user_id', patientId)
    .gte('checkin_date', since30.toISOString().split('T')[0])
    .order('checkin_date', { ascending: false })
    .limit(30);

  const checkinRows = dailyCheckins || [];
  const avgOf = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => typeof x === 'number');
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const avgMood10   = avgOf(checkinRows.map((c: any) => c.mood));
  const avgEnergy10 = avgOf(checkinRows.map((c: any) => c.energy_level));
  const avgSleepH   = avgOf(checkinRows.map((c: any) => c.sleep_hours));
  const checkinSummary = checkinRows.length > 0
    ? `${checkinRows.length} check-ins em 30 dias — Humor médio ${avgMood10?.toFixed(1) ?? '—'}/10 | Energia ${avgEnergy10?.toFixed(1) ?? '—'}/10 | Sono ${avgSleepH?.toFixed(1) ?? '—'}h`
      + `; últimos 3 (humor): ${checkinRows.slice(0, 3).map((c: any) => `${c.mood ?? '—'}/10`).join(' ← ')}`
    : 'Sem check-ins no período';

  // 4c. Dispositivos (Health Connect / HealthKit) — 28 dias
  const { data: deviceMetrics } = await supabase
    .from('health_daily_metrics')
    .select('steps, sleep_minutes, resting_heart_rate')
    .eq('user_id', patientId)
    .gte('metric_date', since28.toISOString().split('T')[0]);

  const devRows = deviceMetrics || [];
  const avgSteps   = avgOf(devRows.map((d: any) => d.steps > 0 ? d.steps : null));
  const avgSleepMin = avgOf(devRows.map((d: any) => d.sleep_minutes > 0 ? d.sleep_minutes : null));
  const restHr     = avgOf(devRows.map((d: any) => d.resting_heart_rate > 0 ? d.resting_heart_rate : null));
  const deviceSummary = (avgSteps || avgSleepMin || restHr)
    ? `Passos ${avgSteps != null ? Math.round(avgSteps).toLocaleString('pt-BR') + '/dia' : '—'} | `
      + `Sono ${avgSleepMin != null ? (avgSleepMin / 60).toFixed(1) + 'h/noite' : '—'} | `
      + `FC repouso ${restHr != null ? Math.round(restHr) + ' bpm' : '—'}`
    : 'Sem dispositivo conectado (Health Connect/HealthKit)';

  // 4d. Última consulta finalizada — continuidade clínica (RLS: só notas do
  // próprio médico autenticado)
  const { data: lastNote } = await supabase
    .from('clinical_notes')
    .select('finalized_at, diagnosis, plan, weight_kg, blood_pressure_sys, blood_pressure_dia, heart_rate, waist_cm')
    .eq('patient_id', patientId)
    .eq('is_draft', false)
    .order('finalized_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastConsultSummary = lastNote
    ? `Data: ${lastNote.finalized_at ? fmtDate(lastNote.finalized_at) : '—'}`
      + ` | Peso: ${lastNote.weight_kg ?? '—'}kg`
      + (lastNote.blood_pressure_sys ? ` | PA: ${lastNote.blood_pressure_sys}/${lastNote.blood_pressure_dia}` : '')
      + (lastNote.heart_rate ? ` | FC: ${lastNote.heart_rate}bpm` : '')
      + (lastNote.waist_cm ? ` | Cintura: ${lastNote.waist_cm}cm` : '')
      + (lastNote.diagnosis ? `\n- Diagnóstico: ${lastNote.diagnosis}` : '')
      + (lastNote.plan ? `\n- Conduta combinada: ${lastNote.plan}` : '')
    : 'Primeira consulta com este médico (sem prontuário anterior)';

  // 5. GLP-1 symptoms — glp1_dose_logs é o registro canônico de aplicações;
  // profiles.glp1_weekly_checkins é o formato legado (fallback)
  const { data: doseLogs } = patient.glp1_mode
    ? await supabase
        .from('glp1_dose_logs')
        .select('symptoms_reported')
        .eq('user_id', patientId)
        .order('applied_at', { ascending: false })
        .limit(4)
    : { data: null };

  const symptomSources: string[][] = (doseLogs && doseLogs.length > 0)
    ? doseLogs.map((d: any) => d.symptoms_reported || [])
    : ((patient.glp1_weekly_checkins || []).slice(-4)).map((c: any) => c.symptoms || []);

  const symptomCounts: Record<string, number> = {};
  symptomSources.forEach(symptoms => {
    symptoms.forEach((s: string) => {
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

  // 5b. Composição corporal — último body scan (crítico p/ a Inteligência clínica)
  const { data: lastScan } = await supabase
    .from('body_measurement_snapshots')
    .select('avg_body_fat_pct, avg_muscle_mass_kg, waist_cm, hip_cm, chest_cm, bmi, weight_kg, snapped_at')
    .eq('user_id', patientId)
    .order('snapped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const bodyComposition = lastScan
    ? `Composição corporal (último scan ${fmtDate(lastScan.snapped_at)}): `
      + `BF ${lastScan.avg_body_fat_pct ?? '—'}% | Massa magra ${lastScan.avg_muscle_mass_kg ?? '—'}kg | `
      + `Cintura ${lastScan.waist_cm ?? '—'}cm | Quadril ${lastScan.hip_cm ?? '—'}cm | IMC ${lastScan.bmi ?? '—'}`
    : 'Composição corporal: sem body scan registrado';

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

Última consulta deste médico:
${lastConsultSummary}

Evolução de peso (90 dias): ${weightStart}kg → ${weightCurrent}kg (${parseFloat(weightDiff) > 0 ? '+' : ''}${weightDiff}kg)
${bodyComposition}

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

Dispositivos (28 dias): ${deviceSummary}

Check-ins de bem-estar (30 dias): ${checkinSummary}

Sintomas frequentes GLP-1: ${topSymptoms.length > 0 ? topSymptoms.join(', ') : 'Nenhum relatado'}
Principal preocupação: ${concernMap[patient.glp1_main_concern] || 'N/A'}

Diário pessoal — Energia média (30 dias): ${avgEnergyLabel} (${energyValues.length} registros)
Distribuição: Baixa: ${energyValues.filter(v => v === 1).length}x | Média: ${energyValues.filter(v => v === 2).length}x | Boa: ${energyValues.filter(v => v === 3).length}x | Flow: ${energyValues.filter(v => v === 4).length}x

Notas do diário (últimos 30 dias):
${diarySummary ?? 'Nenhuma nota registrada no período.'}
  `.trim();

  // Snapshot de features p/ treino (loop fechado) — SEM identificadores diretos
  const inputSnapshot: Record<string, unknown> = {
    age: patientAge,
    gender: patient.gender,
    bmi,
    glp1_medication: patient.glp1_medication ?? null,
    glp1_phase: patient.glp1_phase ?? null,
    weight_start: weightStart,
    weight_current: weightCurrent,
    weight_diff_90d: weightDiff,
    avg_calories: avgCalories,
    avg_protein: avgProtein,
    target_calories: patient.target_calories ?? null,
    target_protein: patient.target_protein ?? null,
    adherence_percent: adherencePercent,
    top_meals: topMeals,
    heavy_meals: heavyMeals,
    connected_services: connectedServices,
    top_activities: topActivities,
    avg_daily_burn: avgDailyBurn,
    avg_water: avgWater,
    water_goal: waterGoal,
    water_adherence: waterAdherence,
    top_symptoms: topSymptoms,
    avg_energy_label: avgEnergyLabel,
    body_composition: lastScan ?? null,   // body scan: feature crítica p/ a Inteligência
    avg_mood_10: avgMood10,
    avg_energy_10: avgEnergy10,
    avg_sleep_hours: avgSleepH,
    avg_steps: avgSteps != null ? Math.round(avgSteps) : null,
    device_sleep_minutes: avgSleepMin != null ? Math.round(avgSleepMin) : null,
    resting_heart_rate: restHr != null ? Math.round(restHr) : null,
    last_consult_vitals: lastNote ? {
      weight_kg: lastNote.weight_kg,
      bp_sys: lastNote.blood_pressure_sys,
      bp_dia: lastNote.blood_pressure_dia,
      heart_rate: lastNote.heart_rate,
      waist_cm: lastNote.waist_cm,
    } : null,
  };

  // Resolve o médico autenticado (p/ vincular o relatório ao feedback dele)
  const { data: authData } = await supabase.auth.getUser();
  let doctorId: string | null = null;
  if (authData?.user) {
    const { data: doc } = await supabase
      .from('doctors').select('id').eq('user_id', authData.user.id).maybeSingle();
    doctorId = doc?.id ?? null;
  }

  const persistBriefing = async (text: string): Promise<string | null> =>
    ClinicalLoopService.saveAiReport({
      patient_id:    patientId,
      doctor_id:     doctorId,
      report_type:   'pre_consult_briefing',
      model:         MODEL_NAME,
      content:       text,
      input_snapshot: inputSnapshot,
      input_window_start: since90.toISOString(),
      input_window_end:   new Date().toISOString(),
    });

  // 5c. Base de conhecimento da agente (teoria curada + experiência empírica),
  // consultada com o quadro clínico do paciente — mesmas duas memórias usadas
  // no chat e na geração do plano de 3 meses.
  const knowledgeQuery = `Quadro clínico: objetivo ${patient.goal || patient.primary_goal || 'não definido'}, `
    + `${patientAge ? `${patientAge} anos, ` : ''}IMC ${bmi}, adesão ${adherencePercent}%, `
    + `restrições: ${dietaryRestrictionsList.join(', ') || 'nenhuma'}.`
    + (topSymptoms.length > 0 ? ` Sintomas: ${topSymptoms.join(', ')}.` : '');

  const [guidelineMatches, empiricalMatches] = await Promise.all([
    NutritionKnowledgeService.search(knowledgeQuery, 3),
    NutritionKnowledgeService.searchEmpiricalCases(knowledgeQuery, 2),
  ]);
  const knowledgeBlock = NutritionKnowledgeService.formatAsContextBlock(guidelineMatches)
    + NutritionKnowledgeService.formatEmpiricalBlock(empiricalMatches);

  // 6. Gerar briefing via Caramel (mesmo padrão do chat do paciente)
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(
      `Você é um assistente médico especializado em nutrição e emagrecimento.
Gere um briefing pré-consulta para o médico ler em 2 minutos, imediatamente antes de atender.
Use português brasileiro. Seja direto e prático. Máximo 450 palavras.

ESTRUTURA OBRIGATÓRIA, nesta ordem:

⚡ **RESUMO** — no máximo 3 bullets com o que o médico PRECISA saber antes de abrir a câmera: a mudança mais importante desde a última consulta, o maior risco/ponto de atenção e o que o paciente espera resolver. Se houver conduta combinada na consulta anterior, diga se o paciente a está cumprindo.

Depois, seções curtas com emojis:
- 📉 **Peso e composição** — evolução de 90 dias e delta desde a última consulta; use os dados de body scan se existirem
- 🥗 **Padrão alimentar** — adesão ao registro, médias vs metas, pratos mais consumidos; destaque refeições pesadas repetidas com nome e frequência (ex: "tiramisu 3x na semana"); cruze com o tipo de dieta declarado (ex: declara dieta vegetariana mas registra carne)
- 🏃 **Atividade, sono e hidratação** — treinos, passos e sono de dispositivos; gasto vs ingestão; cruze com a resposta de hidratação do onboarding; se não há dados, uma linha só
- 😊 **Bem-estar** — humor/energia dos check-ins e do diário; cite textualmente no máximo 2 notas do diário clinicamente relevantes usando o nome do paciente (ex: "João relatou desconforto intestinal após feijão em 02/05"); ignore notas triviais
- 💊 **GLP-1** — só se o paciente usa: medicação, fase, sintomas relatados
- 🎯 **Sugestões para esta consulta** — no máximo 4 ações objetivas, priorizadas, ligadas à conduta anterior, aos hábitos que o paciente quer mudar e aos objetivos declarados

Regras:
- NÃO repita o mesmo dado em duas seções; cada número aparece uma vez, na seção certa
- Se uma seção não tem dados, escreva uma linha só (ex: "Sem dados de treino — nenhuma integração ativa") em vez de especular
- Não invente dados nem calcule estimativas não pedidas; use apenas o que está abaixo
- Não use jargão de app ("logou", "trackeou"); escreva como colega médico
- Ao usar a base de conhecimento abaixo, incorpore-a de forma implícita nas seções acima (ex: embase uma sugestão nela); NÃO crie uma seção separada para citá-la
${knowledgeBlock}

Dados do paciente:
${context}`
    );
    const text = result.response.text() || buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms, patientAge);
    const reportId = await persistBriefing(text);
    return { text, reportId };
  } catch {
    const text = buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms, patientAge);
    const reportId = await persistBriefing(text);
    return { text, reportId };
  }
}

function buildFallbackBriefing(
  _context: string,
  patient: any,
  weightDiff: any,
  adherencePercent: number,
  topSymptoms: string[],
  patientAge: number | null
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
