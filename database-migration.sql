-- Quizify Database Migration
-- Run this ONLY if you already have an old database schema and need to update it
-- If you're setting up for the first time, use database-setup.sql instead

-- WARNING: This will drop existing tables and recreate them
-- Make sure to backup any important data before running this!

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.questions CASCADE;

-- Add missing columns to quizzes table if they don't exist
DO $$ 
BEGIN
  -- Add questions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'questions'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN questions JSONB NOT NULL DEFAULT '[]';
  END IF;

  -- Add settings column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';
  END IF;

  -- Remove old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'time_limit'
  ) THEN
    ALTER TABLE public.quizzes DROP COLUMN time_limit;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'shuffle_questions'
  ) THEN
    ALTER TABLE public.quizzes DROP COLUMN shuffle_questions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'show_correct_answers'
  ) THEN
    ALTER TABLE public.quizzes DROP COLUMN show_correct_answers;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.quizzes DROP COLUMN is_published;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'share_link'
  ) THEN
    ALTER TABLE public.quizzes DROP COLUMN share_link;
  END IF;
END $$;

-- Update quiz_attempts table schema if needed
DO $$ 
BEGIN
  -- Remove old columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'total_points'
  ) THEN
    ALTER TABLE public.quiz_attempts DROP COLUMN total_points;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'time_taken'
  ) THEN
    ALTER TABLE public.quiz_attempts DROP COLUMN time_taken;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.quiz_attempts DROP COLUMN completed_at;
  END IF;

  -- Add new columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN correct_answers INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'passed'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN passed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'time_spent'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN time_spent INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_quizzes_share_link;
DROP INDEX IF EXISTS idx_questions_quiz_id;
DROP INDEX IF EXISTS idx_questions_user_id;

-- Remove old triggers
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully! Refresh your application.';
END $$;
