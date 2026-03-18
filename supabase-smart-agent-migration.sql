-- ============================================
-- NURA Smart Agent Migration
-- ============================================
-- Adds tables for RAG (Nutrition Guidelines) and Historical Summaries

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Table for storing curated nutrition guidelines from specialists
CREATE TABLE IF NOT EXISTS nutrition_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT, -- e.g., 'Dieta', 'Suplementação', 'Casos Clínicos'
    source_file TEXT, -- Name of the file inside the Curadoria folder
    embedding vector(768), -- Standard size for Google Gemini text-embedding-004
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS nutrition_guidelines_embedding_idx 
    ON nutrition_guidelines 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Table for storing historical 3-month summaries of the user's progress
CREATE TABLE IF NOT EXISTS historical_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    summary TEXT NOT NULL, -- The dense LLM-generated summary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for performance querying per user
CREATE INDEX IF NOT EXISTS idx_historical_summaries_user_id 
    ON historical_summaries(user_id);

-- Add comments for documentation
COMMENT ON TABLE nutrition_guidelines IS 'Stores curated guidelines from nutrition specialists for RAG.';
COMMENT ON COLUMN nutrition_guidelines.embedding IS 'Vectorized representation of the content for similarity search.';
COMMENT ON TABLE historical_summaries IS 'Stores dense summaries of past meal plans for the agent''s long-term memory.';

-- Create a function to search for guidelines
CREATE OR REPLACE FUNCTION match_guidelines (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nutrition_guidelines.id,
    nutrition_guidelines.title,
    nutrition_guidelines.content,
    nutrition_guidelines.category,
    1 - (nutrition_guidelines.embedding <=> query_embedding) AS similarity
  FROM nutrition_guidelines
  WHERE 1 - (nutrition_guidelines.embedding <=> query_embedding) > match_threshold
  ORDER BY nutrition_guidelines.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Smart Agent migration completed successfully!';
  RAISE NOTICE '📊 Created nutrition_guidelines and historical_summaries tables.';
END $$;
