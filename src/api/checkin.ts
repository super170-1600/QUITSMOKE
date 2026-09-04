import { requireSupabaseClient } from '@/services/supabase'
import type { Checkin } from '@/types/database'
import { getLocalDateString } from '@/utils/date'

export interface CreateCheckinInput {
  checkin_date: string
  cigarettes: number
  craving_level: number
  note: string | null
}

export interface UpdateCheckinInput {
  cigarettes: number
  craving_level: number
  note: string | null
}

async function getAuthenticatedUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('登录状态已失效，请重新登录。')
  return data.user.id
}

export async function getTodayCheckin() {
  return getCheckinByDate(getLocalDateString())
}

export async function getCheckinByDate(date: string) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', date)
    .maybeSingle()
  if (error) throw error
  return data as Checkin | null
}

export async function getRecentCheckins(limit = 7) {
  const userId = await getAuthenticatedUserId()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 90)
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(safeLimit)
  if (error) throw error
  return data as Checkin[]
}

export async function getCheckinsBetween(startDate: string, endDate: string) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', endDate)
    .order('checkin_date', { ascending: true })
  if (error) throw error
  return data as Checkin[]
}

export async function getCheckinsForUserBetween(userId: string, startDate: string, endDate: string) {
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', endDate)
    .order('checkin_date', { ascending: true })
  if (error) throw error
  return data as Checkin[]
}

export async function createCheckin(input: CreateCheckinInput) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Checkin
}

export async function updateCheckin(id: string, input: UpdateCheckinInput) {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Checkin
}
