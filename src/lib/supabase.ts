import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const isPlaceholder = !rawUrl || !rawUrl.startsWith('http') || rawUrl.includes('your_supabase_project_url')

const supabaseUrl = isPlaceholder ? 'https://placeholder-url.supabase.co' : rawUrl
const supabaseAnonKey = isPlaceholder || !rawKey || rawKey.includes('your_supabase_anon_key') ? 'placeholder-key' : rawKey

// Singleton supabase client for client-side and public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client to bypass RLS database policies
const hasServiceKey = rawServiceKey && !rawServiceKey.includes('your_supabase_service_role_key')
export const supabaseAdmin = createClient(
  supabaseUrl,
  hasServiceKey ? rawServiceKey : supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)
