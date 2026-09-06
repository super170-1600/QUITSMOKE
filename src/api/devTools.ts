import { CHECKIN_COLUMNS } from './columns'
import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { normalizeUserIdFields } from '@/services/backend/userId'
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

function normalizeCheckin(row: Checkin) {
  return normalizeUserIdFields(row, ['user_id'])
}

function validateInput(input: DevCheckinInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.checkin_date)) throw new Error('日期格式无效。')
  if (!Number.isInteger(input.cigarettes) || input.cigarettes < 0 || input.cigarettes > 200) throw new Error('吸烟数量必须为 0–200 的整数。')
  if (!Number.isInteger(input.craving_level) || input.craving_level < 1 || input.craving_level > 5) throw new Error('烟瘾程度必须为 1–5。')
  if ((input.note?.length ?? 0) > 300) throw new Error('备注不能超过 300 字。')
}

export async function upsertMyDevCheckin(input: DevCheckinInput) {
  validateInput(input)
  assertDevToolsEnabled()
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('checkins')
      .upsert({ ...input, user_id: userId }, { onConflict: 'user_id,checkin_date' })
      .select(CHECKIN_COLUMNS)
      .single(),
    '保存测试打卡',
  )
  return normalizeCheckin(data as unknown as Checkin)
}

export async function ensureMyDevProfileCovers(startDate: string) {
  assertDevToolsEnabled()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('日期格式无效。')
  const userId = await getAuthenticatedUserId()
  const client = getBackendDatabase()
  const { data: profile } = await runBackendRequest(
    client
      .from('smoking_profiles')
      .select('quit_start_date')
      .eq('user_id', userId)
      .maybeSingle(),
    '读取测试戒烟设置',
  )
  if (!profile) throw new Error('请先完成戒烟设置。')
  if (profile.quit_start_date <= startDate) return false
  await runBackendRequest(
    client
      .from('smoking_profiles')
      .update({ quit_start_date: startDate })
      .eq('user_id', userId),
    '更新测试戒烟设置',
  )
  return true
}

export async function replaceMyDevCheckins(startDate: string, endDate: string, inputs: DevCheckinInput[]) {
  inputs.forEach(validateInput)
  assertDevToolsEnabled()
  const userId = await getAuthenticatedUserId()
  const client = getBackendDatabase()
  const { data } = await runBackendRequest(
    client
      .from('checkins')
      .upsert(inputs.map((input) => ({ ...input, user_id: userId })), { onConflict: 'user_id,checkin_date' })
      .select(CHECKIN_COLUMNS),
    '批量保存测试打卡',
  )
  const includedDates = new Set(inputs.map((input) => input.checkin_date))
  const { data: existing } = await runBackendRequest(
    client
      .from('checkins')
      .select('id,checkin_date')
      .eq('user_id', userId)
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate),
    '读取测试打卡区间',
  )
  const staleIds = (existing ?? []).filter((row) => !includedDates.has(row.checkin_date)).map((row) => row.id)
  if (staleIds.length > 0) {
    await runBackendRequest(
      client.from('checkins').delete().eq('user_id', userId).in('id', staleIds),
      '清理测试打卡',
    )
  }
  return (data as unknown as Checkin[]).map(normalizeCheckin)
}

export async function clearMyDevCheckins() {
  assertDevToolsEnabled()
  const userId = await getAuthenticatedUserId()
  await runBackendRequest(
    getBackendDatabase().from('checkins').delete().eq('user_id', userId),
    '清空测试打卡',
  )
}
