import { supabase } from '../services/supabase';

export async function generateConsultationBriefing(patientId: string): Promise<string> {
  // 1. Fetch patient profile
  const { data: patient } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patient) throw new Error('Paciente não encontrado');

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
    .select('calories, protein, created_at')
    .eq('user_id', patientId)
    .gte('created_at', since28.toISOString());

  const totalDays = 28;
  const loggedDays = new Set((mealLogs || []).map((m: any) => m.created_at?.split('T')[0])).size;
  const adherencePercent = Math.round((loggedDays / totalDays) * 100);

  const totalCal = (mealLogs || []).reduce((s: number, m: any) => s + (m.calories || 0), 0);
  const totalProt = (mealLogs || []).reduce((s: number, m: any) => s + (m.protein || 0), 0);
  const avgCalories = loggedDays > 0 ? Math.round(totalCal / loggedDays) : 0;
  const avgProtein = loggedDays > 0 ? Math.round(totalProt / loggedDays) : 0;

  // 4. GLP-1 symptoms (last 4 check-ins)
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

  const context = `
Paciente: ${patient.display_name || 'Paciente'}, ${patient.age || '—'} anos, ${patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : '—'}
IMC: ${bmi} | Peso: ${patient.weight || '—'}kg | Altura: ${patient.height || '—'}cm
GLP-1: ${patient.glp1_medication || 'Não usa'} — Fase: ${phaseMap[patient.glp1_phase] || 'N/A'}

Evolução de peso (90 dias): ${weightStart}kg → ${weightCurrent}kg (${weightDiff > 0 ? '+' : ''}${weightDiff}kg)

Nutrição (média 28 dias):
- Calorias: ${avgCalories}kcal/dia (meta: ${patient.target_calories || '—'}kcal)
- Proteína: ${avgProtein}g/dia (meta: ${patient.target_protein || '—'}g)
- Adesão ao plano: ${adherencePercent}% dos dias

Sintomas frequentes GLP-1: ${topSymptoms.length > 0 ? topSymptoms.join(', ') : 'Nenhum relatado'}
Principal preocupação: ${concernMap[patient.glp1_main_concern] || 'N/A'}
  `.trim();

  // 6. Call Claude API
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    // Fallback: return a structured template without API
    return buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `Você é um assistente médico especializado em nutrição e emagrecimento.
Gere um briefing pré-consulta objetivo e clinicamente relevante.
Use português brasileiro. Seja direto e prático.
Formato: seções com emojis, máximo 300 palavras.
Inclua: progresso, pontos de atenção, sugestões para a consulta.`,
      messages: [
        {
          role: 'user',
          content: `Gere um briefing pré-consulta para o seguinte paciente:\n\n${context}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn('[Briefing] Claude API error, using fallback');
    return buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms);
  }

  const data = await response.json();
  return data.content?.[0]?.text || buildFallbackBriefing(context, patient, weightDiff, adherencePercent, topSymptoms);
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

👤 **Paciente:** ${patient.display_name || 'Paciente'}, ${patient.age || '—'} anos
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
