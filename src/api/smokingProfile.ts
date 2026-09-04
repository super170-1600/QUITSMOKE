import { requireSupabaseClient } from '@/services/supabase'
import type { SmokingProfile } from '@/types/database'

export interface CreateSmokingProfileInput {
  quit_start_date: string
  baseline_daily_cigarettes: number
  cigarettes_per_pack: number
  price_per_pack: number
}

export type UpdateSmokingProfileInput = CreateSmokingProfileInput

async function getAuthenticatedUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('登录状态已失效，请重新登录。')
  return data.user.id
}

export async function getMySmokingProfile() {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('smoking_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as SmokingProfile | null
}

export async function getSmokingProfileByUserId(userId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('smoking_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as SmokingProfile | null
}

export async function createMySmokingProfile(input: CreateSmokingProfileInput) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('smoking_profiles')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as SmokingProfile
}

export async function updateMySmokingProfile(input: UpdateSmokingProfileInput) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('smoking_profiles')
    .update(input)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as SmokingProfile
}
