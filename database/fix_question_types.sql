-- =====================================================
-- Fix Question Types Migration
-- =====================================================
-- This script fixes hyphenated question types to use underscores

-- Update question_bank table
UPDATE question_bank 
SET question_type = REPLACE(question_type, '-', '_')
WHERE question_type IN ('multiple-choice', 'true-false', 'short-answer');

-- Update questions table (quiz questions)
UPDATE questions 
SET question_type = REPLACE(question_type, '-', '_')
WHERE question_type IN ('multiple-choice', 'true-false', 'short-answer');

-- Verify the changes
SELECT 
  'question_bank' as table_name,
  question_type,
  COUNT(*) as count
FROM question_bank 
GROUP BY question_type

UNION ALL

SELECT 
  'questions' as table_name,
  question_type,
  COUNT(*) as count
FROM questions 
GROUP BY question_type
ORDER BY table_name, question_type;
