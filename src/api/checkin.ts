import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { normalizeUserIdFields } from '@/services/backend/userId'
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

function normalizeCheckin(row: Checkin) {
  return normalizeUserIdFields(row, ['user_id'])
}

export async function getTodayCheckin() {
  return getCheckinByDate(getLocalDateString())
}

export async function getCheckinByDate(date: string) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', date)
      .maybeSingle(),
    '读取打卡',
  )
  return data ? normalizeCheckin(data as unknown as Checkin) : null
}

export async function getRecentCheckins(limit = 7) {
  const userId = await getAuthenticatedUserId()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 90)
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(safeLimit),
    '读取最近打卡',
  )
  return (data as unknown as Checkin[]).map(normalizeCheckin)
}

export async function getCheckinsBetween(startDate: string, endDate: string) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate)
      .order('checkin_date', { ascending: true }),
    '读取打卡趋势',
  )
  return (data as unknown as Checkin[]).map(normalizeCheckin)
}

export async function getCheckinsForUserBetween(userId: string, startDate: string, endDate: string) {
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate)
      .order('checkin_date', { ascending: true }),
    '读取家庭戒烟趋势',
  )
  return (data as unknown as Checkin[]).map(normalizeCheckin)
}

export async function createCheckin(input: CreateCheckinInput) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .insert({ ...input, user_id: userId })
      .select('*')
      .single(),
    '创建打卡',
  )
  return normalizeCheckin(data as unknown as Checkin)
}

export async function updateCheckin(id: string, input: UpdateCheckinInput) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single(),
    '更新打卡',
  )
  return normalizeCheckin(data as unknown as Checkin)
}
