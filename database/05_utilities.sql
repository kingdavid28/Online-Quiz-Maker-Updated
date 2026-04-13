-- =====================================================
-- Online Quiz Maker - Utilities & Maintenance
-- =====================================================
-- This file contains utility functions, maintenance scripts, and cleanup tools

-- =====================================================
-- Data Export/Import Utilities
-- =====================================================

-- Export user's question bank
CREATE OR REPLACE FUNCTION export_question_bank(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  question_type TEXT,
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  points INTEGER,
  tags TEXT[],
  category TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    question_type,
    question_text,
    options,
    correct_answer,
    points,
    tags,
    category,
    difficulty,
    created_at
  FROM question_bank 
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$;

-- Export user's quizzes with questions
CREATE OR REPLACE FUNCTION export_quizzes(p_user_id UUID)
RETURNS TABLE (
  quiz_id UUID,
  title TEXT,
  description TEXT,
  settings JSONB,
  is_public BOOLEAN,
  share_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as quiz_id,
    q.title,
    q.description,
    q.settings,
    q.is_public,
    q.share_token,
    q.created_at,
    jsonb_agg(
      jsonb_build_object(
        'id', qn.id,
        'question_type', qn.question_type,
        'question_text', qn.question_text,
        'options', qn.options,
        'correct_answer', qn.correct_answer,
        'points', qn.points,
        'explanation', qn.explanation,
        'order_index', qn.order_index
      ) ORDER BY qn.order_index
    ) FILTER (WHERE qn.id IS NOT NULL) as questions
  FROM quizzes q
  LEFT JOIN questions qn ON q.id = qn.quiz_id
  WHERE q.user_id = p_user_id
  GROUP BY q.id, q.title, q.description, q.settings, q.is_public, q.share_token, q.created_at
  ORDER BY q.created_at DESC;
END;
$$;

-- =====================================================
-- Data Backup Utilities
-- =====================================================

-- Create backup of user data
CREATE OR REPLACE FUNCTION create_user_backup(p_user_id UUID)
RETURNS TABLE (
  backup_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  question_bank_count INTEGER,
  quiz_count INTEGER,
  question_count INTEGER,
  attempt_count INTEGER,
  backup_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id TEXT;
  v_backup_data JSONB;
  v_qb_count INTEGER;
  v_quiz_count INTEGER;
  v_q_count INTEGER;
  v_attempt_count INTEGER;
BEGIN
  -- Generate backup ID
  v_backup_id := 'backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
  
  -- Get counts
  SELECT COUNT(*) INTO v_qb_count FROM question_bank WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_quiz_count FROM quizzes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_q_count FROM questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  SELECT COUNT(*) INTO v_attempt_count FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  
  -- Create backup data
  v_backup_data := jsonb_build_object(
    'user_id', p_user_id,
    'backup_timestamp', NOW(),
    'question_bank', (SELECT jsonb_agg(to_jsonb(qb)) FROM (SELECT * FROM export_question_bank(p_user_id)) qb),
    'quizzes', (SELECT jsonb_agg(to_jsonb(q)) FROM (SELECT * FROM export_quizzes(p_user_id)) q)
  );
  
  RETURN QUERY
  SELECT 
    v_backup_id,
    NOW(),
    v_qb_count,
    v_quiz_count,
    v_q_count,
    v_attempt_count,
    v_backup_data;
END;
$$;

-- =====================================================
-- Data Cleanup Utilities
-- =====================================================

-- Clean up old quiz attempts (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_attempts(p_days_old INTEGER DEFAULT 365)
RETURNS TABLE (
  deleted_attempts BIGINT,
  cleanup_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  DELETE FROM quiz_attempts 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT v_deleted_count, NOW();
END;
$$;

-- Clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
  cleaned_questions BIGINT,
  cleaned_attempts BIGINT,
  cleanup_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned_questions BIGINT := 0;
  v_cleaned_attempts BIGINT := 0;
BEGIN
  -- Clean up questions without valid quizzes
  DELETE FROM questions 
  WHERE quiz_id NOT IN (SELECT id FROM quizzes);
  GET DIAGNOSTICS v_cleaned_questions = ROW_COUNT;
  
  -- Clean up quiz attempts without valid quizzes
  DELETE FROM quiz_attempts 
  WHERE quiz_id NOT IN (SELECT id FROM quizzes);
  GET DIAGNOSTICS v_cleaned_attempts = ROW_COUNT;
  
  RETURN QUERY
  SELECT v_cleaned_questions, v_cleaned_attempts, NOW();
END;
$$;

-- Reset user data (for testing purposes)
CREATE OR REPLACE FUNCTION reset_user_data(p_user_id UUID, p_confirm BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  status TEXT,
  message TEXT,
  deleted_quizzes BIGINT,
  deleted_questions BIGINT,
  deleted_attempts BIGINT,
  deleted_question_bank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_count BIGINT;
  v_q_count BIGINT;
  v_attempt_count BIGINT;
  v_qb_count BIGINT;
BEGIN
  IF NOT p_confirm THEN
    RETURN QUERY
    SELECT 'ERROR', 'Confirmation required. Set p_confirm=true to proceed.', 0, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Delete quiz attempts for user's quizzes
  DELETE FROM quiz_attempts 
  WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  GET DIAGNOSTICS v_attempt_count = ROW_COUNT;
  
  -- Delete questions for user's quizzes
  DELETE FROM questions 
  WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  GET DIAGNOSTICS v_q_count = ROW_COUNT;
  
  -- Delete user's quizzes
  DELETE FROM quizzes WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_quiz_count = ROW_COUNT;
  
  -- Delete user's question bank
  DELETE FROM question_bank WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_qb_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT 'SUCCESS', 'User data reset completed', v_quiz_count, v_q_count, v_attempt_count, v_qb_count;
END;
$$;

-- =====================================================
-- Statistics and Reporting Utilities
-- =====================================================

-- Get comprehensive user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id UUID)
RETURNS TABLE (
  total_quizzes BIGINT,
  public_quizzes BIGINT,
  total_question_bank BIGINT,
  total_questions BIGINT,
  total_attempts BIGINT,
  avg_score DECIMAL,
  avg_time_spent INTEGER,
  most_used_category TEXT,
  question_type_distribution JSONB,
  monthly_activity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_quizzes BIGINT;
  v_public_quizzes BIGINT;
  v_total_qb BIGINT;
  v_total_q BIGINT;
  v_total_attempts BIGINT;
  v_avg_score DECIMAL;
  v_avg_time INTEGER;
  v_most_category TEXT;
  v_type_dist JSONB;
  v_monthly JSONB;
BEGIN
  -- Basic counts
  SELECT COUNT(*) INTO v_total_quizzes FROM quizzes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_public_quizzes FROM quizzes WHERE user_id = p_user_id AND is_public = true;
  SELECT COUNT(*) INTO v_total_qb FROM question_bank WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_total_q FROM questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  SELECT COUNT(*) INTO v_total_attempts FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  
  -- Performance metrics
  SELECT COALESCE(AVG(score), 0) INTO v_avg_score 
  FROM quiz_attempts 
  WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  
  SELECT COALESCE(AVG(time_spent), 0) INTO v_avg_time 
  FROM quiz_attempts 
  WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id);
  
  -- Most used category
  SELECT category INTO v_most_category
  FROM question_bank 
  WHERE user_id = p_user_id 
  GROUP BY category 
  ORDER BY COUNT(*) DESC 
  LIMIT 1;
  
  -- Question type distribution
  SELECT jsonb_agg(jsonb_build_object(type, count)) INTO v_type_dist
  FROM (
    SELECT question_type as type, COUNT(*) as count
    FROM question_bank 
    WHERE user_id = p_user_id 
    GROUP BY question_type
  ) type_counts;
  
  -- Monthly activity
  SELECT jsonb_agg(jsonb_build_object(month, count)) INTO v_monthly
  FROM (
    SELECT 
      to_char(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM quizzes 
    WHERE user_id = p_user_id 
      AND created_at > NOW() - INTERVAL '12 months'
    GROUP BY to_char(created_at, 'YYYY-MM')
    ORDER BY month
  ) monthly_counts;
  
  RETURN QUERY
  SELECT 
    v_total_quizzes,
    v_public_quizzes,
    v_total_qb,
    v_total_q,
    v_total_attempts,
    v_avg_score,
    v_avg_time,
    v_most_category,
    v_type_dist,
    v_monthly;
END;
$$;

-- Get system-wide statistics (admin only)
CREATE OR REPLACE FUNCTION get_system_statistics()
RETURNS TABLE (
  total_users BIGINT,
  total_quizzes BIGINT,
  public_quizzes BIGINT,
  total_question_bank BIGINT,
  total_questions BIGINT,
  total_attempts BIGINT,
  storage_used TEXT,
  popular_categories JSONB,
  recent_growth JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users BIGINT;
  v_total_quizzes BIGINT;
  v_public_quizzes BIGINT;
  v_total_qb BIGINT;
  v_total_q BIGINT;
  v_total_attempts BIGINT;
  v_storage_used TEXT;
  v_popular_categories JSONB;
  v_recent_growth JSONB;
BEGIN
  -- User counts
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  
  -- Content counts
  SELECT COUNT(*) INTO v_total_quizzes FROM quizzes;
  SELECT COUNT(*) INTO v_public_quizzes FROM quizzes WHERE is_public = true;
  SELECT COUNT(*) INTO v_total_qb FROM question_bank;
  SELECT COUNT(*) INTO v_total_q FROM questions;
  SELECT COUNT(*) INTO v_total_attempts FROM quiz_attempts;
  
  -- Storage usage
  SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) INTO v_storage_used
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts');
  
  -- Popular categories
  SELECT jsonb_agg(jsonb_build_object(category, count)) INTO v_popular_categories
  FROM (
    SELECT category, COUNT(*) as count
    FROM question_bank 
    WHERE category IS NOT NULL
    GROUP BY category 
    ORDER BY count DESC 
    LIMIT 10
  ) popular_cats;
  
  -- Recent growth (last 30 days)
  SELECT jsonb_build_object(
    'new_quizzes', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    'new_attempts', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    'new_users', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')
  ) INTO v_recent_growth
  FROM quizzes;
  
  RETURN QUERY
  SELECT 
    v_total_users,
    v_total_quizzes,
    v_public_quizzes,
    v_total_qb,
    v_total_q,
    v_total_attempts,
    v_storage_used,
    v_popular_categories,
    v_recent_growth;
END;
$$;

-- =====================================================
-- Data Validation Utilities
-- =====================================================

-- Validate data integrity
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
  validation_type TEXT,
  status TEXT,
  issues_found BIGINT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check orphaned questions
  RETURN QUERY
  SELECT 
    'Orphaned Questions' as validation_type,
    CASE WHEN COUNT(*) > 0 THEN 'ISSUES_FOUND' ELSE 'OK' END as status,
    COUNT(*) as issues_found,
    jsonb_agg(question_id) as details
  FROM questions q
  WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE id = q.quiz_id);
  
  -- Check orphaned attempts
  RETURN QUERY
  SELECT 
    'Orphaned Attempts' as validation_type,
    CASE WHEN COUNT(*) > 0 THEN 'ISSUES_FOUND' ELSE 'OK' END as status,
    COUNT(*) as issues_found,
    jsonb_agg(id) as details
  FROM quiz_attempts qa
  WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE id = qa.quiz_id);
  
  -- Check invalid question types
  RETURN QUERY
  SELECT 
    'Invalid Question Types' as validation_type,
    CASE WHEN COUNT(*) > 0 THEN 'ISSUES_FOUND' ELSE 'OK' END as status,
    COUNT(*) as issues_found,
    jsonb_agg(jsonb_build_object('id', id, 'type', question_type)) as details
  FROM question_bank 
  WHERE question_type NOT IN ('multiple_choice', 'true_false', 'short_answer');
  
  -- Check invalid multiple choice questions
  RETURN QUERY
  SELECT 
    'Invalid MC Questions' as validation_type,
    CASE WHEN COUNT(*) > 0 THEN 'ISSUES_FOUND' ELSE 'OK' END as status,
    COUNT(*) as issues_found,
    jsonb_agg(id) as details
  FROM question_bank 
  WHERE question_type = 'multiple_choice'
    AND (
      options IS NULL 
      OR jsonb_array_length(options) < 2
      OR TRY_CAST(correct_answer AS INTEGER) IS NULL
      OR TRY_CAST(correct_answer AS INTEGER) < 0
      OR TRY_CAST(correct_answer AS INTEGER) >= jsonb_array_length(options)
    );
END;
$$;

-- =====================================================
-- Maintenance Automation
-- =====================================================

-- Automated maintenance routine
CREATE OR REPLACE FUNCTION automated_maintenance()
RETURNS TABLE (
  task TEXT,
  status TEXT,
  records_affected BIGINT,
  execution_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMP WITH TIME ZONE := NOW();
  v_attempts_deleted BIGINT;
  v_orphans_cleaned BIGINT;
BEGIN
  -- Clean up old attempts (older than 1 year)
  DELETE FROM quiz_attempts WHERE created_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS v_attempts_deleted = ROW_COUNT;
  
  RETURN QUERY
  SELECT 
    'Clean Old Attempts' as task,
    'COMPLETED' as status,
    v_attempts_deleted as records_affected,
    NOW() - v_start_time as execution_time;
  
  -- Clean up orphaned data
  PERFORM cleanup_orphaned_data();
  
  RETURN QUERY
  SELECT 
    'Clean Orphaned Data' as task,
    'COMPLETED' as status,
    (SELECT COUNT(*) FROM cleanup_orphaned_data()) as records_affected,
    NOW() - v_start_time as execution_time;
  
  -- Update statistics
  ANALYZE question_bank;
  ANALYZE quizzes;
  ANALYZE questions;
  ANALYZE quiz_attempts;
  
  RETURN QUERY
  SELECT 
    'Update Statistics' as task,
    'COMPLETED' as status,
    0 as records_affected,
    NOW() - v_start_time as execution_time;
END;
$$;

-- =====================================================
-- Performance Optimization Utilities
-- =====================================================

-- Optimize database performance
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TABLE (
  optimization_task TEXT,
  status TEXT,
  impact TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update table statistics
  ANALYZE question_bank;
  ANALYZE quizzes;
  ANALYZE questions;
  ANALYZE quiz_attempts;
  
  RETURN QUERY
  SELECT 'Update Statistics', 'COMPLETED', 'Improved query planning';
  
  -- Reindex frequently accessed tables
  REINDEX INDEX CONCURRENTLY idx_question_bank_user_id;
  REINDEX INDEX CONCURRENTLY idx_quizzes_user_id;
  REINDEX INDEX CONCURRENTLY idx_quiz_attempts_quiz_id;
  
  RETURN QUERY
  SELECT 'Reindex Tables', 'COMPLETED', 'Improved index performance';
  
  -- Vacuum analyze tables
  VACUUM ANALYZE question_bank;
  VACUUM ANALYZE quizzes;
  VACUUM ANALYZE questions;
  VACUUM ANALYZE quiz_attempts;
  
  RETURN QUERY
  SELECT 'Vacuum Analyze', 'COMPLETED', 'Reclaimed space and updated stats';
END;
$$;

-- =====================================================
-- Usage Examples
-- =====================================================

-- Example usage of utility functions:
/*
-- Get user statistics
SELECT * FROM get_user_statistics(auth.uid());

-- Create backup
SELECT * FROM create_user_backup(auth.uid());

-- Clean up old data
SELECT * FROM cleanup_old_attempts(90);

-- Validate data integrity
SELECT * FROM validate_data_integrity();

-- Run automated maintenance
SELECT * FROM automated_maintenance();

-- Optimize database
SELECT * FROM optimize_database();
*/

-- =====================================================
-- Setup Complete
-- =====================================================

-- All utility functions are now ready for use!
-- These functions provide comprehensive data management, maintenance, and reporting capabilities
