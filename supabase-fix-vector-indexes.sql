-- ============================================
-- Malama — Fix vector indexes (ivfflat → HNSW)
-- ============================================
-- Both RAG tables had ivfflat indexes created while empty. ivfflat trains
-- its clusters at creation time, so an index built on an empty table has
-- degenerate clusters and can silently miss rows as data grows.
-- HNSW builds incrementally and needs no training data.
--
-- Run manually in the Supabase SQL Editor.

DROP INDEX IF EXISTS nutrition_guidelines_embedding_idx;
CREATE INDEX nutrition_guidelines_embedding_idx
    ON nutrition_guidelines
    USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS empirical_cases_embedding_idx;
CREATE INDEX empirical_cases_embedding_idx
    ON empirical_cases
    USING hnsw (embedding vector_cosine_ops);

DO $$
BEGIN
  RAISE NOTICE 'Vector indexes rebuilt as HNSW.';
END $$;
