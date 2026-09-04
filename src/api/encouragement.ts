import { requireSupabaseClient } from '@/services/supabase'
import type { Encouragement, EncouragementType } from '@/types/database'

export type ReactionType = Exclude<EncouragementType, 'message'>

interface EncouragementWithProfileRow extends Encouragement {
  profiles: { nickname: string } | { nickname: string }[] | null
}

export interface EncouragementWithNickname extends Encouragement {
  from_nickname: string
}

async function getAuthenticatedUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('登录状态已失效，请重新登录。')
  return data.user.id
}

export async function getEncouragements(familyId: string, limit = 30) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data, error } = await requireSupabaseClient()
    .from('encouragements')
    .select('id, family_id, from_user_id, to_user_id, type, message, created_at, profiles!encouragements_from_user_id_fkey(nickname)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)
  if (error) throw error
  return (data as unknown as EncouragementWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.id, family_id: row.family_id, from_user_id: row.from_user_id, to_user_id: row.to_user_id, type: row.type, message: row.message, created_at: row.created_at, from_nickname: profile?.nickname ?? '家庭成员' }
  }) satisfies EncouragementWithNickname[]
}

export async function sendReaction(input: { familyId: string; toUserId: string; type: ReactionType }) {
  const fromUserId = await getAuthenticatedUserId()
  const { error } = await requireSupabaseClient().from('encouragements').insert({
    family_id: input.familyId,
    from_user_id: fromUserId,
    to_user_id: input.toUserId,
    type: input.type,
    message: null,
  })
  if (error) throw error
}

export async function sendMessage(input: { familyId: string; toUserId: string; message: string }) {
  const fromUserId = await getAuthenticatedUserId()
  const message = input.message.trim()
  if (!message || message.length > 200) throw new Error('鼓励内容需为 1–200 字。')
  const { error } = await requireSupabaseClient().from('encouragements').insert({
    family_id: input.familyId,
    from_user_id: fromUserId,
    to_user_id: input.toUserId,
    type: 'message',
    message,
  })
  if (error) throw error
}

export async function deleteMyEncouragement(id: string) {
  const userId = await getAuthenticatedUserId()
  const { error } = await requireSupabaseClient()
    .from('encouragements')
    .delete()
    .eq('id', id)
    .eq('from_user_id', userId)
  if (error) throw error
}
