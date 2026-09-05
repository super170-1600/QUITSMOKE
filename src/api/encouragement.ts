import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { normalizeUserIdFields } from '@/services/backend/userId'
import type { Encouragement, EncouragementType } from '@/types/database'

export type ReactionType = Exclude<EncouragementType, 'message'>

interface EncouragementWithProfileRow extends Encouragement {
  profiles: { nickname: string } | { nickname: string }[] | null
}

export interface EncouragementWithNickname extends Encouragement {
  from_nickname: string
}

function normalizeEncouragement(row: Encouragement) {
  return normalizeUserIdFields(row, ['from_user_id', 'to_user_id'])
}

export async function getEncouragements(familyId: string, limit = 30) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('encouragements')
      .select('id, family_id, from_user_id, to_user_id, type, message, created_at, profiles!encouragements_from_user_id_fkey(nickname)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(safeLimit),
    '读取家庭鼓励',
  )
  return (data as unknown as EncouragementWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const normalized = normalizeEncouragement(row)
    return { id: row.id, family_id: row.family_id, from_user_id: normalized.from_user_id, to_user_id: normalized.to_user_id, type: row.type, message: row.message, created_at: row.created_at, from_nickname: profile?.nickname ?? '家庭成员' }
  }) satisfies EncouragementWithNickname[]
}

export async function getMyEncouragementActivity(familyId: string, limit = 100) {
  const userId = await getAuthenticatedUserId()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data, count } = await runBackendRequest(
    getBackendDatabase()
      .from('encouragements')
      .select('id, family_id, from_user_id, to_user_id, type, message, created_at, profiles!encouragements_from_user_id_fkey(nickname)', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit),
    '读取我的鼓励记录',
  )
  const items = (data as unknown as EncouragementWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const normalized = normalizeEncouragement(row)
    return { id: row.id, family_id: row.family_id, from_user_id: normalized.from_user_id, to_user_id: normalized.to_user_id, type: row.type, message: row.message, created_at: row.created_at, from_nickname: profile?.nickname ?? '家庭成员' }
  }) satisfies EncouragementWithNickname[]
  return { items, total: count ?? items.length }
}

export async function sendReaction(input: { familyId: string; toUserId: string; type: ReactionType }) {
  const fromUserId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('encouragements')
      .insert({
        family_id: input.familyId,
        from_user_id: fromUserId,
        to_user_id: input.toUserId,
        type: input.type,
        message: null,
      })
      .select('id, family_id, from_user_id, to_user_id, type, message, created_at')
      .single(),
    '发送鼓励',
  )
  return normalizeEncouragement(data as unknown as Encouragement)
}

export async function sendMessage(input: { familyId: string; toUserId: string; message: string }) {
  const fromUserId = await getAuthenticatedUserId()
  const message = input.message.trim()
  if (!message || message.length > 200) throw new Error('鼓励内容需为 1–200 字。')
  await runBackendRequest(getBackendDatabase().from('encouragements').insert({
      family_id: input.familyId,
      from_user_id: fromUserId,
      to_user_id: input.toUserId,
      type: 'message',
      message,
    }), '发送文字鼓励')
}

export async function deleteMyEncouragement(id: string) {
  const userId = await getAuthenticatedUserId()
  await runBackendRequest(
    getBackendDatabase()
      .from('encouragements')
      .delete()
      .eq('id', id)
      .eq('from_user_id', userId),
    '删除鼓励',
  )
}
