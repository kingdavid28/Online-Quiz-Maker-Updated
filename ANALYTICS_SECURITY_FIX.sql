-- FIX FOR QUIZ ANALYTICS SECURITY DEFINER WARNING
-- Run this in Supabase SQL Editor

-- First, drop any existing problematic views/functions
DROP VIEW IF EXISTS public.quiz_analytics;
DROP FUNCTION IF EXISTS public.get_quiz_analytics(UUID);

-- Create secure analytics function with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_quiz_analytics(p_quiz_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only return analytics if user owns the quiz or if no user_id provided (public access)
  IF p_user_id IS NULL OR EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = p_quiz_id AND user_id = p_user_id
  ) THEN
    SELECT jsonb_build_object(
      'totalAttempts', COALESCE(attempt_count, 0),
      'averageScore', COALESCE(avg_score, 0),
      'passRate', COALESCE(pass_rate, 0),
      'averageTimeSpent', COALESCE(avg_time, 0),
      'questionStats', COALESCE(question_stats, '[]'::jsonb),
      'recentAttempts', COALESCE(recent_attempts, '[]'::jsonb)
    ) INTO v_result
    FROM (
      SELECT 
        COUNT(*) as attempt_count,
        AVG(score) as avg_score,
        COUNT(CASE WHEN passed THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
        AVG(time_spent) as avg_time,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'questionIndex', q.order_index,
              'questionText', q.question_text,
              'correctPercentage', 
                CASE 
                  WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN a.correct = TRUE THEN 1 END) * 100.0 / COUNT(*))
                  ELSE 0
                END,
              'totalAnswered', COUNT(*)
            )
          )
          FROM public.questions q
          LEFT JOIN (
            SELECT 
              question_index,
              answers[question_index] = correct_answer as correct
            FROM public.quiz_attempts
            WHERE quiz_id = p_quiz_id
          ) a ON q.order_index = a.question_index
          WHERE q.quiz_id = p_quiz_id
          GROUP BY q.order_index, q.question_text
          ORDER BY q.order_index
        ) as question_stats,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', id,
              'quizId', quiz_id,
              'userName', user_name,
              'userEmail', user_email,
              'score', score,
              'correctAnswers', correct_answers,
              'totalQuestions', total_questions,
              'passed', passed,
              'timeSpent', time_spent,
              'createdAt', created_at
            ) ORDER BY created_at DESC LIMIT 10
          ) as recent_attempts
      FROM public.quiz_attempts
      WHERE quiz_id = p_quiz_id
    ) analytics;
  ELSE
    RAISE EXCEPTION 'Access denied: You do not have permission to view analytics for this quiz';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO anon;

-- Alternative simpler version if complex analytics not needed
CREATE OR REPLACE FUNCTION public.get_simple_quiz_analytics(p_quiz_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check permissions
  IF p_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = p_quiz_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get basic analytics
  SELECT jsonb_build_object(
    'totalAttempts', COUNT(*),
    'averageScore', AVG(score),
    'passRate', COUNT(CASE WHEN passed THEN 1 END) * 100.0 / COUNT(*),
    'averageTimeSpent', AVG(time_spent)
  ) INTO v_result
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions for simple version
GRANT EXECUTE ON FUNCTION public.get_simple_quiz_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_simple_quiz_analytics TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics security fix applied successfully! SECURITY DEFINER functions replaced with SECURITY INVOKER.';
END $$;
