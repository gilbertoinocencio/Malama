import { supabase } from './supabase';
import { GeminiProxy } from '../lib/geminiProxy';

const EMBEDDING_MODEL = 'gemini-embedding-001';

export interface GuidelineMatch {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

export interface EmpiricalCaseMatch {
  id: string;
  cohort_key: string;
  cohort_size: number;
  outcome: string;
  summary: string;
  metrics: Record<string, unknown> | null;
  similarity: number;
}

async function embedQuery(query: string): Promise<number[]> {
  const model = new GeminiProxy().getGenerativeModel({ model: EMBEDDING_MODEL });
  const { embedding } = await model.embedContent(query);
  return embedding.values;
}

/**
 * The agent's two knowledge memories, kept strictly separate:
 *  - Theory:   nutrition_guidelines — curated science from Curadoria/
 *              (scripts/sync-curadoria.js)
 *  - Practice: empirical_cases — anonymized, aggregated outcome patterns
 *              from real users (scripts/generate-empirical-cases.js)
 */
export const NutritionKnowledgeService = {
  async search(
    query: string,
    matchCount = 5,
    matchThreshold = 0.65
  ): Promise<GuidelineMatch[]> {
    try {
      const { data, error } = await supabase.rpc('match_guidelines', {
        query_embedding: await embedQuery(query),
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

      if (error) {
        console.error('match_guidelines error:', error.message);
        return [];
      }

      return (data as GuidelineMatch[]) || [];
    } catch (err) {
      console.error('NutritionKnowledgeService.search failed:', err);
      return [];
    }
  },

  async searchEmpiricalCases(
    query: string,
    matchCount = 3,
    matchThreshold = 0.65
  ): Promise<EmpiricalCaseMatch[]> {
    try {
      const { data, error } = await supabase.rpc('match_empirical_cases', {
        query_embedding: await embedQuery(query),
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

      if (error) {
        console.error('match_empirical_cases error:', error.message);
        return [];
      }

      return (data as EmpiricalCaseMatch[]) || [];
    } catch (err) {
      console.error('NutritionKnowledgeService.searchEmpiricalCases failed:', err);
      return [];
    }
  },

  /** Formats guideline matches as a prompt-ready block; empty string if nothing found. */
  formatAsContextBlock(matches: GuidelineMatch[]): string {
    if (matches.length === 0) return '';

    const entries = matches
      .map((m) => `[${m.category} — ${m.title}]\n${m.content}`)
      .join('\n\n');

    return `
**BASE CIENTÍFICA CURADA (teoria — use como referência, cite implicitamente ao fundamentar recomendações):**
${entries}
`;
  },

  /** Formats empirical case matches as a prompt-ready block; empty string if nothing found. */
  formatEmpiricalBlock(matches: EmpiricalCaseMatch[]): string {
    if (matches.length === 0) return '';

    const entries = matches
      .map((m) => `[Experiência com ${m.cohort_size} pacientes de perfil semelhante — desfecho predominante: ${m.outcome}]\n${m.summary}`)
      .join('\n\n');

    return `
**EXPERIÊNCIA CLÍNICA ACUMULADA (empírica — padrões anônimos e agregados de pacientes reais da plataforma):**
${entries}

Como usar: trate como a experiência prática de uma profissional experiente — ajuste estratégias e expectativas com base nesses padrões, mas em caso de conflito com a base científica curada, a ciência prevalece.
`;
  },
};
