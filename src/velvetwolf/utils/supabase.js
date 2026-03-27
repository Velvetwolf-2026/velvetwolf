import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// console.log("LOCAL ENVIRONMENT:", import.meta.env.VITE_PROFILE);
// console.log(import.meta.env);

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing Supabase env vars — check .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,       // keeps user logged in across page refreshes
    detectSessionInUrl: true,      // picks up OAuth redirect tokens
  },
});