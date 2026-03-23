-- FIX FOR SHARE LINK - Allows public access to quizzes via share links

-- 1. Create RLS policy to allow public read access to quizzes
DROP POLICY IF EXISTS "Allow public read access to quizzes" ON public.quizzes;
CREATE POLICY "Allow public read access to quizzes"
  ON public.quizzes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Create RLS policy to allow public read access to questions
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions"
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Create public function to get quiz with questions (no auth required)
DROP FUNCTION IF EXISTS public.get_public_quiz(UUID);
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

-- 4. Grant execute permission to anonymous users (for share links)
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_quiz TO authenticated;

-- 5. Allow anonymous users to submit quiz attempts
DROP POLICY IF EXISTS "Allow anonymous quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Allow anonymous quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. Allow anonymous users to insert responses
DROP POLICY IF EXISTS "Allow anonymous responses" ON public.responses;
CREATE POLICY "Allow anonymous responses"
  ON public.responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Share link fix applied successfully! Public access enabled for quizzes.';
END $$;
