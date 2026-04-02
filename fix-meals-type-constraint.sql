-- =====================================================
-- Migration: Fix meals table type constraint
-- Issue: Adding 'ai-barcode' and 'meal' as valid types
-- Date: 2026-04-02
-- =====================================================

-- Drop the old constraint
ALTER TABLE meals
DROP CONSTRAINT IF EXISTS meals_type_check;

-- Add new constraint with all valid types
ALTER TABLE meals
ADD CONSTRAINT meals_type_check 
CHECK (type IN (
  'manual', 
  'ai-chat', 
  'ai-photo', 
  'ai-voice', 
  'ai-barcode',  -- Added for barcode scanner
  'meal',        -- Generic meal type
  'visual'       -- Photo-based meals
));

-- Verify the constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'meals'::regclass 
AND contype = 'c';
