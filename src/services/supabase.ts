import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export function requireSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase 未配置，请检查 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。')
  }

  return supabase
}
