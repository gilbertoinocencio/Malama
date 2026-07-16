-- ============================================
-- Malama — Empirical Cases Migration
-- ============================================
-- Second RAG memory for the nutritionist agent: anonymized, aggregated
-- case patterns learned from real user outcomes (success/failure).
-- Kept STRICTLY separate from nutrition_guidelines (curated theory).
--
-- Privacy model:
--   * Rows are generated ONLY by scripts/generate-empirical-cases.js
--     (service role), never by clients.
--   * Each row summarizes a COHORT of >= 3 users (k-anonymity),
--     built exclusively from structured fields (no user free text).
--   * No user_id, names, dates of birth or any direct identifier.
--
-- Run manually in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS empirical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_key TEXT NOT NULL,          -- e.g. 'aesthetic|female|30-39'
    cohort_size INT NOT NULL,          -- number of users aggregated (>= 3)
    outcome TEXT NOT NULL,             -- 'success' | 'partial' | 'failure' | 'mixed'
    summary TEXT NOT NULL,             -- anonymized empirical case pattern (LLM-generated)
    metrics JSONB,                     -- aggregated stats: avg weight change %, adherence, etc.
    embedding vector(768),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS empirical_cases_embedding_idx
    ON empirical_cases
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_empirical_cases_cohort_key
    ON empirical_cases(cohort_key);

COMMENT ON TABLE empirical_cases IS
    'Anonymized aggregated case patterns (k>=3 users) for the agent''s empirical memory. Separate from nutrition_guidelines (theory).';

-- RLS: authenticated users can read (the agent runs client-side);
-- only the service role can write (the generator script).
ALTER TABLE empirical_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empirical_cases_read_authenticated" ON empirical_cases;
CREATE POLICY "empirical_cases_read_authenticated"
    ON empirical_cases FOR SELECT
    TO authenticated
    USING (true);

-- Similarity search over empirical cases
CREATE OR REPLACE FUNCTION match_empirical_cases (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  cohort_key text,
  cohort_size int,
  outcome text,
  summary text,
  metrics jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    empirical_cases.id,
    empirical_cases.cohort_key,
    empirical_cases.cohort_size,
    empirical_cases.outcome,
    empirical_cases.summary,
    empirical_cases.metrics,
    1 - (empirical_cases.embedding <=> query_embedding) AS similarity
  FROM empirical_cases
  WHERE 1 - (empirical_cases.embedding <=> query_embedding) > match_threshold
  ORDER BY empirical_cases.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Empirical cases migration completed.';
END $$;
