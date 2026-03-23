import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Database, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseDiagnostic } from './DatabaseDiagnostic';
import { QuickFixGuide } from './QuickFixGuide';

export function DatabaseSetupHelper() {
  const [copied, setCopied] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [copiedComplete, setCopiedComplete] = useState(false);

  const completeFixSQL = `-- COMPLETE FIX - Recreates quizzes table correctly
-- WARNING: This deletes existing quiz data!
-- If you have quizzes, export them first from Supabase Table Editor

DROP TABLE IF EXISTS public.quizzes CASCADE;

CREATE TABLE public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_quizzes_user_id ON public.quizzes(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TABLE IF EXISTS public.quiz_attempts CASCADE;

CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Quiz owners can view attempts" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_attempts.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );
CREATE POLICY "Anyone can insert attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);

NOTIFY pgrst, 'reload schema';`;

  const quickFixSQL = `-- Quick fix for missing columns
-- Run this first, then reload schema

ALTER TABLE public.quizzes 
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- Verify columns exist
DO $$
DECLARE
  has_questions BOOLEAN;
  has_settings BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'questions'
  ) INTO has_questions;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes' 
    AND column_name = 'settings'
  ) INTO has_settings;

  IF has_questions AND has_settings THEN
    RAISE NOTICE 'SUCCESS: Both questions and settings columns exist!';
  ELSE
    RAISE EXCEPTION 'ERROR: Columns were not created properly';
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';`;

  const sqlCode = `-- Quizify Database Schema
-- Copy and run this in your Supabase SQL Editor
-- Safe to run multiple times - will update existing schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Quizzes table (stores questions as JSONB)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quizzes' AND column_name = 'questions'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN questions JSONB NOT NULL DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quizzes' AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';
  END IF;
END $$;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;

CREATE POLICY "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Quiz owners can view attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Anyone can insert attempts" ON public.quiz_attempts;

CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Quiz owners can view attempts" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_attempts.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );
CREATE POLICY "Anyone can insert attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (true);

-- Question bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own questions" ON public.question_bank;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.question_bank;
DROP POLICY IF EXISTS "Users can update own questions" ON public.question_bank;
DROP POLICY IF EXISTS "Users can delete own questions" ON public.question_bank;

CREATE POLICY "Users can view own questions" ON public.question_bank
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questions" ON public.question_bank
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.question_bank
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.question_bank
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_user_id ON public.question_bank(user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
DROP TRIGGER IF EXISTS update_question_bank_updated_at ON public.question_bank;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON public.question_bank
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlCode);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  const handleCopyFix = async () => {
    try {
      await navigator.clipboard.writeText(quickFixSQL);
      setCopiedFix(true);
      toast.success('Quick fix SQL copied to clipboard!');
      setTimeout(() => setCopiedFix(false), 3000);
    } catch (err) {
      toast.error('Failed to copy quick fix SQL');
    }
  };

  const handleCopyComplete = async () => {
    try {
      await navigator.clipboard.writeText(completeFixSQL);
      setCopiedComplete(true);
      toast.success('Complete fix SQL copied to clipboard!');
      setTimeout(() => setCopiedComplete(false), 3000);
    } catch (err) {
      toast.error('Failed to copy complete fix SQL');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Database Setup Required</CardTitle>
              <CardDescription className="text-base mt-2">
                Your Quizify database tables need to be created before you can start using the app.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Quick Setup (2 minutes)
            </h3>
            
            <div className="space-y-4 pl-7">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Copy the SQL Schema</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 font-mono">database-setup.sql</span>
                      <Button 
                        onClick={handleCopy} 
                        size="sm" 
                        variant="outline"
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy SQL
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs overflow-auto max-h-48 bg-white p-3 rounded border">
                      {sqlCode}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Open Supabase SQL Editor</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                    <li>Go to your Supabase Dashboard</li>
                    <li>Select your project</li>
                    <li>Click "SQL Editor" in the left sidebar</li>
                    <li>Click "New query"</li>
                  </ul>
                  <Button 
                    onClick={openSupabase}
                    variant="outline"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Supabase Dashboard
                  </Button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Run the SQL</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Paste the SQL into the editor</li>
                    <li>Click "Run" (or press Ctrl+Enter / Cmd+Enter)</li>
                    <li>Wait for the success message</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 - CRITICAL STEP */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-semibold">
                  4
                </div>
                <div className="flex-1">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-medium mb-2 text-red-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      CRITICAL: Manually Reload Schema Cache
                    </h4>
                    <p className="text-sm text-red-800 mb-2 font-semibold">
                      The NOTIFY command doesn't always work. You MUST manually reload the schema:
                    </p>
                    <ul className="text-sm text-red-900 space-y-1 list-decimal list-inside">
                      <li>Go to <strong>Settings</strong> → <strong>API</strong> in Supabase</li>
                      <li>Scroll down to find <strong>"Reload schema"</strong> button</li>
                      <li>Click it and wait for confirmation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
                  5
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Refresh this page</h4>
                  <p className="text-sm text-gray-600">
                    After reloading the schema, refresh your browser and you're ready to go!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">What does this SQL do?</p>
                <p>
                  It creates the database tables (quizzes, questions, attempts, profiles) and sets up 
                  Row Level Security policies to protect your data. It's safe to run multiple times.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Still Getting Errors?
            </h3>

            {/* Database Diagnostic Tool */}
            <div className="mb-6">
              <DatabaseDiagnostic />
            </div>

            {/* Quick Fix Guide */}
            <div className="mb-6">
              <QuickFixGuide />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900 mb-3">
                If you already ran the SQL above but still see "Could not find the 'questions' column" error, 
                run this quick fix to add missing columns and reload the schema cache:
              </p>
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-mono">quick-fix.sql</span>
                  <Button 
                    onClick={handleCopyFix} 
                    size="sm" 
                    variant="outline"
                    className="gap-2"
                  >
                    {copiedFix ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Quick Fix
                      </>
                    )}
                  </Button>
                </div>
                <pre className="text-xs overflow-auto max-h-32 bg-gray-50 p-3 rounded border">
                  {quickFixSQL}
                </pre>
              </div>
              <p className="text-xs text-orange-800 mt-3">
                After running this, wait 10 seconds, then refresh this page.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-900 mb-3">
                If the quick fix doesn't work and you have existing quizzes, run this complete fix to recreate the quizzes table correctly. This will delete existing quiz data, so export them first from the Supabase Table Editor:
              </p>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-mono">complete-fix.sql</span>
                  <Button 
                    onClick={handleCopyComplete} 
                    size="sm" 
                    variant="outline"
                    className="gap-2"
                  >
                    {copiedComplete ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Complete Fix
                      </>
                    )}
                  </Button>
                </div>
                <pre className="text-xs overflow-auto max-h-48 bg-gray-50 p-3 rounded border">
                  {completeFixSQL}
                </pre>
              </div>
              <p className="text-xs text-red-800 mt-3">
                After running this, wait 10 seconds, then refresh this page.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            <Button 
              onClick={() => window.location.reload()} 
              size="lg"
              className="gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              I've Set Up the Database - Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}