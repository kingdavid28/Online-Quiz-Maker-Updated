-- Quick fix for Quizify database
-- This will add the missing columns and reload the schema

-- Step 1: Add missing columns to quizzes table
ALTER TABLE public.quizzes 
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- Step 2: Verify columns exist
DO $$
DECLARE
  has_questions BOOLEAN;
  has_settings BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'questions'
  ) INTO has_questions;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'settings'
  ) INTO has_settings;

  IF has_questions AND has_settings THEN
    RAISE NOTICE 'SUCCESS: Both questions and settings columns exist!';
  ELSE
    RAISE EXCEPTION 'ERROR: Columns were not created properly';
  END IF;
END $$;

-- Step 3: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
