// =====================================================
// Malama — Edge Function: generate-empirical-cases
// Memória empírica do agente nutricional (RAG duplo).
//
// Roda mensalmente via pg_cron (dia 1, 03:15 UTC) e sob demanda via
// `npm run rag:casos`. Agrega desfechos de planos trimestrais ENCERRADOS
// em padrões de caso por coorte e grava em empirical_cases.
//
// Sinais coletados por usuário (janela do plano) — só dados estruturados:
//   * weight_logs      → variação % de peso
//   * daily_logs       → adesão, sono, passos, energia, estresse, água
//   * activities       → sessões/semana, tipos, duração (Strava/Health)
//   * meals            → refeições/dia, calorias e proteína vs metas
//   * glp1_dose_logs   → uso de GLP-1 (só presença, agregado como %)
//   * profiles         → objetivo, sexo, faixa etária, biotipo, dieta,
//                        restrições alimentares (inclui alergias)
//
// Privacidade (inegociável):
//   * k-anonimato: coorte mínima de 3 usuários por caso publicado.
//   * NUNCA texto livre do usuário — só campos estruturados/agregados.
//   * Idades viram faixas; pesos viram %; nada identificável sai daqui.
//
// Autorização: exige a service role key (cron/trigger); usuários comuns
// não conseguem disparar.
// Deploy: `supabase functions deploy generate-empirical-cases`.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const CARAMELO_API_URL = Deno.env.get('CARAMELO_API_URL') ?? '';
const CARAMELO_API_KEY = Deno.env.get('CARAMELO_API_KEY') ?? '';

const MIN_COHORT_SIZE = 3;        // k-anonimato
const MIN_WEIGHT_LOGS = 2;
const MIN_TRACKING_DAYS = 30;
const EMBEDDING_MODEL = 'caramelo-embed';
const EMBEDDING_DIMENSIONS = 768; // deve casar com empirical_cases.embedding vector(768)
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'; // usado só no fallback

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── LLM (Caramel + fallback Gemini para texto; embeddings SEM fallback) ──────

async function embedText(text: string): Promise<number[]> {
  // SEM fallback Gemini: vetor Gemini contra base re-embeddada com Qwen seria
  // incompatível. Falha fechada — melhor abortar o caso do que gravar lixo.
  const res = await fetch(`${CARAMELO_API_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CARAMELO_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMENSIONS }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `embed HTTP ${res.status}`);
  return data.data[0].embedding;
}

async function generateText(prompt: string): Promise<string> {
  // Primário: Caramel (caramelo-auto). Fallback: Gemini.
  try {
    const res = await fetch(`${CARAMELO_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CARAMELO_API_KEY}` },
      body: JSON.stringify({
        model: 'caramelo-auto',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Caramel HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Caramel devolveu resposta vazia');
    return text;
  } catch (caramelErr) {
    console.warn('⚠️ Caramel falhou, fallback Gemini:', String(caramelErr));
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `generate HTTP ${res.status}`);
    const parts: any[] = data.candidates?.[0]?.content?.parts || [];
    return parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');
  }
}

// ─── Anonimização ─────────────────────────────────────────────────────────────

function ageBand(age: number | null): string {
  if (!age || age < 18) return 'na';
  if (age < 30) return '18-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  return '60+';
}

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const GOAL_LABELS: Record<string, string> = {
  aesthetic: 'emagrecimento / estética',
  performance: 'performance / ganho de massa',
  health: 'saúde metabólica',
};

function classifyOutcome(goal: string, weightChangePct: number, adherencePct: number): string {
  if (goal === 'aesthetic') {
    if (weightChangePct <= -3) return 'success';
    if (weightChangePct <= -0.5) return 'partial';
    return 'failure';
  }
  if (goal === 'performance') {
    if (weightChangePct >= 2) return 'success';
    if (weightChangePct >= 0.5) return 'partial';
    return 'failure';
  }
  if (Math.abs(weightChangePct) <= 2 && adherencePct >= 40) return 'success';
  if (adherencePct >= 20) return 'partial';
  return 'failure';
}

// ─── Coleta por usuário/plano ────────────────────────────────────────────────

interface MemberOutcome {
  cohortKey: string;
  goal: string;
  outcome: string;
  weightChangePct: number;
  adherencePct: number;
  avgSleepHours: number | null;
  avgSteps: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  waterAdherencePct: number | null;
  activitySessionsPerWeek: number | null;
  topActivityTypes: string[];
  mealsPerDay: number | null;
  calorieAdherencePct: number | null;
  proteinAdherencePct: number | null;
  onGlp1: boolean;
  dietType: string | null;
  restrictions: string[];
  biotype: string;
  activityLevel: string;
  strategies: string[];
}

const avgOf = (vals: (number | null | undefined)[]): number | null => {
  const nums = vals.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
};

async function collectOutcomes(): Promise<MemberOutcome[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: plans, error: plansErr } = await supabase
    .from('quarterly_plans')
    .select('id, user_id, start_date, end_date, content')
    .lt('end_date', today);
  if (plansErr) throw plansErr;

  const outcomes: MemberOutcome[] = [];

  for (const plan of plans || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal, gender, date_of_birth, age, biotype, activity_level, diet_type, dietary_restrictions, target_calories, target_protein, glp1_mode_active, glp1_medication')
      .eq('id', plan.user_id)
      .single();
    if (!profile?.goal || !profile?.gender) continue;

    const age = profile.age || computeAge(profile.date_of_birth);

    const windowStart = new Date(plan.start_date);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(plan.end_date);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const planDays = (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / 86400000;

    // Peso: precisa de trajetória mensurável
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', plan.user_id)
      .gte('logged_at', windowStart.toISOString())
      .lte('logged_at', windowEnd.toISOString())
      .order('logged_at', { ascending: true });

    if (!weights || weights.length < MIN_WEIGHT_LOGS) continue;
    const first = weights[0];
    const last = weights[weights.length - 1];
    const spanDays = (new Date(last.logged_at).getTime() - new Date(first.logged_at).getTime()) / 86400000;
    if (spanDays < MIN_TRACKING_DAYS) continue;
    const weightChangePct = ((last.weight_kg - first.weight_kg) / first.weight_kg) * 100;

    // Diários: adesão + sono + passos + energia + estresse + água
    const { data: dailies } = await supabase
      .from('daily_logs')
      .select('date, sleep_hours, steps, energy_level, stress_level, water_intake, water_goal')
      .eq('user_id', plan.user_id)
      .gte('date', plan.start_date)
      .lte('date', plan.end_date);

    const dayCount = dailies?.length || 0;
    const adherencePct = planDays > 0 ? Math.min(100, (dayCount / planDays) * 100) : 0;
    const avgSleepHours = avgOf((dailies || []).map((d) => d.sleep_hours));
    const avgSteps = avgOf((dailies || []).map((d) => d.steps));
    const avgEnergy = avgOf((dailies || []).map((d) => d.energy_level));
    const avgStress = avgOf((dailies || []).map((d) => d.stress_level));
    const waterAdherencePct = avgOf(
      (dailies || [])
        .filter((d) => d.water_goal > 0 && d.water_intake != null)
        .map((d) => Math.min(100, (d.water_intake / d.water_goal) * 100))
    );

    // Atividades físicas (Strava / Health Connect / HealthKit)
    const { data: acts } = await supabase
      .from('activities')
      .select('activity_type, duration_seconds')
      .eq('user_id', plan.user_id)
      .gte('activity_date', plan.start_date)
      .lte('activity_date', plan.end_date);

    const activitySessionsPerWeek = planDays > 0 && acts ? (acts.length / planDays) * 7 : null;
    const typeCounts: Record<string, number> = {};
    (acts || []).forEach((a) => {
      if (a.activity_type) typeCounts[a.activity_type] = (typeCounts[a.activity_type] || 0) + 1;
    });
    const topActivityTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    // Alimentação registrada: refeições/dia + calorias/proteína vs metas
    const { data: meals } = await supabase
      .from('meals')
      .select('calories, protein, created_at')
      .eq('user_id', plan.user_id)
      .gte('created_at', new Date(plan.start_date).toISOString())
      .lte('created_at', windowEnd.toISOString());

    let mealsPerDay: number | null = null;
    let calorieAdherencePct: number | null = null;
    let proteinAdherencePct: number | null = null;
    if (meals && meals.length > 0) {
      const byDay: Record<string, { cal: number; prot: number }> = {};
      meals.forEach((m) => {
        const day = m.created_at.slice(0, 10);
        byDay[day] = byDay[day] || { cal: 0, prot: 0 };
        byDay[day].cal += m.calories || 0;
        byDay[day].prot += m.protein || 0;
      });
      const daysWithMeals = Object.keys(byDay).length;
      mealsPerDay = meals.length / daysWithMeals;
      if (profile.target_calories > 0) {
        calorieAdherencePct = avgOf(
          Object.values(byDay).map((d) => Math.min(150, (d.cal / profile.target_calories) * 100))
        );
      }
      if (profile.target_protein > 0) {
        proteinAdherencePct = avgOf(
          Object.values(byDay).map((d) => Math.min(150, (d.prot / profile.target_protein) * 100))
        );
      }
    }

    // GLP-1: só presença de uso (agregado como % da coorte)
    const { count: glp1Count } = await supabase
      .from('glp1_dose_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', plan.user_id)
      .gte('applied_at', new Date(plan.start_date).toISOString())
      .lte('applied_at', windowEnd.toISOString());
    const onGlp1 = (glp1Count || 0) > 0 || !!profile.glp1_mode_active || !!profile.glp1_medication;

    // Estratégias: só bullets do plano gerado pela IA (nunca texto do usuário)
    const strategies: string[] = (plan.content?.phases || [])
      .flatMap((p: any) => p.bullets || [])
      .slice(0, 15);

    outcomes.push({
      cohortKey: `${profile.goal}|${profile.gender}|${ageBand(age)}`,
      goal: profile.goal,
      outcome: classifyOutcome(profile.goal, weightChangePct, adherencePct),
      weightChangePct: Number(weightChangePct.toFixed(1)),
      adherencePct: Number(adherencePct.toFixed(0)),
      avgSleepHours,
      avgSteps,
      avgEnergy,
      avgStress,
      waterAdherencePct,
      activitySessionsPerWeek,
      topActivityTypes,
      mealsPerDay,
      calorieAdherencePct,
      proteinAdherencePct,
      onGlp1,
      dietType: profile.diet_type || null,
      restrictions: profile.dietary_restrictions || [],
      biotype: profile.biotype || 'na',
      activityLevel: profile.activity_level || 'na',
      strategies,
    });
  }

  return outcomes;
}

// ─── Geração por coorte ───────────────────────────────────────────────────────

function groupStats(members: MemberOutcome[]) {
  const fmt = (v: number | null, digits = 1) => (v == null ? 'N/A' : v.toFixed(digits));
  return {
    n: members.length,
    weightChangePct: fmt(avgOf(members.map((m) => m.weightChangePct))),
    adherencePct: fmt(avgOf(members.map((m) => m.adherencePct)), 0),
    sleepHours: fmt(avgOf(members.map((m) => m.avgSleepHours))),
    steps: fmt(avgOf(members.map((m) => m.avgSteps)), 0),
    energy: fmt(avgOf(members.map((m) => m.avgEnergy))),
    stress: fmt(avgOf(members.map((m) => m.avgStress))),
    waterPct: fmt(avgOf(members.map((m) => m.waterAdherencePct)), 0),
    activitySessionsPerWeek: fmt(avgOf(members.map((m) => m.activitySessionsPerWeek))),
    mealsPerDay: fmt(avgOf(members.map((m) => m.mealsPerDay))),
    caloriePct: fmt(avgOf(members.map((m) => m.calorieAdherencePct)), 0),
    proteinPct: fmt(avgOf(members.map((m) => m.proteinAdherencePct)), 0),
    glp1Pct: ((members.filter((m) => m.onGlp1).length / members.length) * 100).toFixed(0),
  };
}

/** Só divulga um atributo categórico se ≥2 membros o compartilham (proteção extra). */
function sharedValues(members: MemberOutcome[], pick: (m: MemberOutcome) => string[]): string[] {
  const counts: Record<string, number> = {};
  members.forEach((m) => pick(m).forEach((v) => { if (v) counts[v] = (counts[v] || 0) + 1; }));
  return Object.entries(counts).filter(([, c]) => c >= 2).map(([v]) => v);
}

async function generateCaseForCohort(cohortKey: string, members: MemberOutcome[]) {
  const [goal, sex, band] = cohortKey.split('|');
  const success = members.filter((m) => m.outcome === 'success');
  const partial = members.filter((m) => m.outcome === 'partial');
  const failure = members.filter((m) => m.outcome === 'failure');

  const dominantOutcome =
    success.length > members.length / 2 ? 'success' :
    failure.length > members.length / 2 ? 'failure' : 'mixed';

  const sStats = groupStats(success.length ? success : members);
  const fStats = failure.length ? groupStats(failure) : null;

  const commonRestrictions = sharedValues(members, (m) => m.restrictions);
  const commonActivities = sharedValues(members, (m) => m.topActivityTypes);
  const commonDiets = sharedValues(members, (m) => (m.dietType ? [m.dietType] : []));

  const successStrategies = [...new Set(success.flatMap((m) => m.strategies))].slice(0, 10);
  const failureStrategies = [...new Set(failure.flatMap((m) => m.strategies))].slice(0, 10);

  const statLine = (label: string, s: ReturnType<typeof groupStats>) => `
${label} (n=${s.n}):
- Variação de peso: ${s.weightChangePct}% | Adesão ao registro: ${s.adherencePct}%
- Sono: ${s.sleepHours}h/noite | Passos: ${s.steps}/dia | Energia: ${s.energy}/10 | Estresse: ${s.stress}/10
- Hidratação: ${s.waterPct}% da meta | Atividade física: ${s.activitySessionsPerWeek} sessões/semana
- Refeições registradas: ${s.mealsPerDay}/dia | Calorias: ${s.caloriePct}% da meta | Proteína: ${s.proteinPct}% da meta
- Em uso de GLP-1: ${s.glp1Pct}%`;

  const prompt = `
Você é uma nutricionista clínica escrevendo um REGISTRO DE EXPERIÊNCIA EMPÍRICA para a base de conhecimento interna de uma agente de IA.

Escreva um padrão de caso clínico agregado e 100% anônimo, em português, com base EXCLUSIVAMENTE nos dados agregados abaixo. NUNCA invente nomes, datas, cidades ou detalhes individuais. Refira-se sempre ao grupo ("pacientes deste perfil"), nunca a indivíduos.

PERFIL DA COORTE:
- Objetivo: ${GOAL_LABELS[goal] || goal}
- Sexo: ${sex === 'male' ? 'masculino' : sex === 'female' ? 'feminino' : sex}
- Faixa etária: ${band}
- Tamanho da coorte: ${members.length} pacientes
- Desfechos: ${success.length} sucesso / ${partial.length} parcial / ${failure.length} insucesso
${commonDiets.length ? `- Padrões alimentares presentes: ${commonDiets.join(', ')}` : ''}
${commonRestrictions.length ? `- Restrições/alergias comuns no grupo: ${commonRestrictions.join(', ')}` : ''}
${commonActivities.length ? `- Atividades físicas comuns: ${commonActivities.join(', ')}` : ''}

${statLine(success.length ? 'GRUPO SUCESSO' : 'COORTE COMPLETA', sStats)}
${fStats ? statLine('GRUPO INSUCESSO', fStats) : ''}

ESTRATÉGIAS PRESENTES NOS PLANOS DO GRUPO SUCESSO:
${successStrategies.map((s) => `- ${s}`).join('\n') || '- (sem dados)'}

ESTRATÉGIAS PRESENTES NOS PLANOS DO GRUPO INSUCESSO:
${failureStrategies.map((s) => `- ${s}`).join('\n') || '- (sem dados)'}

FORMATO (máx. 300 palavras):
1. Perfil do grupo (1 frase)
2. O que os dados sugerem que diferenciou sucesso de insucesso (compare sono, atividade, adesão alimentar, hidratação quando os números divergirem)
3. Aprendizado prático para novos pacientes deste perfil (3-4 recomendações acionáveis)

Seja honesta sobre limitações: coorte pequena = padrões sugestivos, não conclusivos.
`;

  const summary = await generateText(prompt);
  const embedding = await embedText(
    `Caso empírico: ${GOAL_LABELS[goal] || goal}, sexo ${sex === 'male' ? 'masculino' : sex === 'female' ? 'feminino' : sex}, ${band} anos.\n${summary}`
  );

  const metrics = {
    cohort_size: members.length,
    success_count: success.length,
    partial_count: partial.length,
    failure_count: failure.length,
    success_stats: success.length ? groupStats(success) : null,
    failure_stats: failure.length ? groupStats(failure) : null,
    glp1_pct: Number(groupStats(members).glp1Pct),
  };

  // Regenerável: substitui o caso anterior da coorte
  await supabase.from('empirical_cases').delete().eq('cohort_key', cohortKey);
  const { error } = await supabase.from('empirical_cases').insert({
    cohort_key: cohortKey,
    cohort_size: members.length,
    outcome: dominantOutcome,
    summary,
    metrics,
    embedding,
  });
  if (error) throw error;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/** O gateway já validou a assinatura do JWT; aqui só exigimos papel service_role. */
function isServiceRole(token: string | undefined): boolean {
  if (!token) return false;
  if (token === SERVICE_KEY) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Só a service role dispara (cron do pg_cron ou npm run rag:casos)
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!isServiceRole(token)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const outcomes = await collectOutcomes();

    const cohorts: Record<string, MemberOutcome[]> = {};
    outcomes.forEach((o) => {
      (cohorts[o.cohortKey] = cohorts[o.cohortKey] || []).push(o);
    });

    const skipped: string[] = [];
    let generated = 0;
    const errors: string[] = [];

    for (const [key, members] of Object.entries(cohorts)) {
      if (members.length < MIN_COHORT_SIZE) {
        skipped.push(`${key} (${members.length}<k=${MIN_COHORT_SIZE})`);
        continue;
      }
      try {
        await generateCaseForCohort(key, members);
        generated++;
      } catch (err) {
        errors.push(`${key}: ${(err as Error).message}`);
      }
    }

    const result = { measurable_outcomes: outcomes.length, generated, skipped, errors };
    console.log('generate-empirical-cases:', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-empirical-cases error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
