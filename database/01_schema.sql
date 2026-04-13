-- =====================================================
-- Online Quiz Maker - Complete Database Schema
-- =====================================================
-- This file contains the complete database schema setup
-- Run this in Supabase SQL Editor to set up the database

-- =====================================================
-- Core Tables
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question Bank Table - Central repository for reusable questions
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  tags TEXT[],
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes Table - Main quiz definitions
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "timeLimit": null,
    "shuffleQuestions": false,
    "shuffleAnswers": false,
    "showResults": true,
    "passingScore": 70
  }'::jsonb,
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table - Questions within specific quizzes
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Attempts Table - User quiz submissions
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL, -- in seconds
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Question Bank Indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_user_id ON question_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank(created_at DESC);

-- Quizzes Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_public ON quizzes(is_public);
CREATE INDEX IF NOT EXISTS idx_quizzes_share_token ON quizzes(share_token);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Questions Indexes
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(quiz_id, order_index);

-- Quiz Attempts Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_email ON quiz_attempts(user_email);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Question Bank RLS Policies
CREATE POLICY "Users can view own question bank" ON question_bank FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question bank" ON question_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own question bank" ON question_bank FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own question bank" ON question_bank FOR DELETE USING (auth.uid() = user_id);

-- Quizzes RLS Policies
CREATE POLICY "Users can view own quizzes" ON quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public quizzes" ON quizzes FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON quizzes FOR DELETE USING (auth.uid() = user_id);

-- Questions RLS Policies
CREATE POLICY "Users can view quiz questions" ON questions FOR SELECT USING (auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id));
CREATE POLICY "Users can manage quiz questions" ON questions FOR ALL USING (auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_id));

-- Quiz Attempts RLS Policies
CREATE POLICY "Anyone can view quiz attempts" ON quiz_attempts FOR SELECT;
CREATE POLICY "Anyone can insert quiz attempts" ON quiz_attempts FOR INSERT;

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample data for testing
/*
-- Sample Question Bank Data
INSERT INTO question_bank (user_id, question_type, question_text, options, correct_answer, points, category, difficulty) VALUES
  (auth.uid(), 'multiple_choice', 'What is the capital of France?', '["London", "Paris", "Berlin", "Madrid"]', '1', 1, 'Geography', 'easy'),
  (auth.uid(), 'true_false', 'The Earth is flat.', NULL, 'false', 1, 'Science', 'easy'),
  (auth.uid(), 'short_answer', 'What is 2 + 2?', NULL, '4', 1, 'Math', 'easy');

-- Sample Quiz
INSERT INTO quizzes (user_id, title, description) VALUES
  (auth.uid(), 'Sample Quiz', 'A sample quiz for testing');

-- Sample Questions in Quiz
INSERT INTO questions (quiz_id, question_type, question_text, options, correct_answer, points, order_index) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Sample Quiz' LIMIT 1), 'multiple_choice', 'What is 2 + 2?', '["3", "4", "5", "6"]', '1', 1, 0);
*/

-- =====================================================
-- Validation
-- =====================================================

-- Check if all tables were created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY table_name, ordinal_position;

-- Check if indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('profiles', 'question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename, indexname;

-- Check if RLS policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'question_bank', 'quizzes', 'questions', 'quiz_attempts')
ORDER BY tablename, policyname;

-- =====================================================
-- Setup Complete
-- =====================================================

-- The database schema is now ready for use!
-- Tables: profiles, question_bank, quizzes, questions, quiz_attempts
-- Security: RLS policies enabled
-- Performance: Indexes created
-- Triggers: updated_at timestamps automated
