import { NextResponse } from 'next/server'

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const check = (val: string | undefined, placeholder: string) => {
    if (!val) return 'MISSING'
    if (val.includes(placeholder)) return 'PLACEHOLDER'
    return `PRESENT (length: ${val.length}, starts with: ${val.substring(0, 8)}...)`
  }

  return NextResponse.json({
    GEMINI_API_KEY: check(geminiKey, 'your_gemini_api_key'),
    NEXT_PUBLIC_SUPABASE_URL: check(supabaseUrl, 'your_supabase_project_url'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: check(supabaseAnon, 'your_supabase_anon_key'),
    SUPABASE_SERVICE_ROLE_KEY: check(serviceKey, 'your_supabase_service_role_key'),
  })
}
