-- TEST THE get_public_quiz FUNCTION
-- Run this in Supabase SQL Editor to test if the function works

-- Test 1: Check if function exists and works
SELECT proname, proargtypes FROM pg_proc WHERE proname = 'get_public_quiz';

-- Test 2: Try to call the function directly (replace with actual quiz ID)
-- Uncomment and replace YOUR_QUIZ_ID with an actual quiz ID from your database
/*
SELECT get_public_quiz('YOUR_QUIZ_ID'::uuid);
*/

-- Test 3: Check if RLS policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('quizzes', 'questions') 
ORDER BY tablename, policyname;

-- Test 4: Check if anon role has permissions
SELECT use_grantor, grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'anon' AND table_name = 'get_public_quiz';

-- If function exists but still getting 404, run this fix:
DROP FUNCTION IF EXISTS public.get_public_quiz(UUID);

CREATE OR REPLACE FUNCTION public.get_public_quiz(p_quiz_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  questions JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    q.id,
    q.user_id,
    q.title,
    q.description,
    COALESCE(q.questions, '[]'::jsonb) as questions,
    q.settings,
    q.created_at,
    q.updated_at
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- Re-enable public policies
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
CREATE POLICY "Allow public read access to quizzes" ON public.quizzes
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions" ON public.questions
FOR SELECT TO anon, authenticated USING (true);

SELECT 'Function test and fix completed - try share links again' as result;
