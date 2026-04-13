-- Fix question_bank RPC function
-- Run this in Supabase SQL Editor

-- Drop old function and create new one for question_bank
DROP FUNCTION IF EXISTS insert_question_direct(uuid,text,text,jsonb,text,integer);

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
END;
$$;

GRANT EXECUTE ON FUNCTION insert_question_direct TO authenticated;
