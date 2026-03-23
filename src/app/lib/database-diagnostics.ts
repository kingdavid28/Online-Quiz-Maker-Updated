import { supabase } from './supabase';

export async function checkDatabaseSchema(accessToken: string) {
  try {
    // Check if quizzes table exists and what columns it has
    const { data: columns, error } = await supabase
      .from('quizzes')
      .select('*')
      .limit(0);

    if (error) {
      return {
        exists: false,
        error: error.message,
        columns: []
      };
    }

    return {
      exists: true,
      error: null,
      columns: columns || []
    };
  } catch (err: any) {
    return {
      exists: false,
      error: err.message,
      columns: []
    };
  }
}

export async function verifyTableStructure(accessToken: string) {
  try {
    // Try to query the information schema
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'quizzes'
    });

    return { data, error };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function fixQuizzesTable(accessToken: string) {
  try {
    // Try to add the missing columns directly
    const { error } = await supabase.rpc('fix_quizzes_table');
    return { success: !error, error };
  } catch (err: any) {
    return { success: false, error: err };
  }
}
