import { useState } from 'react';
import { Brain, Database, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

const SQL_SCHEMA = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{
    "timeLimit": null,
    "shuffleQuestions": false,
    "shuffleAnswers": false,
    "showResults": true,
    "passingScore": 70
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table (for question bank)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'true-false', 'short-answer')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table
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
  time_spent INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for quizzes table
CREATE POLICY "Users can view their own quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for questions table
CREATE POLICY "Users can view their own questions"
  ON questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questions"
  ON questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON questions FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for quiz_attempts table
-- Quiz creators can view attempts for their quizzes
CREATE POLICY "Quiz creators can view attempts"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_attempts.quiz_id
      AND quizzes.user_id = auth.uid()
    )
  );

-- Anyone can submit an attempt (for public quiz taking)
CREATE POLICY "Anyone can create quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();`;

export function DatabaseSetup() {
  const [copied, setCopied] = useState(false);

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/lqgtjmndgfuyabnghgdy/editor', '_blank');
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-12 h-12 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">Quizify</h1>
          </div>
          <p className="text-gray-600">One-time database setup required</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-indigo-600" />
              <CardTitle className="text-2xl">Database Setup Required</CardTitle>
            </div>
            <CardDescription>
              Your Supabase project needs to be initialized with the required database tables.
              Follow these simple steps to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Copy the SQL Schema</h3>
                <p className="text-gray-600 mb-3">
                  Click the button below to copy the database schema to your clipboard.
                </p>
                <Button onClick={copySQL} variant="outline" className="w-full sm:w-auto">
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy SQL Schema
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Open Supabase SQL Editor</h3>
                <p className="text-gray-600 mb-3">
                  Click below to open your Supabase project's SQL Editor in a new tab.
                </p>
                <Button onClick={openSupabase} className="w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open SQL Editor
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Run the SQL</h3>
                <div className="space-y-2 text-gray-600">
                  <p>In the Supabase SQL Editor:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click "New Query" button</li>
                    <li>Paste the copied SQL schema</li>
                    <li>Click "Run" button (or press Ctrl/Cmd + Enter)</li>
                    <li>Wait for confirmation that the query executed successfully</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Reload This Page</h3>
                <p className="text-gray-600 mb-3">
                  Once the SQL has been executed successfully, click the button below to reload and start using Quizify!
                </p>
                <Button onClick={reloadPage} size="lg">
                  Reload Page
                </Button>
              </div>
            </div>

            {/* SQL Preview */}
            <div className="border-t pt-6">
              <details className="group">
                <summary className="cursor-pointer font-semibold text-gray-700 hover:text-indigo-600 flex items-center justify-between">
                  <span>Preview SQL Schema</span>
                  <span className="text-sm text-gray-500">Click to expand</span>
                </summary>
                <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="text-xs sm:text-sm">
                    <code>{SQL_SCHEMA}</code>
                  </pre>
                </div>
              </details>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Need help?</strong> The SQL schema is also available in the{' '}
                <code className="bg-blue-100 px-1 py-0.5 rounded">/supabase/schema.sql</code>{' '}
                file in your project.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
