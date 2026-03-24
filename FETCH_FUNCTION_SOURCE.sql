-- FETCH AND SHOW get_public_quiz FUNCTION SOURCE
-- Run this in Supabase SQL Editor to see the exact function definition

-- Get the function source code
SELECT 
  proname as function_name,
  prosrc as source_code,
  prolang as language,
  prosecdef as security_definer,
  prorettype::regtype as return_type,
  proargtypes::regtype[] as argument_types
FROM pg_proc 
WHERE proname = 'get_public_quiz'
AND pronamespace = 'public'::regnamespace;

-- Show the function definition in a more readable format
SELECT 
  pg_get_functiondef(oid) as full_function_definition
FROM pg_proc 
WHERE proname = 'get_public_quiz'
AND pronamespace = 'public'::regnamespace;

-- Also show what tables it references
SELECT 
  dependent_ns.nspname as schema_name,
  dependent_class.relname as table_name,
  dependent_class.relkind as object_type
FROM pg_depend 
JOIN pg_rewrite AS dependent_r ON dependent_r.oid = pg_depend.objid
JOIN pg_class AS dependent_class ON dependent_class.oid = dependent_r.ev_class
JOIN pg_namespace AS dependent_ns ON dependent_ns.oid = dependent_class.relnamespace
WHERE pg_depend.refobjid = (
  SELECT oid FROM pg_proc 
  WHERE proname = 'get_public_quiz' 
  AND pronamespace = 'public'::regnamespace
);

-- Show current RLS policies that affect this function
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quizzes', 'questions')
ORDER BY tablename, policyname;
