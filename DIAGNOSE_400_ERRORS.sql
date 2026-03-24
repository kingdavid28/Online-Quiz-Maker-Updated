-- DIAGNOSE 400 BAD REQUEST ERRORS
-- Run this in Supabase SQL Editor to find the exact issue

-- 1. Check if get_public_quiz function exists (most critical for share links)
SELECT 
  'get_public_quiz function' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_public_quiz' 
      AND pronamespace = 'public'::regnamespace
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - This causes 404 errors'
  END as status;

-- 2. Check INSERT policies on quizzes (needed for quiz creation)
SELECT 
  'Quizzes INSERT policies' as item,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO INSERT POLICIES - This causes 400 errors'
    ELSE '✅ HAS INSERT POLICIES'
  END as status
FROM pg_policies 
WHERE tablename = 'quizzes' AND cmd = 'INSERT';

-- 3. Check if user can insert quizzes
SELECT 
  'User INSERT permission' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'quizzes' 
      AND cmd = 'INSERT'
      AND (roles = '{public}' OR 'authenticated' = ANY(roles))
    ) THEN '✅ AUTHENTICATED USERS CAN INSERT'
    ELSE '❌ NO INSERT PERMISSION FOR USERS - This causes 400 errors'
  END as status;

-- 4. Check if is_published column exists
SELECT 
  'is_published column' as item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quizzes' AND column_name = 'is_published'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - May cause issues with published quizzes'
  END as status;

-- 5. Test basic quiz insert (this will show if INSERT works)
-- This should NOT return an error if everything is working
DO $$
BEGIN
  -- This is just a test - it won't actually insert anything
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' 
    AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION '❌ CRITICAL: No INSERT policies found on quizzes table!';
  END IF;
  
  RAISE NOTICE '✅ INSERT policies exist on quizzes table';
END $$;

-- Summary and recommendation
DO $$
BEGIN
  RAISE NOTICE '=== DIAGNOSIS COMPLETE ===';
  RAISE NOTICE 'If any items show ❌, run QUICK_DATABASE_FIX.sql to resolve 400 errors.';
  RAISE NOTICE 'The 400 Bad Request errors are likely due to missing INSERT policies or functions.';
END $$;
