import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_ID'))
// The publishable/anon key is intended for browser use. Never put a service-role key here.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null