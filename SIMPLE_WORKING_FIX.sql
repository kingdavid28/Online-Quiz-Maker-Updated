-- SIMPLE WORKING DATABASE FIX
-- Basic fix without complex logic

-- 1. Create get_public_quiz function (most important)
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

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions for function
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

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

-- 4. Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 5. Create basic INSERT policy for quizzes
CREATE POLICY "Users can insert quizzes" ON public.quizzes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Create basic SELECT policies
CREATE POLICY "Users can view own quizzes" ON public.quizzes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public can view published quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated USING (is_published = true);

-- 7. Allow anonymous quiz attempts
CREATE POLICY "Allow anonymous quiz attempts" ON public.quiz_attempts
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 8. Allow anonymous responses
CREATE POLICY "Allow anonymous responses" ON public.responses
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Simple working fix applied successfully!';
  RAISE NOTICE 'Your app should now work without 400 errors.';
END $$;
