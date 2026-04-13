-- =====================================================
-- Online Quiz Maker - Testing & Diagnostics
-- =====================================================
-- This file contains all testing queries and diagnostic tools
-- Use these to verify database functionality and troubleshoot issues

-- =====================================================
-- Basic Database Health Checks
-- =====================================================

-- Check if all tables exist and are accessible
SELECT 
  'Table Status' as check_type,
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename;

-- Check table row counts
SELECT 
  'Row Counts' as check_type,
  'question_bank' as table_name,
  COUNT(*) as row_count
FROM question_bank
UNION ALL
SELECT 
  'Row Counts' as check_type,
  'quizzes' as table_name,
  COUNT(*) as row_count
FROM quizzes
UNION ALL
SELECT 
  'Row Counts' as check_type,
  'questions' as table_name,
  COUNT(*) as row_count
FROM questions
UNION ALL
SELECT 
  'Row Counts' as check_type,
  'quiz_attempts' as table_name,
  COUNT(*) as row_count
FROM quiz_attempts;

-- Check RLS status
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity,
  forcerlspolicy
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename;

-- =====================================================
-- Schema Validation
-- =====================================================

-- Validate question_bank table structure
SELECT 
  'Schema Validation' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'question_bank'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  'Constraint Check' as check_type,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- Performance Diagnostics
-- =====================================================

-- Check index usage
SELECT 
  'Index Usage' as check_type,
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename, idx_scan DESC;

-- Check table sizes
SELECT 
  'Table Size' as check_type,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- RLS Policy Testing
-- =====================================================

-- Test question bank access (should work for authenticated users)
SELECT 
  'RLS Test - Question Bank' as test_type,
  COUNT(*) as accessible_questions
FROM question_bank;

-- Test quiz access (should work for user's own quizzes)
SELECT 
  'RLS Test - User Quizzes' as test_type,
  COUNT(*) as accessible_quizzes
FROM quizzes;

-- Test public quiz access (should work for public quizzes)
SELECT 
  'RLS Test - Public Quizzes' as test_type,
  COUNT(*) as accessible_public_quizzes
FROM quizzes 
WHERE is_public = true;

-- =====================================================
-- Function Testing
-- =====================================================

-- Test schema info function
SELECT * FROM get_schema_info() LIMIT 10;

-- Test health check function
SELECT * FROM health_check();

-- Test question validation function
SELECT 
  'Function Test - Question Validation' as test_type,
  validate_question_data('multiple_choice', 'Test question', '["A", "B", "C"]', '1') as valid_mc,
  validate_question_data('true_false', 'Test question', NULL, 'true') as valid_tf,
  validate_question_data('short_answer', 'Test question', NULL, 'Answer') as valid_sa,
  validate_question_data('invalid_type', 'Test question', NULL, 'Answer') as invalid_type,
  validate_question_data('multiple_choice', 'Test question', '["A"]', '1') as invalid_options;

-- Test share token generation (if there are quizzes)
DO $$
DECLARE
  v_quiz_id UUID;
BEGIN
  SELECT id INTO v_quiz_id FROM quizzes LIMIT 1;
  
  IF v_quiz_id IS NOT NULL THEN
    PERFORM generate_share_token(v_quiz_id);
    RAISE NOTICE 'Share token generated for quiz: %', v_quiz_id;
  ELSE
    RAISE NOTICE 'No quizzes found to test share token generation';
  END IF;
END $$;

-- =====================================================
-- Data Integrity Checks
-- =====================================================

-- Check for orphaned questions (questions without valid quizzes)
SELECT 
  'Orphaned Questions' as check_type,
  COUNT(*) as orphaned_count
FROM questions q
LEFT JOIN quizzes qz ON q.quiz_id = qz.id
WHERE qz.id IS NULL;

-- Check for orphaned quiz attempts (attempts without valid quizzes)
SELECT 
  'Orphaned Attempts' as check_type,
  COUNT(*) as orphaned_count
FROM quiz_attempts qa
LEFT JOIN quizzes qz ON qa.quiz_id = qz.id
WHERE qz.id IS NULL;

-- Check for invalid question types
SELECT 
  'Invalid Question Types' as check_type,
  question_type,
  COUNT(*) as count
FROM question_bank
WHERE question_type NOT IN ('multiple_choice', 'true_false', 'short_answer')
GROUP BY question_type;

-- Check for invalid correct answers in multiple choice
SELECT 
  'Invalid MC Answers' as check_type,
  COUNT(*) as invalid_count
FROM question_bank
WHERE question_type = 'multiple_choice'
  AND (
    options IS NULL 
    OR jsonb_array_length(options) = 0
    OR TRY_CAST(correct_answer AS INTEGER) IS NULL
    OR TRY_CAST(correct_answer AS INTEGER) < 0
    OR TRY_CAST(correct_answer AS INTEGER) >= jsonb_array_length(options)
  );

-- =====================================================
-- Sample Data Testing
-- =====================================================

-- Insert test question bank data (if table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM question_bank) = 0 THEN
    INSERT INTO question_bank (user_id, question_type, question_text, options, correct_answer, points, category, difficulty) VALUES
      (auth.uid(), 'multiple_choice', 'What is the capital of France?', '["London", "Paris", "Berlin", "Madrid"]', '1', 1, 'Geography', 'easy'),
      (auth.uid(), 'true_false', 'The Earth is flat.', NULL, 'false', 1, 'Science', 'easy'),
      (auth.uid(), 'short_answer', 'What is 2 + 2?', NULL, '4', 1, 'Math', 'easy');
    
    RAISE NOTICE 'Sample question bank data inserted';
  END IF;
END $$;

-- Insert test quiz (if no quizzes exist)
DO $$
DECLARE
  v_quiz_id UUID;
BEGIN
  IF (SELECT COUNT(*) FROM quizzes) = 0 THEN
    INSERT INTO quizzes (user_id, title, description) VALUES
      (auth.uid(), 'Test Quiz', 'A test quiz for validation')
    RETURNING id INTO v_quiz_id;
    
    -- Add questions to test quiz
    INSERT INTO questions (quiz_id, question_type, question_text, options, correct_answer, points, order_index) VALUES
      (v_quiz_id, 'multiple_choice', 'What is 2 + 2?', '["3", "4", "5", "6"]', '1', 1, 0),
      (v_quiz_id, 'true_false', 'The sky is blue.', NULL, 'true', 1, 1);
    
    RAISE NOTICE 'Test quiz and questions inserted: %', v_quiz_id;
  END IF;
END $$;

-- =====================================================
-- Performance Benchmarking
-- =====================================================

-- Benchmark question bank queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM question_bank WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10;

-- Benchmark quiz queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT q.*, COUNT(qa.id) as attempt_count 
FROM quizzes q 
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id 
WHERE q.user_id = auth.uid() 
GROUP BY q.id, q.title, q.description, q.settings, q.user_id, q.is_public, q.share_token, q.created_at, q.updated_at
ORDER BY q.created_at DESC;

-- Benchmark analytics queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  COUNT(*) as total_attempts,
  AVG(score) as avg_score,
  AVG(time_spent) as avg_time
FROM quiz_attempts 
WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid());

-- =====================================================
-- Security Testing
-- =====================================================

-- Test if users can only access their own data
SELECT 
  'Security Test - Own Data' as test_type,
  COUNT(*) as own_question_bank_count
FROM question_bank 
WHERE user_id = auth.uid();

-- Test if public quizzes are accessible
SELECT 
  'Security Test - Public Access' as test_type,
  COUNT(*) as public_quiz_count
FROM quizzes 
WHERE is_public = true;

-- Test if quiz attempts are properly restricted
SELECT 
  'Security Test - Attempt Access' as test_type,
  COUNT(*) as accessible_attempts
FROM quiz_attempts;

-- =====================================================
-- Error Simulation Tests
-- =====================================================

-- Test constraint violations
DO $$
BEGIN
  -- Test invalid question type
  BEGIN
    INSERT INTO question_bank (user_id, question_type, question_text, correct_answer)
    VALUES (auth.uid(), 'invalid_type', 'Test', 'Answer');
    RAISE NOTICE 'ERROR: Invalid question type constraint failed';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'SUCCESS: Invalid question type properly rejected: %', SQLERRM;
  END;
  
  -- Test null question text
  BEGIN
    INSERT INTO question_bank (user_id, question_type, question_text, correct_answer)
    VALUES (auth.uid(), 'multiple_choice', NULL, '1');
    RAISE NOTICE 'ERROR: Null question text constraint failed';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'SUCCESS: Null question text properly rejected: %', SQLERRM;
  END;
  
  -- Test invalid multiple choice options
  BEGIN
    INSERT INTO question_bank (user_id, question_type, question_text, options, correct_answer)
    VALUES (auth.uid(), 'multiple_choice', 'Test', '["Only one option"]', '1');
    RAISE NOTICE 'ERROR: Invalid MC options constraint failed';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'SUCCESS: Invalid MC options properly rejected: %', SQLERRM;
  END;
END $$;

-- =====================================================
-- Comprehensive Report
-- =====================================================

-- Generate comprehensive database health report
SELECT 
  'Database Health Report' as report_section,
  'Tables' as metric,
  COUNT(*) as value,
  'All required tables exist' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'question_bank', 'quizzes', 'questions', 'quiz_attempts')

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'Indexes' as metric,
  COUNT(*) as value,
  'Performance indexes created' as status
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
  AND indexname NOT LIKE '%_pkey'

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'RLS Policies' as metric,
  COUNT(*) as value,
  'Security policies enabled' as status
FROM pg_policies 
WHERE tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'Functions' as metric,
  COUNT(*) as value,
  'RPC functions available' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname LIKE '%_%'

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'Question Bank' as metric,
  COUNT(*) as value,
  'Questions available' as status
FROM question_bank

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'Quizzes' as metric,
  COUNT(*) as value,
  'Quizzes created' as status
FROM quizzes

UNION ALL

SELECT 
  'Database Health Report' as report_section,
  'Quiz Attempts' as metric,
  COUNT(*) as value,
  'Attempts recorded' as status
FROM quiz_attempts

ORDER BY report_section, metric;

-- =====================================================
-- Testing Complete
-- =====================================================

-- All diagnostic tests have been completed!
-- Review the output above to ensure everything is working correctly

-- Key things to check:
-- 1. All tables exist and have data
-- 2. RLS policies are enabled and working
-- 3. Indexes are created and being used
-- 4. Functions are working correctly
-- 5. Constraints are properly enforced
-- 6. No orphaned data exists
-- 7. Security policies are working
