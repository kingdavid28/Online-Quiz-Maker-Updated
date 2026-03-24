-- SIMPLE FIX FOR QUIZ ANALYTICS SECURITY DEFINER WARNING
-- Run this in Supabase SQL Editor

-- Drop any existing problematic views/functions
DROP VIEW IF EXISTS public.quiz_analytics;
DROP FUNCTION IF EXISTS public.get_quiz_analytics(UUID);

-- Create simple analytics function with SECURITY INVOKER
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_analytics TO anon;

-- Alternative: Remove the function entirely and use direct queries
DROP FUNCTION IF EXISTS public.get_quiz_analytics(UUID);

-- Create RLS policy for direct analytics access
CREATE POLICY "Users can view their own quiz analytics" 
ON public.quiz_attempts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE id = quiz_attempts.quiz_id 
  AND user_id = auth.uid()
));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics security fix applied successfully! SECURITY DEFINER functions replaced with SECURITY INVOKER.';
END $$;
