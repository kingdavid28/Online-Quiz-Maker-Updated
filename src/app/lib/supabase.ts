import { createClient } from '@supabase/supabase-js';

// Support both project ID and full URL for flexibility
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine the correct URL
let finalSupabaseUrl: string;
if (supabaseUrl) {
  finalSupabaseUrl = supabaseUrl;
} else if (projectId) {
  finalSupabaseUrl = `https://${projectId}.supabase.co`;
} else {
  throw new Error(
    'Missing required Supabase environment variables. Please set either VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID in your environment.'
  );
}

// Validate environment variables
if (!publicAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables. Please set VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

// Always use online production mode
const useLocalMode = false;

// Create Supabase client with validated credentials
export const supabase = createClient(finalSupabaseUrl, publicAnonKey);

export const API_URL = `${finalSupabaseUrl}/functions/v1/make-server-a728d49f`;