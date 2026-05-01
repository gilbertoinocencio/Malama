// =====================================================
// NURA — Edge Function: generate-patient-ai-report
// Gera relatório clínico de IA com Claude para o médico
// POST { patient_id, doctor_id }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!;
const CLAUDE_MODEL     = 'claude-sonnet-4-6';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Auth guard ──────────────────────────────────────
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

// ─── Collect patient data ────────────────────────────
async function collectPatientData(patientId: string, doctorId: string) {
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [profileRes, mealsRes, checkinsRes, consultRes, noteRes, activitiesRes] = await Promise.all([
    supabase.from('profiles').select(
      'display_name, age, gender, weight, height, goal, glp1_mode, glp1_medication, glp1_phase, target_calories, target_protein, target_carbs, target_fats'
    ).eq('id', patientId).single(),

    supabase.from('meals').select('created_at, calories, protein, carbs, fats')
      .eq('user_id', patientId)
      .gte('created_at', since30d)
      .order('created_at', { ascending: false }),

    supabase.from('daily_checkins').select('checkin_date, symptoms, mood, energy_level')
      .eq('user_id', patientId)
      .order('checkin_date', { ascending: false })
      .limit(14),

    supabase.from('consultations').select('scheduled_at, status, type, notes')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: false })
      .limit(5),

    supabase.from('clinical_notes').select('diagnosis, plan, weight_kg, bmi, finalized_at, is_draft')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('is_draft', false)
      .order('finalized_at', { ascending: false })
      .limit(3),

    supabase.from('activities').select('activity_type, calories_burned, duration_seconds, activity_date')
      .eq('user_id', patientId)
      .gte('activity_date', since30d)
      .order('activity_date', { ascending: false }),
  ]);

  return {
    profile:       profileRes.data,
    meals:         mealsRes.data ?? [],
    checkins:      checkinsRes.data ?? [],
    consultations: consultRes.data ?? [],
    clinicalNotes: noteRes.data ?? [],
    activities:    activitiesRes.data ?? [],
  };
}

// ─── Build prompt ────────────────────────────────────
function buildPrompt(data: Awaited<ReturnType<typeof collectPatientData>>, doctorName: string): string {
  const { profile, meals, checkins, consultations, clinicalNotes, activities } = data;

  // Compute adherence
  const dayCount = new Set(meals.map(m => m.created_at?.split('T')[0])).size;
  const avgCal   = meals.length > 0 ? Math.round(meals.reduce((s, m) => s + (m.calories ?? 0), 0) / dayCount) : 0;
  const avgProt  = meals.length > 0 ? Math.round(meals.reduce((s, m) => s + (m.protein  ?? 0), 0) / dayCount) : 0;

  const symptomFreq: Record<string, number> = {};
  checkins.forEach(c => {
    const s = Array.isArray(c.symptoms) ? c.symptoms : [];
    s.forEach((sym: string) => { symptomFreq[sym] = (symptomFreq[sym] ?? 0) + 1; });
  });
  const topSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `Você é um assistente clínico de alto nível para o Dr(a). ${doctorName}.
Sua tarefa é gerar um relatório clínico estruturado e objetivo sobre o paciente abaixo,
baseado estritamente nos dados fornecidos. Não invente informações.

## Dados do Paciente
Nome: ${profile?.display_name ?? 'N/A'}
Idade: ${profile?.age ?? 'N/A'} anos | Gênero: ${profile?.gender ?? 'N/A'}
Peso: ${profile?.weight ?? 'N/A'} kg | Altura: ${profile?.height ?? 'N/A'} cm
Objetivo: ${profile?.goal ?? 'N/A'}
GLP-1: ${profile?.glp1_mode ? `${profile.glp1_medication ?? 'ativo'} — Fase: ${profile.glp1_phase ?? 'N/A'}` : 'Não usa'}

## Metas Nutricionais
Calorias: ${profile?.target_calories} kcal | Proteína: ${profile?.target_protein}g | Carboidratos: ${profile?.target_carbs}g | Gorduras: ${profile?.target_fats}g

## Adesão (últimos 30 dias)
Dias com registro: ${dayCount}/30 (${Math.round((dayCount / 30) * 100)}%)
Média calórica diária: ${avgCal} kcal
Média proteica diária: ${avgProt} g

## Sintomas Relatados (check-ins)
${topSymptoms.length > 0
  ? topSymptoms.map(([s, n]) => `- ${s.replace(/_/g, ' ')}: ${n}x`).join('\n')
  : '- Nenhum sintoma registrado'}

## Histórico de Consultas (últimas 5)
${consultations.length > 0
  ? consultations.map(c =>
      `- ${new Date(c.scheduled_at).toLocaleDateString('pt-BR')} — ${c.type} — ${c.status}${c.notes ? ': ' + c.notes : ''}`
    ).join('\n')
  : '- Sem consultas anteriores'}

## Prontuários Clínicos (últimos 3)
${clinicalNotes.length > 0
  ? clinicalNotes.map(n =>
      `- ${new Date(n.finalized_at!).toLocaleDateString('pt-BR')} | Diagnóstico: ${n.diagnosis ?? 'N/A'} | Plano: ${n.plan ?? 'N/A'} | Peso: ${n.weight_kg ?? 'N/A'} kg | IMC: ${n.bmi ?? 'N/A'}`
    ).join('\n')
  : '- Sem prontuários'}

## Atividade Física (últimos 30 dias)
Total de atividades: ${activities.length}
Dias ativos: ${new Set(activities.map(a => a.activity_date.split('T')[0])).size}/30
Calorias totais queimadas: ${activities.reduce((s: number, a: { calories_burned: number }) => s + (a.calories_burned ?? 0), 0)} kcal
Duração total: ${Math.round(activities.reduce((s: number, a: { duration_seconds: number }) => s + (a.duration_seconds ?? 0), 0) / 60)} minutos
${activities.length > 0
  ? activities.slice(0, 5).map(a =>
      `- ${new Date(a.activity_date).toLocaleDateString('pt-BR')}: ${a.activity_type} — ${Math.round((a.duration_seconds ?? 0) / 60)}min, ${a.calories_burned ?? 0} kcal`
    ).join('\n')
  : '- Nenhuma atividade registrada'}

## Estrutura do Relatório

Gere o relatório em português brasileiro com as seguintes seções:

### 1. Resumo Executivo (3-4 linhas)
Síntese clínica objetiva para uso em consulta.

### 2. Adesão e Comportamento
Analise os dados de adesão, padrão alimentar e tendências.

### 3. Sintomas e Bem-Estar
Interprete os sintomas recorrentes à luz do histórico clínico.

### 4. Evolução Clínica
Compare prontuários anteriores e identifique tendências de peso, IMC e resposta terapêutica.

### 5. Alertas Prioritários
Liste em bullet points os pontos que precisam de atenção imediata na próxima consulta.

### 6. Sugestões de Conduta
3-5 sugestões objetivas baseadas nos dados. Não faça diagnósticos definitivos.

Seja conciso, preciso e clínico. Evite linguagem excessivamente técnica mas mantenha rigor científico.`;
}

// ─── Main handler ────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // 1. Verificar médico autenticado
    const doctor = await getAuthDoctor(req);
    if (!doctor) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parsear body
    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Coletar dados do paciente
    const data = await collectPatientData(patient_id, doctor.id);
    if (!data.profile) {
      return new Response(JSON.stringify({ error: 'Paciente não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Chamar Claude API
    const prompt = buildPrompt(data, doctor.name);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Claude API error:', err);
      return new Response(JSON.stringify({ error: 'Erro na API de IA' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const claudeData = await anthropicRes.json();
    const report     = claudeData.content?.[0]?.text ?? '';

    // 5. Persistir relatório (opcional — tabela ai_reports não criada ainda, retornar texto)
    // Futura expansão: salvar em public.ai_reports com patient_id, doctor_id, content, created_at

    // 6. Notificar médico que o relatório foi gerado
    await supabase.rpc('notify_doctor', {
      p_doctor_id:  doctor.id,
      p_patient_id: patient_id,
      p_type:       'ai_alert',
      p_title:      'Relatório de IA gerado',
      p_body:       `Análise clínica de ${data.profile.display_name ?? 'paciente'} disponível.`,
      p_data:       { patient_id },
    });

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('generate-patient-ai-report error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
