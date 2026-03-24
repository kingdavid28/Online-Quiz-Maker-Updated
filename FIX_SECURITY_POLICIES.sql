-- FIX SECURITY POLICIES - Remove overly permissive public access
-- Run this in Supabase SQL Editor to secure your database

-- 1. Remove overly permissive public policies
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;

-- 2. Keep only the appropriate user-specific policies
-- These should already exist and are correctly configured:

-- For quizzes:
-- "Users can view their own quizzes" (auth.uid() = user_id) ✅
-- "Users can view published quizzes" (is_published = true) ✅  
-- "Users can insert/update/delete their own quizzes" ✅

-- For questions:
-- "Users can view questions for their quizzes" (owner OR published) ✅
-- "Users can insert/update/delete questions for their quizzes" ✅

-- 3. Add is_published column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Update get_public_quiz function to respect published status
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

-- 5. Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Security policies fixed! Now only published quizzes are publicly accessible.';
  RAISE NOTICE 'Users can still access their own unpublished quizzes.';
END $$;
