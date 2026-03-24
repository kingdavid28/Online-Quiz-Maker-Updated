-- SECURE DATABASE FIX - Only expose published quizzes publicly
-- Run this in Supabase SQL Editor for better security

-- 1. Update public policies to only expose published content
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
CREATE POLICY "Allow public read access to published quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to published questions" ON public.questions
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = questions.quiz_id 
  AND quizzes.is_published = true
));

-- 2. Add is_published column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Update get_public_quiz function to only return published quizzes
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- 5. Allow authenticated users to publish their own quizzes
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
CREATE POLICY "Users can update own quizzes" ON public.quizzes
FOR UPDATE USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Secure database fix applied! Only published quizzes are now publicly accessible.';
END $$;
