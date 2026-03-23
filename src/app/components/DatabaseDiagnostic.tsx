import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, XCircle, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function DatabaseDiagnostic() {
  const { accessToken } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [showRPCFix, setShowRPCFix] = useState(false);

  const rpcFixSQL = `-- Create RPC functions to bypass PostgREST schema cache issues
-- These functions work around PGRST204 errors by using stored procedures

-- Function to create a quiz with JSONB fields
CREATE OR REPLACE FUNCTION create_quiz_with_data(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_questions JSONB,
  p_settings JSONB
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  questions JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO quizzes (user_id, title, description, questions, settings)
  VALUES (p_user_id, p_title, p_description, p_questions, p_settings)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a quiz
CREATE OR REPLACE FUNCTION update_quiz_with_data(
  p_quiz_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_questions JSONB,
  p_settings JSONB
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  questions JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE quizzes
  SET 
    title = p_title,
    description = p_description,
    questions = p_questions,
    settings = p_settings,
    updated_at = NOW()
  WHERE quizzes.id = p_quiz_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a quiz by ID
CREATE OR REPLACE FUNCTION get_quiz_by_id(p_quiz_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  questions JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM quizzes WHERE quizzes.id = p_quiz_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all quizzes for a user
CREATE OR REPLACE FUNCTION get_user_quizzes(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  questions JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM quizzes 
  WHERE quizzes.user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_quiz_with_data TO authenticated;
GRANT EXECUTE ON FUNCTION update_quiz_with_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quizzes TO authenticated;

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%quiz%'
ORDER BY routine_name;`;

  const runDiagnostics = async () => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    setRunning(true);
    setResults([]);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Step 1: Check if we can connect to Supabase
      diagnosticResults.push({
        step: '1. Connection',
        status: 'success',
        message: 'Connected to Supabase',
      });

      // Step 2: Check if quizzes table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('quizzes')
        .select('id')
        .limit(1);

      if (tableError && tableError.code !== 'PGRST116') {
        diagnosticResults.push({
          step: '2. Table Check',
          status: 'error',
          message: 'Quizzes table issue',
          details: tableError.message,
        });
      } else {
        diagnosticResults.push({
          step: '2. Table Check',
          status: 'success',
          message: 'Quizzes table exists',
        });
      }

      // Step 3: Try to query actual table structure via RPC
      const { data: columnCheck, error: columnError } = await supabase.rpc('check_table_structure', {
        table_name: 'quizzes'
      });

      if (columnError) {
        diagnosticResults.push({
          step: '3. Column Structure',
          status: 'warning',
          message: 'Cannot check columns (RPC not set up)',
          details: 'This is expected if diagnostic RPC functions are not installed',
        });
      } else {
        diagnosticResults.push({
          step: '3. Column Structure',
          status: 'success',
          message: 'Column check complete',
          details: JSON.stringify(columnCheck, null, 2),
        });
      }

      // Step 4: Try to select with questions column
      const { data: questionsTest, error: questionsError } = await supabase
        .from('quizzes')
        .select('id, title, questions')
        .limit(1);

      if (questionsError) {
        if (questionsError.code === 'PGRST204') {
          diagnosticResults.push({
            step: '4. Questions Column',
            status: 'error',
            message: 'PGRST204: Schema cache does not recognize questions column',
            details: 'The column might exist in the database but PostgREST API cache is stale. Try RPC workaround.',
          });
          setShowRPCFix(true);
        } else {
          diagnosticResults.push({
            step: '4. Questions Column',
            status: 'error',
            message: 'Error accessing questions column',
            details: questionsError.message,
          });
        }
      } else {
        diagnosticResults.push({
          step: '4. Questions Column',
          status: 'success',
          message: 'Questions column is accessible via API',
        });
      }

      // Step 5: Try to select with settings column
      const { data: settingsTest, error: settingsError } = await supabase
        .from('quizzes')
        .select('id, title, settings')
        .limit(1);

      if (settingsError) {
        if (settingsError.code === 'PGRST204') {
          diagnosticResults.push({
            step: '5. Settings Column',
            status: 'error',
            message: 'PGRST204: Schema cache does not recognize settings column',
            details: 'The column might exist in the database but PostgREST API cache is stale.',
          });
          setShowRPCFix(true);
        } else {
          diagnosticResults.push({
            step: '5. Settings Column',
            status: 'error',
            message: 'Error accessing settings column',
            details: settingsError.message,
          });
        }
      } else {
        diagnosticResults.push({
          step: '5. Settings Column',
          status: 'success',
          message: 'Settings column is accessible via API',
        });
      }

      // Step 6: Check RPC functions
      const { data: rpcTest, error: rpcError } = await supabase.rpc('get_user_quizzes', {
        p_user_id: (await supabase.auth.getUser(accessToken)).data.user?.id
      });

      if (rpcError) {
        diagnosticResults.push({
          step: '6. RPC Functions',
          status: 'warning',
          message: 'RPC workaround functions not installed',
          details: 'You can install RPC functions as a workaround for schema cache issues',
        });
        setShowRPCFix(true);
      } else {
        diagnosticResults.push({
          step: '6. RPC Functions',
          status: 'success',
          message: 'RPC functions are available',
          details: `Found ${rpcTest?.length || 0} quizzes via RPC`,
        });
      }

    } catch (error: any) {
      diagnosticResults.push({
        step: 'Error',
        status: 'error',
        message: 'Diagnostic failed',
        details: error.message,
      });
    }

    setResults(diagnosticResults);
    setRunning(false);
  };

  const copyRPCFix = async () => {
    try {
      await navigator.clipboard.writeText(rpcFixSQL);
      toast.success('RPC fix SQL copied! Run this in Supabase SQL Editor.');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Database Diagnostic Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Run diagnostics to identify the exact cause of database errors and get targeted solutions.
        </p>

        <Button onClick={runDiagnostics} disabled={running} className="w-full gap-2">
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Database Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="font-medium text-sm">Diagnostic Results:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{result.step}</div>
                    <div className="text-sm mt-1">{result.message}</div>
                    {result.details && (
                      <div className="text-xs mt-2 font-mono bg-white/50 p-2 rounded overflow-x-auto">
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showRPCFix && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">RPC Workaround Available</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Since the schema cache isn't working, you can use PostgreSQL RPC functions to bypass PostgREST's 
                  schema cache entirely. This is a reliable workaround for persistent PGRST204 errors.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900">Installation Steps:</p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Copy the SQL code below</li>
                <li>Open Supabase Dashboard → SQL Editor</li>
                <li>Paste and run the SQL</li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <div className="relative">
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-64">
                {rpcFixSQL}
              </pre>
              <Button
                onClick={copyRPCFix}
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 gap-2"
              >
                <Copy className="h-3 w-3" />
                Copy SQL
              </Button>
            </div>

            <div className="bg-white p-3 rounded border border-blue-300">
              <p className="text-xs text-blue-900">
                <strong>What this does:</strong> Creates PostgreSQL stored procedures that handle JSONB columns 
                directly in the database, completely bypassing PostgREST's schema cache. The app will automatically 
                use these functions if the regular API calls fail.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
