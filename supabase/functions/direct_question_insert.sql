-- Direct question insert function to bypass PostgREST cache
CREATE OR REPLACE FUNCTION insert_question_direct(
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
  -- Direct insert bypassing PostgREST cache completely
  RETURN QUERY
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
    
  -- Log the successful insert
  RAISE LOG 'Direct question insert completed for user % at %', p_user_id, NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_question_direct TO authenticated;
