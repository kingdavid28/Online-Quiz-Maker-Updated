-- RPC function to save question when schema cache issues occur
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
  -- Insert the question and return the result
  RETURN QUERY
  INSERT INTO questions (
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
  )
  RETURNING 
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_question_to_bank TO authenticated;
