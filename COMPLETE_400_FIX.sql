-- COMPLETE FIX FOR 400 BAD REQUEST ERRORS
-- Run this in Supabase SQL Editor to resolve all issues

-- 1. First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete questions for their quizzes" ON public.questions;
DROP POLICY IF EXISTS "Users can insert questions for their quizzes" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions for their quizzes" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions for their quizzes" ON public.questions;

-- 2. Ensure RLS is enabled
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 3. Add is_published column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Create comprehensive RLS policies for quizzes
CREATE POLICY "Users can insert own quizzes" ON public.quizzes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own quizzes" ON public.quizzes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON public.quizzes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON public.quizzes
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow public read access to published quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated USING (is_published = true);

-- 5. Create comprehensive RLS policies for questions
CREATE POLICY "Users can insert questions for their quizzes" ON public.questions
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can view questions for their quizzes" ON public.questions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND (public.quizzes.user_id = auth.uid() OR public.quizzes.is_published = true)
));

CREATE POLICY "Users can update questions for their quizzes" ON public.questions
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

CREATE POLICY "Users can delete questions for their quizzes" ON public.questions
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.user_id = auth.uid()
));

-- 6. Allow public access to questions for published quizzes
CREATE POLICY "Allow public read access to published questions" ON public.questions
FOR SELECT TO anon, authenticated USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE public.quizzes.id = public.questions.quiz_id 
  AND public.quizzes.is_published = true
));

-- 7. Drop and recreate get_public_quiz function
DROP FUNCTION IF EXISTS public.get_public_quiz(UUID);

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
  WHERE q.id = p_quiz_id AND q.is_published = true;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Quiz not found or not published';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- 9. Allow anonymous quiz attempts
DROP POLICY IF EXISTS "Allow anonymous quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Allow anonymous quiz attempts" ON public.quiz_attempts
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 10. Allow anonymous responses
DROP POLICY IF EXISTS "Allow anonymous responses" ON public.responses;
CREATE POLICY "Allow anonymous responses" ON public.responses
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Complete 400 error fix applied! All RLS policies and functions recreated.';
  RAISE NOTICE 'Your app should now work without 400 Bad Request errors.';
END $$;
