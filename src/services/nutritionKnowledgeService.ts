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

/**
 * Retrieves curated scientific guidelines (Curadoria/) relevant to a query,
 * via vector similarity search against nutrition_guidelines (populated by
 * scripts/sync-curadoria.js).
 */
export const NutritionKnowledgeService = {
  async search(
    query: string,
    matchCount = 5,
    matchThreshold = 0.65
  ): Promise<GuidelineMatch[]> {
    try {
      const model = new GeminiProxy().getGenerativeModel({ model: EMBEDDING_MODEL });
      const { embedding } = await model.embedContent(query);

      const { data, error } = await supabase.rpc('match_guidelines', {
        query_embedding: embedding.values,
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

  /** Formats matches as a prompt-ready block; empty string if nothing found. */
  formatAsContextBlock(matches: GuidelineMatch[]): string {
    if (matches.length === 0) return '';

    const entries = matches
      .map((m) => `[${m.category} — ${m.title}]\n${m.content}`)
      .join('\n\n');

    return `
**BASE CIENTÍFICA CURADA (use como referência, cite implicitamente ao fundamentar recomendações):**
${entries}
`;
  },
};
