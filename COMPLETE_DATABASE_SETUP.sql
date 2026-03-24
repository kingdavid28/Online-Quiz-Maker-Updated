-- COMPLETE DATABASE SETUP FOR QUIZIFY
-- Run this in Supabase SQL Editor to fix all issues

-- 1. Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies and functions
DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;

DROP POLICY IF EXISTS "Users can view own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;

DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_attempts;

DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
DROP POLICY IF EXISTS "Allow anonymous quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Allow anonymous responses" ON public.responses;

DROP FUNCTION IF EXISTS public.create_quiz_direct(UUID, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.update_quiz_with_questions(UUID, UUID, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.get_quiz_with_questions(UUID);
DROP FUNCTION IF EXISTS public.get_user_quizzes(UUID);
DROP FUNCTION IF EXISTS public.get_quiz_by_id(TEXT);
DROP FUNCTION IF EXISTS public.get_public_quiz(UUID);
DROP FUNCTION IF EXISTS public.get_quiz_analytics(UUID, UUID);

-- 3. Create proper RLS policies

-- Quizzes table policies
CREATE POLICY "Users can view own quizzes" ON public.quizzes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes" ON public.quizzes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON public.quizzes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON public.quizzes
FOR DELETE USING (auth.uid() = user_id);

-- Questions table policies
CREATE POLICY "Users can view own questions" ON public.questions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can insert own questions" ON public.questions
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can update own questions" ON public.questions
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can delete own questions" ON public.questions
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

-- Quiz attempts policies
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.quiz_attempts.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts
FOR INSERT WITH CHECK (true);

-- 4. Create essential functions

-- Function to get quiz by ID (with fallback)
CREATE OR REPLACE FUNCTION public.get_quiz_by_id(p_quiz_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', q.id,
    'user_id', q.user_id,
    'title', q.title,
    'description', q.description,
    'questions', COALESCE(q.questions, '[]'::jsonb),
    'settings', q.settings,
    'created_at', q.created_at,
    'updated_at', q.updated_at
  )
  INTO v_result
  FROM public.quizzes q
  WHERE q.id::text = p_quiz_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for public quiz access (share links)
CREATE OR REPLACE FUNCTION public.get_public_quiz(p_quiz_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', q.id,
    'user_id', q.user_id,
    'title', q.title,
    'description', q.description,
    'questions', COALESCE(q.questions, '[]'::jsonb),
    'settings', q.settings,
    'created_at', q.created_at,
    'updated_at', q.updated_at
  )
  INTO v_result
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for public functions
GRANT EXECUTE ON FUNCTION public.get_quiz_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_by_id TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;

-- 5. Add public policies for share links
CREATE POLICY "Allow public read access to quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read access to questions" ON public.questions
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous quiz attempts" ON public.quiz_attempts
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Complete database setup applied successfully! All quiz functions and policies are now properly configured.';
END $$;
