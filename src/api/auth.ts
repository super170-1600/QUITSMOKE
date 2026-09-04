import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { requireSupabaseClient } from '@/services/supabase'

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await requireSupabaseClient().auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await requireSupabaseClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await requireSupabaseClient().auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await requireSupabaseClient().auth.getSession()
  if (error) throw error
  return data.session
}

export function subscribeToAuthState(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return requireSupabaseClient().auth.onAuthStateChange(listener).data.subscription
}
