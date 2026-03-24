-- QUICK DATABASE FIX FOR QUIZIFY
-- Run this in Supabase SQL Editor to fix immediate issues

-- 1. Fix the most critical issue: get_public_quiz function for share links
DROP FUNCTION IF EXISTS public.get_public_quiz(p_quiz_id UUID);

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

-- 2. Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- 3. Enable public access for quizzes (fixes 404 errors)
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
CREATE POLICY "Allow public read access to quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated USING (true);

-- 4. Enable public access for questions
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions" ON public.questions
FOR SELECT TO anon, authenticated USING (true);

-- 5. Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quizzes' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'questions' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Quick database fix applied! Share links should now work.';
END $$;
