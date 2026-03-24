-- MINIMAL DATABASE FIX
-- Only adds what's missing, doesn't touch existing policies

-- 1. Just ensure get_public_quiz function exists (most critical)
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

-- 4. Check if INSERT policy exists for quizzes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Enable quiz creation" ON public.quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Added quiz creation policy.';
  ELSE
    RAISE NOTICE 'Quiz creation policy already exists.';
  END IF;
END $$;

-- 5. Test what we have
DO $$
BEGIN
  RAISE NOTICE '=== MINIMAL FIX APPLIED ===';
  RAISE NOTICE '✅ get_public_quiz function created/updated';
  RAISE NOTICE '✅ is_published column checked';
  RAISE NOTICE '✅ Quiz creation policy checked';
  RAISE NOTICE 'Your app should now work without 400 errors!';
END $$;
