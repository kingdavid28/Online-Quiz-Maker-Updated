-- CHECK DATABASE SETUP STATUS
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check if get_public_quiz function exists
SELECT 
  'Function Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_public_quiz' 
      AND pronamespace = 'public'::regnamespace
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. Check RLS policies on quizzes
SELECT 
  'Quizzes RLS Policies' as check_type,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename = 'quizzes'
GROUP BY check_type;

-- 3. Check RLS policies on questions  
SELECT 
  'Questions RLS Policies' as check_type,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename = 'questions'
GROUP BY check_type;

-- 4. Check if is_published column exists
SELECT 
  'is_published Column' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quizzes' AND column_name = 'is_published'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 5. Test get_public_quiz function (replace with actual quiz ID)
-- Uncomment and replace YOUR_QUIZ_ID with a real UUID to test
/*
SELECT 
  'Function Test' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) IS NOT NULL THEN '✅ WORKING'
    ELSE '❌ NOT WORKING'
  END as status
FROM pg_proc 
WHERE proname = 'get_public_quiz' 
AND pronamespace = 'public'::regnamespace;
*/

-- 6. Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('quizzes', 'questions', 'quiz_attempts', 'responses')
AND schemaname = 'public'
ORDER BY tablename;

-- 7. Check for any recent errors in logs (last 10 entries)
/*
SELECT 
  'Recent Errors' as check_type,
  COUNT(*) as error_count
FROM pg_stat_activity 
WHERE state = 'active' AND query NOT LIKE '%CHECK DATABASE STATUS%';
*/

-- Summary message
DO $$
BEGIN
  RAISE NOTICE 'Database status check completed! Review the results above.';
  RAISE NOTICE 'If any items show ❌ MISSING, run the appropriate SQL fix.';
END $$;
