import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !publishableKey) {
  console.warn('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  publishableKey || 'placeholder-anon-key'
);
