import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isPlaceholder = !rawUrl || !rawUrl.startsWith('http') || rawUrl.includes('your_supabase_project_url')

const supabaseUrl = isPlaceholder ? 'https://placeholder-url.supabase.co' : rawUrl
const supabaseAnonKey = isPlaceholder || !rawKey || rawKey.includes('your_supabase_anon_key') ? 'placeholder-key' : rawKey

// Singleton supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
