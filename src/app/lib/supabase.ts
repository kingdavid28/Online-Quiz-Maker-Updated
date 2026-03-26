import { createClient } from '@supabase/supabase-js';

// Required environment variables
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!projectId || !publicAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables. Please set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Always use online production mode
const useLocalMode = false;

// Create Supabase client with validated credentials
export const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

export const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a728d49f`;

export { hasSupabaseCredentials };