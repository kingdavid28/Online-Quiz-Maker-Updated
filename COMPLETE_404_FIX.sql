-- COMPLETE FIX FOR 404 ERRORS ON SHARE LINKS
-- Run this in Supabase SQL Editor

-- 1. Drop any existing problematic views/functions
DROP VIEW IF EXISTS public.quiz_analytics;
DROP FUNCTION IF EXISTS public.get_quiz_analytics(UUID);
DROP FUNCTION IF EXISTS public.get_public_quiz(UUID);

-- 2. Create RLS policy to allow public read access to quizzes
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
CREATE POLICY "Allow public read access to quizzes"
  ON public.quizzes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Create RLS policy to allow public read access to questions
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions"
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Create public function to get quiz with questions (no auth required)
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
    'questions', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', CASE 
              WHEN question_type = 'multiple_choice' THEN 'multiple-choice'
              WHEN question_type = 'true_false' THEN 'true-false'
              WHEN question_type = 'short_answer' THEN 'short-answer'
              ELSE question_type
            END,
            'question', question_text,
            'options', options,
            'correctAnswer', correct_answer,
            'points', points
          ) ORDER BY order_index
        )
        FROM public.questions
        WHERE quiz_id = q.id
      ),
      '[]'::jsonb
    ),
    'settings', q.settings,
    'created_at', q.created_at,
    'updated_at', q.updated_at
  )
  INTO v_result
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permission to anonymous users (for share links)
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- 6. Allow anonymous users to submit quiz attempts
DROP POLICY IF EXISTS "Allow anonymous quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Allow anonymous quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 7. Allow anonymous users to insert responses
DROP POLICY IF EXISTS "Allow anonymous responses" ON public.responses;
CREATE POLICY "Allow anonymous responses"
  ON public.responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 8. Create secure analytics function with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_quiz_analytics(p_quiz_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check if user owns the quiz (if user_id provided)
  IF p_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = p_quiz_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view analytics for this quiz';
  END IF;

  -- Get basic analytics
  SELECT jsonb_build_object(
    'totalAttempts', COALESCE(COUNT(*), 0),
    'averageScore', COALESCE(AVG(score), 0),
    'passRate', COALESCE(
      COUNT(CASE WHEN passed THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
      0
    ),
    'averageTimeSpent', COALESCE(AVG(time_spent), 0)
  ) INTO v_result
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions for analytics function
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Complete 404 fix applied successfully! Share links and analytics should now work properly.';
END $$;
