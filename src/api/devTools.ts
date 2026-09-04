import { requireSupabaseClient } from '@/services/supabase'
import type { Checkin } from '@/types/database'

export interface DevCheckinInput {
  checkin_date: string
  cigarettes: number
  craving_level: number
  note: string | null
}

function assertDevToolsEnabled() {
  if (import.meta.env.VITE_ENABLE_DEV_TOOLS !== 'true') {
    throw new Error('测试工具未启用。')
  }
}

async function getAuthenticatedUserId() {
  assertDevToolsEnabled()
  const { data, error } = await requireSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('登录状态已失效，请重新登录。')
  return data.user.id
}

function validateInput(input: DevCheckinInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.checkin_date)) throw new Error('日期格式无效。')
  if (!Number.isInteger(input.cigarettes) || input.cigarettes < 0 || input.cigarettes > 200) throw new Error('吸烟数量必须为 0–200 的整数。')
  if (!Number.isInteger(input.craving_level) || input.craving_level < 1 || input.craving_level > 5) throw new Error('烟瘾程度必须为 1–5。')
  if ((input.note?.length ?? 0) > 300) throw new Error('备注不能超过 300 字。')
}

export async function upsertMyDevCheckin(input: DevCheckinInput) {
  validateInput(input)
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('checkins')
    .upsert({ ...input, user_id: userId }, { onConflict: 'user_id,checkin_date' })
    .select('*')
    .single()
  if (error) throw error
  return data as Checkin
}

export async function ensureMyDevProfileCovers(startDate: string) {
  assertDevToolsEnabled()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('日期格式无效。')
  const userId = await getAuthenticatedUserId()
  const client = requireSupabaseClient()
  const { data: profile, error: readError } = await client
    .from('smoking_profiles')
    .select('quit_start_date')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw readError
  if (!profile) throw new Error('请先完成戒烟设置。')
  if (profile.quit_start_date <= startDate) return false
  const { error: updateError } = await client
    .from('smoking_profiles')
    .update({ quit_start_date: startDate })
    .eq('user_id', userId)
  if (updateError) throw updateError
  return true
}

export async function replaceMyDevCheckins(startDate: string, endDate: string, inputs: DevCheckinInput[]) {
  inputs.forEach(validateInput)
  const userId = await getAuthenticatedUserId()
  const client = requireSupabaseClient()
  const { data, error } = await client
    .from('checkins')
    .upsert(inputs.map((input) => ({ ...input, user_id: userId })), { onConflict: 'user_id,checkin_date' })
    .select('*')
  if (error) throw error
  const includedDates = new Set(inputs.map((input) => input.checkin_date))
  const { data: existing, error: readError } = await client
    .from('checkins')
    .select('id,checkin_date')
    .eq('user_id', userId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', endDate)
  if (readError) throw readError
  const staleIds = existing.filter((row) => !includedDates.has(row.checkin_date)).map((row) => row.id)
  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from('checkins').delete().eq('user_id', userId).in('id', staleIds)
    if (deleteError) throw deleteError
  }
  return data as Checkin[]
}

export async function clearMyDevCheckins() {
  const userId = await getAuthenticatedUserId()
  const { error } = await requireSupabaseClient().from('checkins').delete().eq('user_id', userId)
  if (error) throw error
}
