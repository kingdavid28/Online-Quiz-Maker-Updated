-- COMPLETE SUPABASE SETUP FOR QUIZIFY
-- Paste this entire file into Supabase SQL Editor

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.create_quiz_direct(UUID, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.update_quiz_with_questions(UUID, UUID, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.get_quiz_with_questions(UUID);
DROP FUNCTION IF EXISTS public.get_user_quizzes(UUID);
DROP FUNCTION IF EXISTS public.get_quiz_by_id(TEXT);

-- Function to create a quiz with questions in a single transaction
CREATE OR REPLACE FUNCTION public.create_quiz_direct(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}',
  p_questions JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_quiz_id UUID;
  v_question JSONB;
  v_order_index INTEGER := 0;
  v_questions_array JSONB := '[]'::jsonb;
BEGIN
  -- Insert the quiz
  INSERT INTO public.quizzes (
    user_id,
    title,
    description,
    settings,
    share_link
  ) VALUES (
    p_user_id,
    p_title,
    p_description,
    COALESCE(p_settings, '{}'::jsonb),
    public.generate_share_link()
  )
  RETURNING id INTO v_quiz_id;

  -- Insert questions if provided and is an array
  IF p_questions IS NOT NULL AND jsonb_typeof(p_questions) = 'array' AND jsonb_array_length(p_questions) > 0 THEN
    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
      -- Convert frontend question format to database format
      -- Handle both 'question' and 'question_text' fields
      INSERT INTO public.questions (
        quiz_id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        points,
        order_index
      ) VALUES (
        v_quiz_id,
        COALESCE(v_question->>'question', v_question->>'question_text', ''),
        CASE 
          WHEN v_question->>'type' = 'multiple-choice' THEN 'multiple_choice'
          WHEN v_question->>'type' = 'true-false' THEN 'true_false'
          WHEN v_question->>'type' = 'short-answer' THEN 'short_answer'
          WHEN v_question->>'question_type' = 'multiple_choice' THEN 'multiple_choice'
          WHEN v_question->>'question_type' = 'true_false' THEN 'true_false'
          WHEN v_question->>'question_type' = 'short_answer' THEN 'short_answer'
          ELSE 'multiple_choice'
        END,
        CASE 
          WHEN v_question->'options' IS NOT NULL THEN v_question->'options'
          ELSE '[]'::jsonb
        END,
        COALESCE(v_question->>'correctAnswer', v_question->>'correct_answer', ''),
        COALESCE(v_question->>'explanation', ''),
        COALESCE((v_question->>'points')::INTEGER, 1),
        v_order_index
      );
      v_order_index := v_order_index + 1;
    END LOOP;
  END IF;

  -- Build questions array for response
  SELECT COALESCE(jsonb_agg(
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
  ), '[]'::jsonb)
  INTO v_questions_array
  FROM public.questions
  WHERE quiz_id = v_quiz_id;

  -- Return quiz with questions
  RETURN (
    SELECT jsonb_build_object(
      'id', q.id,
      'user_id', q.user_id,
      'title', q.title,
      'description', q.description,
      'questions', v_questions_array,
      'settings', q.settings,
      'created_at', q.created_at,
      'updated_at', q.updated_at
    )
    FROM public.quizzes q
    WHERE q.id = v_quiz_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's quizzes with question counts
CREATE OR REPLACE FUNCTION public.get_user_quizzes(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
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
        ORDER BY q.updated_at DESC
      )
      FROM public.quizzes q
      WHERE q.user_id = p_user_id
    ),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quiz by ID with questions
CREATE OR REPLACE FUNCTION public.get_quiz_by_id(p_quiz_id UUID)
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

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update quiz with questions
CREATE OR REPLACE FUNCTION public.update_quiz_with_questions(
  p_quiz_id UUID,
  p_user_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL,
  p_questions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_question JSONB;
  v_order_index INTEGER := 0;
  v_questions_array JSONB := '[]'::jsonb;
BEGIN
  -- Check if user owns the quiz
  IF NOT EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE id = p_quiz_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied';
  END IF;

  -- Update quiz details
  UPDATE public.quizzes
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_quiz_id;

  -- Update questions if provided and is an array
  IF p_questions IS NOT NULL AND jsonb_typeof(p_questions) = 'array' THEN
    -- Delete existing questions
    DELETE FROM public.questions WHERE quiz_id = p_quiz_id;

    -- Insert new questions if array has elements
    IF jsonb_array_length(p_questions) > 0 THEN
      FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
      LOOP
        INSERT INTO public.questions (
          quiz_id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          points,
          order_index
        ) VALUES (
          p_quiz_id,
          COALESCE(v_question->>'question', v_question->>'question_text', ''),
          CASE 
            WHEN v_question->>'type' = 'multiple-choice' THEN 'multiple_choice'
            WHEN v_question->>'type' = 'true-false' THEN 'true_false'
            WHEN v_question->>'type' = 'short-answer' THEN 'short_answer'
            WHEN v_question->>'question_type' = 'multiple_choice' THEN 'multiple_choice'
            WHEN v_question->>'question_type' = 'true_false' THEN 'true_false'
            WHEN v_question->>'question_type' = 'short_answer' THEN 'short_answer'
            ELSE 'multiple_choice'
          END,
          CASE 
            WHEN v_question->'options' IS NOT NULL THEN v_question->'options'
            ELSE '[]'::jsonb
          END,
          COALESCE(v_question->>'correctAnswer', v_question->>'correct_answer', ''),
          COALESCE(v_question->>'explanation', ''),
          COALESCE((v_question->>'points')::INTEGER, 1),
          v_order_index
        );
        v_order_index := v_order_index + 1;
      END LOOP;
    END IF;
  END IF;

  -- Build questions array for response
  SELECT COALESCE(jsonb_agg(
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
  ), '[]'::jsonb)
  INTO v_questions_array
  FROM public.questions
  WHERE quiz_id = p_quiz_id;

  -- Return updated quiz with questions
  RETURN (
    SELECT jsonb_build_object(
      'id', q.id,
      'user_id', q.user_id,
      'title', q.title,
      'description', q.description,
      'questions', v_questions_array,
      'settings', q.settings,
      'created_at', q.created_at,
      'updated_at', q.updated_at
    )
    FROM public.quizzes q
    WHERE q.id = p_quiz_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_quiz_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quizzes TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_by_id TO anon;
GRANT EXECUTE ON FUNCTION public.update_quiz_with_questions TO authenticated;