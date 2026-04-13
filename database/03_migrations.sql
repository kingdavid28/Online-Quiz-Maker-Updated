-- =====================================================
-- Online Quiz Maker - Database Migrations & Fixes
-- =====================================================
-- This file contains all migration scripts and fixes
-- Run this when updating schema or fixing issues

-- =====================================================
-- Migration: Fix Question Bank Column Names
-- =====================================================

-- Migration 20240327: Fix question_bank table structure
-- This fixes issues with column name mismatches

-- Drop and recreate question_bank with correct structure
DROP TABLE IF EXISTS question_bank CASCADE;

CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  tags TEXT[],
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX idx_question_bank_user_id ON question_bank(user_id);
CREATE INDEX idx_question_bank_type ON question_bank(question_type);
CREATE INDEX idx_question_bank_category ON question_bank(category);
CREATE INDEX idx_question_bank_created_at ON question_bank(created_at DESC);

-- Recreate RLS policies
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question bank" ON question_bank FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question bank" ON question_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own question bank" ON question_bank FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own question bank" ON question_bank FOR DELETE USING (auth.uid() = user_id);

-- Recreate trigger
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Migration: Add Share Token Support
-- =====================================================

-- Add share token column to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for share token
CREATE INDEX IF NOT EXISTS idx_quizzes_share_token ON quizzes(share_token);

-- Update RLS policies for public quizzes
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
CREATE POLICY "Users can view own quizzes" ON quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public quizzes" ON quizzes FOR SELECT USING (is_public = true);

-- =====================================================
-- Migration: Add Question Explanations
-- =====================================================

-- Add explanation column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- =====================================================
-- Migration: Add Difficulty and Category to Question Bank
-- =====================================================

-- Add missing columns to question_bank if they don't exist
DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_bank' AND column_name = 'category') THEN
    ALTER TABLE question_bank ADD COLUMN category TEXT;
  END IF;
  
  -- Add difficulty column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_bank' AND column_name = 'difficulty') THEN
    ALTER TABLE question_bank ADD COLUMN difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
  
  -- Add tags column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_bank' AND column_name = 'tags') THEN
    ALTER TABLE question_bank ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- =====================================================
-- Migration: Add Quiz Attempt Timing
-- =====================================================

-- Add started_at column to quiz_attempts for better timing analytics
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- Fix: Update Question Type Constraints
-- =====================================================

-- Ensure all question_type check constraints use underscores
-- This fixes issues with hyphenated vs underscored type names

-- Drop and recreate check constraint for question_bank
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_question_type_check;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_question_type_check 
  CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer'));

-- Drop and recreate check constraint for questions
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check 
  CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer'));

-- =====================================================
-- Fix: Update RPC Functions for New Schema
-- =====================================================

-- Update insert_question_direct function to use correct table structure
DROP FUNCTION IF EXISTS insert_question_direct(UUID, TEXT, TEXT, JSONB, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION insert_question_direct(
  p_user_id UUID,
  p_type TEXT,
  p_question TEXT,
  p_options JSONB,
  p_correct_answer TEXT,
  p_points INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  question_type TEXT,
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO question_bank (
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points
  ) VALUES (
    p_user_id,
    p_type,
    p_question,
    p_options,
    p_correct_answer,
    p_points
  ) RETURNING 
    id,
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points,
    created_at;
END;
$$;

-- =====================================================
-- Fix: Update Quiz Settings Default
-- =====================================================

-- Update default quiz settings to include all required fields
ALTER TABLE quizzes ALTER COLUMN settings SET DEFAULT '{
  "timeLimit": null,
  "shuffleQuestions": false,
  "shuffleAnswers": false,
  "showResults": true,
  "passingScore": 70
}'::jsonb;

-- Update existing quizzes with missing settings
UPDATE quizzes 
SET settings = settings || '{
  "shuffleQuestions": false,
  "shuffleAnswers": false,
  "showResults": true,
  "passingScore": 70
}'::jsonb
WHERE settings IS NULL OR NOT settings ? 'passingScore';

-- =====================================================
-- Fix: Add Missing Indexes for Performance
-- =====================================================

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_email ON quiz_attempts(user_email);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at DESC);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quizzes_user_created ON quizzes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_bank_user_type ON question_bank(user_id, question_type);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_completed ON quiz_attempts(quiz_id, completed_at DESC);

-- =====================================================
-- Fix: Update RLS Policies for Better Security
-- =====================================================

-- Drop existing policies to recreate with better security
DROP POLICY IF EXISTS "Users can view quiz questions" ON questions;
DROP POLICY IF EXISTS "Users can manage quiz questions" ON questions;

-- Recreate with more specific permissions
CREATE POLICY "Users can view own quiz questions" ON questions FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id)
);

CREATE POLICY "Users can insert own quiz questions" ON questions FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id)
);

CREATE POLICY "Users can update own quiz questions" ON questions FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id)
);

CREATE POLICY "Users can delete own quiz questions" ON questions FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id)
);

-- =====================================================
-- Fix: Add Validation Functions
-- =====================================================

-- Function to validate question data
CREATE OR REPLACE FUNCTION validate_question_data(
  p_type TEXT,
  p_question TEXT,
  p_options JSONB,
  p_correct_answer TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN := TRUE;
BEGIN
  -- Validate question type
  IF p_type NOT IN ('multiple_choice', 'true_false', 'short_answer') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate question text
  IF p_question IS NULL OR TRIM(p_question) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate based on question type
  IF p_type = 'multiple_choice' THEN
    IF p_options IS NULL OR jsonb_array_length(p_options) < 2 THEN
      RETURN FALSE;
    END IF;
    
    IF p_correct_answer IS NULL OR 
       TRY_CAST(p_correct_answer AS INTEGER) IS NULL OR
       TRY_CAST(p_correct_answer AS INTEGER) < 0 OR
       TRY_CAST(p_correct_answer AS INTEGER) >= jsonb_array_length(p_options) THEN
      RETURN FALSE;
    END IF;
  ELSIF p_type = 'true_false' THEN
    IF p_correct_answer NOT IN ('true', 'false') THEN
      RETURN FALSE;
    END IF;
  ELSIF p_type = 'short_answer' THEN
    IF p_correct_answer IS NULL OR TRIM(p_correct_answer) = '' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN v_valid;
END;
$$;

-- =====================================================
-- Fix: Add Data Cleanup Functions
-- =====================================================

-- Function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
  cleaned_questions BIGINT,
  cleaned_attempts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned_questions BIGINT := 0;
  v_cleaned_attempts BIGINT := 0;
BEGIN
  -- Clean up questions without valid quizzes
  DELETE FROM questions 
  WHERE quiz_id NOT IN (SELECT id FROM quizzes);
  GET DIAGNOSTICS v_cleaned_questions = ROW_COUNT;
  
  -- Clean up quiz attempts without valid quizzes
  DELETE FROM quiz_attempts 
  WHERE quiz_id NOT IN (SELECT id FROM quizzes);
  GET DIAGNOSTICS v_cleaned_attempts = ROW_COUNT;
  
  RETURN QUERY
  SELECT v_cleaned_questions, v_cleaned_attempts;
END;
$$;

-- =====================================================
-- Migration Verification
-- =====================================================

-- Verify all migrations completed successfully
SELECT 
  'Migration Verification' as status,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY table_name, ordinal_position;

-- Verify indexes were created
SELECT 
  'Index Verification' as status,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
  'RLS Policy Verification' as status,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename, policyname;

-- =====================================================
-- Migration Complete
-- =====================================================

-- All migrations and fixes have been applied!
-- Database schema is now up to date and optimized
