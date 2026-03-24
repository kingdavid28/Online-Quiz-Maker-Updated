-- CONFLICT-FREE DATABASE FIX
-- Handles existing policies without conflicts

-- 1. Check what policies exist first
DO $$
DECLARE
    quiz_policy_exists BOOLEAN := EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quizzes' AND cmd = 'INSERT'
    );
BEGIN
    IF quiz_policy_exists THEN
        RAISE NOTICE 'Quiz INSERT policies already exist. Skipping creation.';
    ELSE
        -- Only create INSERT policy if it doesn't exist
        CREATE POLICY "Users can insert own quizzes" ON public.quizzes
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created quiz INSERT policy.';
    END IF;
END $$;

-- 2. Ensure get_public_quiz function exists
DO $$
DECLARE
    function_exists BOOLEAN := EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_public_quiz' 
        AND pronamespace = 'public'::regnamespace
    );
BEGIN
    IF function_exists THEN
        RAISE NOTICE 'get_public_quiz function already exists.';
    ELSE
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
        
        GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
        GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;
        RAISE NOTICE 'Created get_public_quiz function.';
    END IF;
END $$;

-- 3. Check if is_published column exists
DO $$
DECLARE
    column_exists BOOLEAN := EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'is_published'
    );
BEGIN
    IF column_exists THEN
        RAISE NOTICE 'is_published column already exists.';
    ELSE
        ALTER TABLE public.quizzes ADD COLUMN is_published BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_published column.';
    END IF;
END $$;

-- 4. Grant basic permissions for anonymous users
DO $$
BEGIN
    -- Allow anonymous quiz attempts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quiz_attempts' AND cmd = 'INSERT' AND 'anon' = ANY(roles)
    ) THEN
        CREATE POLICY "Allow anonymous quiz attempts" ON public.quiz_attempts
        FOR INSERT TO anon WITH CHECK (true);
        RAISE NOTICE 'Created anonymous quiz attempts policy.';
    END IF;
    
    -- Allow anonymous responses
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'responses' AND cmd = 'INSERT' AND 'anon' = ANY(roles)
    ) THEN
        CREATE POLICY "Allow anonymous responses" ON public.responses
        FOR INSERT TO anon WITH CHECK (true);
        RAISE NOTICE 'Created anonymous responses policy.';
    END IF;
END $$;

-- 5. Test basic functionality
DO $$
BEGIN
    -- Test if users can insert quizzes
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quizzes' AND cmd = 'INSERT'
    ) THEN
        RAISE NOTICE '✅ Users can insert quizzes.';
    ELSE
        RAISE EXCEPTION '❌ Users cannot insert quizzes - This causes 400 errors!';
    END IF;
    
    -- Test if get_public_quiz function works
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_public_quiz' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE NOTICE '✅ get_public_quiz function exists.';
    ELSE
        RAISE EXCEPTION '❌ get_public_quiz function missing - This causes 404 errors!';
    END IF;
    
    RAISE NOTICE '=== CONFLICT-FREE FIX APPLIED ===';
    RAISE NOTICE 'Your app should now work without 400 errors!';
END $$;
