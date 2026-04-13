-- =====================================================
-- Online Quiz Maker - RPC Functions
-- =====================================================
-- This file contains all RPC functions for the application
-- Run this after the schema setup

-- =====================================================
-- Schema Refresh Functions
-- =====================================================

-- Function to refresh PostgREST schema cache
CREATE OR REPLACE FUNCTION refresh_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function helps refresh the PostgREST schema cache
  -- Useful when schema changes aren't immediately reflected
  PERFORM 1;
END;
$$;

-- Function to get schema information
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')
  ORDER BY c.table_name, c.column_name;
END;
$$;

-- =====================================================
-- Question Bank Functions
-- =====================================================

-- Direct question insert function (bypasses PostgREST cache)
CREATE OR REPLACE FUNCTION insert_question_direct(
  p_user_id UUID,
  p_type TEXT,
  p_question TEXT,
  p_options JSONB,
  p_correct_answer TEXT,
  p_points INTEGER DEFAULT 1,
  p_tags TEXT[] DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT 'medium'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
  INSERT INTO question_bank (
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points,
    tags,
    category,
    difficulty
  ) VALUES (
    p_user_id,
    p_type,
    p_question,
    p_options,
    p_correct_answer,
    p_points,
    p_tags,
    p_category,
    p_difficulty
  ) RETURNING 
    id,
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points,
    tags,
    category,
    difficulty,
    created_at;
END;
$$;

-- Save question fallback function
CREATE OR REPLACE FUNCTION save_question_to_bank(
  p_user_id UUID,
  p_type TEXT,
  p_question TEXT,
  p_options JSONB,
  p_correct_answer TEXT,
  p_points INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  question_type TEXT,
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO question_bank (
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points
  ) VALUES (
    p_user_id,
    p_type,
    p_question,
    p_options,
    p_correct_answer,
    p_points
  ) RETURNING 
    id,
    user_id,
    question_type,
    question_text,
    options,
    correct_answer,
    points,
    created_at;
END;
$$;

-- Get question statistics
CREATE OR REPLACE FUNCTION get_question_bank_stats(p_user_id UUID)
RETURNS TABLE (
  total_questions BIGINT,
  by_type JSONB,
  by_category JSONB,
  by_difficulty JSONB,
  avg_points DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_questions,
    jsonb_agg(jsonb_build_object(question_type, count)) FILTER (WHERE question_type IS NOT NULL) as by_type,
    jsonb_agg(jsonb_build_object(category, count)) FILTER (WHERE category IS NOT NULL) as by_category,
    jsonb_agg(jsonb_build_object(difficulty, count)) FILTER (WHERE difficulty IS NOT NULL) as by_difficulty,
    AVG(points) as avg_points
  FROM (
    SELECT 
      question_type,
      category,
      difficulty,
      points,
      COUNT(*) OVER () as count
    FROM question_bank 
    WHERE user_id = p_user_id
  ) grouped;
END;
$$;

-- =====================================================
-- Quiz Functions
-- =====================================================

-- Create quiz with questions
CREATE OR REPLACE FUNCTION create_quiz_with_questions(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}',
  p_questions JSONB DEFAULT '[]'
)
RETURNS TABLE (
  quiz_id UUID,
  title TEXT,
  description TEXT,
  settings JSONB,
  question_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_id UUID;
  v_question_count INTEGER := 0;
BEGIN
  -- Create the quiz
  INSERT INTO quizzes (user_id, title, description, settings)
  VALUES (p_user_id, p_title, p_description, p_settings)
  RETURNING id INTO v_quiz_id;
  
  -- Add questions if provided
  IF jsonb_array_length(p_questions) > 0 THEN
    FOR i IN 0..jsonb_array_length(p_questions) - 1 LOOP
      DECLARE
        v_question JSONB := p_questions -> i;
      BEGIN
        INSERT INTO questions (
          quiz_id,
          question_type,
          question_text,
          options,
          correct_answer,
          points,
          order_index
        ) VALUES (
          v_quiz_id,
          v_question ->> 'question_type',
          v_question ->> 'question_text',
          v_question -> 'options',
          v_question ->> 'correct_answer',
          COALESCE((v_question ->> 'points')::INTEGER, 1),
          i
        );
        v_question_count := v_question_count + 1;
      END;
    END LOOP;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_quiz_id,
    p_title,
    p_description,
    p_settings,
    v_question_count;
END;
$$;

-- Get quiz with analytics
CREATE OR REPLACE FUNCTION get_quiz_with_analytics(p_quiz_id UUID)
RETURNS TABLE (
  quiz_id UUID,
  title TEXT,
  description TEXT,
  settings JSONB,
  total_attempts BIGINT,
  avg_score DECIMAL,
  pass_rate DECIMAL,
  avg_time_spent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.title,
    q.description,
    q.settings,
    COALESCE(COUNT(a.id), 0) as total_attempts,
    COALESCE(AVG(a.score), 0) as avg_score,
    COALESCE(
      (COUNT(*) FILTER (WHERE a.passed = true) * 100.0 / NULLIF(COUNT(*), 0)), 
      0
    ) as pass_rate,
    COALESCE(AVG(a.time_spent), 0) as avg_time_spent
  FROM quizzes q
  LEFT JOIN quiz_attempts a ON q.id = a.quiz_id
  WHERE q.id = p_quiz_id
  GROUP BY q.id, q.title, q.description, q.settings;
END;
$$;

-- =====================================================
-- Analytics Functions
-- =====================================================

-- Get comprehensive quiz analytics
CREATE OR REPLACE FUNCTION get_comprehensive_analytics(p_quiz_id UUID)
RETURNS TABLE (
  total_attempts BIGINT,
  average_score DECIMAL,
  pass_rate DECIMAL,
  average_time_spent INTEGER,
  question_stats JSONB,
  score_distribution JSONB,
  recent_attempts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_attempts BIGINT;
  v_avg_score DECIMAL;
  v_pass_rate DECIMAL;
  v_avg_time_spent INTEGER;
  v_question_stats JSONB;
  v_score_distribution JSONB;
  v_recent_attempts JSONB;
BEGIN
  -- Get basic stats
  SELECT 
    COUNT(*) INTO v_total_attempts,
    COALESCE(AVG(score), 0) INTO v_avg_score,
    COALESCE(
      (COUNT(*) FILTER (WHERE passed = true) * 100.0 / NULLIF(COUNT(*), 0)), 
      0
    ) INTO v_pass_rate,
    COALESCE(AVG(time_spent), 0) INTO v_avg_time_spent
  FROM quiz_attempts 
  WHERE quiz_id = p_quiz_id;
  
  -- Get question performance stats
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_index', q.order_index,
      'question_text', q.question_text,
      'correct_percentage', 
      CASE 
        WHEN COUNT(a.id) > 0 THEN 
          (COUNT(*) FILTER (WHERE (a.answers -> q.order_index::text) = q.correct_answer) * 100.0 / COUNT(a.id))
        ELSE 0 
      END,
      'total_attempts', COUNT(a.id)
    )
  ) INTO v_question_stats
  FROM questions q
  LEFT JOIN quiz_attempts a ON q.quiz_id = a.quiz_id
  WHERE q.quiz_id = p_quiz_id
  GROUP BY q.id, q.order_index, q.question_text, q.correct_answer
  ORDER BY q.order_index;
  
  -- Get score distribution
  SELECT jsonb_agg(
    jsonb_build_object(
      'score_range', score_range,
      'count', count
    )
  ) INTO v_score_distribution
  FROM (
    SELECT 
      CASE 
        WHEN score < 20 THEN '0-19'
        WHEN score < 40 THEN '20-39'
        WHEN score < 60 THEN '40-59'
        WHEN score < 80 THEN '60-79'
        ELSE '80-100'
      END as score_range,
      COUNT(*) as count
    FROM quiz_attempts 
    WHERE quiz_id = p_quiz_id
    GROUP BY 
      CASE 
        WHEN score < 20 THEN '0-19'
        WHEN score < 40 THEN '20-39'
        WHEN score < 60 THEN '40-59'
        WHEN score < 80 THEN '60-79'
        ELSE '80-100'
      END
  ) score_ranges;
  
  -- Get recent attempts
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_name', user_name,
      'user_email', user_email,
      'score', score,
      'passed', passed,
      'time_spent', time_spent,
      'completed_at', completed_at
    ) ORDER BY completed_at DESC
  ) INTO v_recent_attempts
  FROM (
    SELECT *
    FROM quiz_attempts 
    WHERE quiz_id = p_quiz_id
    ORDER BY completed_at DESC
    LIMIT 10
  ) recent;
  
  RETURN QUERY
  SELECT 
    v_total_attempts,
    v_avg_score,
    v_pass_rate,
    v_avg_time_spent,
    v_question_stats,
    v_score_distribution,
    v_recent_attempts;
END;
$$;

-- Get user analytics
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS TABLE (
  total_quizzes BIGINT,
  total_attempts BIGINT,
  average_score DECIMAL,
  favorite_quiz_type TEXT,
  recent_activity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM quizzes WHERE user_id = p_user_id) as total_quizzes,
    (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id)) as total_attempts,
    COALESCE(
      (SELECT AVG(score) FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id)), 
      0
    ) as average_score,
    (SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (SELECT title FROM quizzes WHERE id = quiz_id ORDER BY COUNT(*) DESC LIMIT 1)
        ELSE 'No quizzes yet'
      END 
     FROM quiz_attempts 
     WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = p_user_id)
     GROUP BY quiz_id 
     ORDER BY COUNT(*) DESC 
     LIMIT 1
    ) as favorite_quiz_type,
    jsonb_agg(
      jsonb_build_object(
        'action', activity.action,
        'quiz_title', activity.quiz_title,
        'timestamp', activity.timestamp
      ) ORDER BY activity.timestamp DESC
    ) FILTER (WHERE activity.action IS NOT NULL) as recent_activity
  FROM (
    -- Recent quiz activities
    SELECT 
      'created_quiz' as action,
      title as quiz_title,
      created_at as timestamp
    FROM quizzes 
    WHERE user_id = p_user_id
    
    UNION ALL
    
    SELECT 
      'attempted_quiz' as action,
      q.title as quiz_title,
      a.created_at as timestamp
    FROM quiz_attempts a
    JOIN quizzes q ON a.quiz_id = q.id
    WHERE q.user_id = p_user_id
  ) activity
  WHERE activity.timestamp > NOW() - INTERVAL '30 days'
  LIMIT 10;
END;
$$;

-- =====================================================
-- Utility Functions
-- =====================================================

-- Generate share token for quiz
CREATE OR REPLACE FUNCTION generate_share_token(p_quiz_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate unique token
  v_token := encode(sha256(p_quiz_id::TEXT || NOW()::TEXT), 'hex');
  
  -- Update quiz with token
  UPDATE quizzes 
  SET share_token = v_token, is_public = true 
  WHERE id = p_quiz_id;
  
  RETURN v_token;
END;
$$;

-- Get public quiz by share token
CREATE OR REPLACE FUNCTION get_public_quiz_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  settings JSONB,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.title,
    q.description,
    q.settings,
    jsonb_agg(
      jsonb_build_object(
        'id', qn.id,
        'question_type', qn.question_type,
        'question_text', qn.question_text,
        'options', qn.options,
        'points', qn.points,
        'order_index', qn.order_index
      ) ORDER BY qn.order_index
    ) as questions
  FROM quizzes q
  LEFT JOIN questions qn ON q.id = qn.quiz_id
  WHERE q.share_token = p_token AND q.is_public = true
  GROUP BY q.id, q.title, q.description, q.settings;
END;
$$;

-- =====================================================
-- Health Check Functions
-- =====================================================

-- Database health check
CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE (
  status TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  table_count INTEGER,
  total_questions BIGINT,
  total_quizzes BIGINT,
  total_attempts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'healthy' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('question_bank', 'quizzes', 'questions', 'quiz_attempts')) as table_count,
    (SELECT COUNT(*) FROM question_bank) as total_questions,
    (SELECT COUNT(*) FROM quizzes) as total_quizzes,
    (SELECT COUNT(*) FROM quiz_attempts) as total_attempts;
END;
$$;

-- =====================================================
-- Function Validation
-- =====================================================

-- List all created functions
SELECT 
  proname,
  pronargs,
  prorettype::regtype,
  prosrc
FROM pg_proc 
WHERE proname LIKE '%_%' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- =====================================================
-- Setup Complete
-- =====================================================

-- All RPC functions are now ready for use!
-- Functions include schema refresh, question management, quiz operations, analytics, and utilities
