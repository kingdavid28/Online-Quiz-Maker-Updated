import { createClient } from '@supabase/supabase-js';

// Use environment variables for deployment
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "lqgtjmndgfuyabnghgdy";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ3RqbW5kZ2Z1eWFibmdoZ2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODcwMzgsImV4cCI6MjA4ODI2MzAzOH0.VM22IfOEocjCgV_gDkCnchrKykWJ72u7YLrmrJp7FyM";

// Always use online production mode
const useLocalMode = false;

// Check if we have valid credentials for production mode
const hasSupabaseCredentials = !!(projectId && publicAnonKey);

// Create a dummy client for type compatibility
const dummyClient = {
  auth: {
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('No Supabase credentials') }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('No Supabase credentials') }),
    signOut: async () => ({ error: new Error('No Supabase credentials') }),
    getSession: async () => ({ data: { session: null }, error: new Error('No Supabase credentials') }),
    getUser: async () => ({ data: { user: null }, error: new Error('No Supabase credentials') }),
  },
  from: () => ({
    select: () => ({ data: null, error: new Error('No Supabase credentials') }),
    insert: () => ({ data: null, error: new Error('No Supabase credentials') }),
    update: () => ({ data: null, error: new Error('No Supabase credentials') }),
    delete: () => ({ error: new Error('No Supabase credentials') }),
  }),
} as any;

export const supabase = hasSupabaseCredentials 
  ? createClient(`https://${projectId}.supabase.co`, publicAnonKey)
  : dummyClient;

export const API_URL = hasSupabaseCredentials 
  ? `https://${projectId}.supabase.co/functions/v1/make-server-a728d49f`
  : '';

export { hasSupabaseCredentials };