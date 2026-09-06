import { backendProvider, getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { normalizeNullableUserId, normalizeUserIdFields } from '@/services/backend/userId'
import { requireSupabaseClient } from '@/services/supabase'
import type { FamilyMessage } from '@/types/database'

interface FamilyMessageWithProfileRow extends FamilyMessage {
  profiles: { nickname: string } | { nickname: string }[] | null
}

export interface FamilyMessageWithNickname extends FamilyMessage {
  sender_nickname: string
}

export type FamilyRealtimeStatus = 'idle' | 'connecting' | 'connected' | 'error'

function normalizeMessage(row: FamilyMessage) {
  return normalizeUserIdFields(row, ['sender_id'])
}

export async function getFamilyMessages(familyId: string, limit = 80) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('messages')
      .select('id, family_id, sender_id::text, type, content, event_key, created_at, profiles!messages_sender_id_fkey(nickname)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(safeLimit),
    '读取家庭消息',
  )

  return (data as unknown as FamilyMessageWithProfileRow[]).reverse().map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const senderId = normalizeNullableUserId(row.sender_id)
    return {
      id: row.id,
      family_id: row.family_id,
      sender_id: senderId,
      type: row.type,
      content: row.content,
      event_key: row.event_key,
      created_at: row.created_at,
      sender_nickname: profile?.nickname ?? (senderId ? '家庭成员' : 'NO SMOKING'),
    }
  }) satisfies FamilyMessageWithNickname[]
}

export async function getMyFamilyMessageActivity(familyId: string, limit = 100) {
  const senderId = await getAuthenticatedUserId()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data, count } = await runBackendRequest(
    getBackendDatabase()
      .from('messages')
      .select('id, family_id, sender_id::text, type, content, event_key, created_at, profiles!messages_sender_id_fkey(nickname)', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('sender_id', senderId)
      .eq('type', 'text')
      .order('created_at', { ascending: false })
      .limit(safeLimit),
    '读取我的家庭消息',
  )

  const items = (data as unknown as FamilyMessageWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      family_id: row.family_id,
      sender_id: normalizeNullableUserId(row.sender_id),
      type: row.type,
      content: row.content,
      event_key: row.event_key,
      created_at: row.created_at,
      sender_nickname: profile?.nickname ?? '家庭成员',
    }
  }) satisfies FamilyMessageWithNickname[]
  return { items, total: count ?? items.length }
}

export async function sendFamilyTextMessage(familyId: string, contentValue: string) {
  const senderId = await getAuthenticatedUserId()
  const content = contentValue.trim()
  if (!content || content.length > 500) throw new Error('消息内容需为 1–500 字。')

  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('messages')
      .insert({ family_id: familyId, sender_id: senderId, type: 'text', content })
      .select('id, family_id, sender_id::text, type, content, event_key, created_at')
      .single(),
    '发送家庭消息',
  )
  return normalizeMessage(data as unknown as FamilyMessage)
}

export function subscribeToFamilyActivity(
  familyId: string,
  onMessageChange: () => void,
  onEncouragementChange: () => void,
  onStatusChange: (status: FamilyRealtimeStatus) => void,
) {
  if (backendProvider === 'cloudbase') {
    // TODO: replace with the officially supported CloudBase PostgreSQL change
    // subscription API after it is verified. CRUD remains fully functional.
    onStatusChange('idle')
    return () => undefined
  }

  const client = requireSupabaseClient()
  const channel = client
    .channel(`family-activity:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `family_id=eq.${familyId}` },
      () => onMessageChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'encouragements', filter: `family_id=eq.${familyId}` },
      () => onEncouragementChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatusChange('connected')
      if (status === 'CLOSED') onStatusChange('idle')
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange('error')
        console.error('[Message API] 家庭消息实时连接失败', status)
      }
    })

  return () => {
    void client.removeChannel(channel)
  }
}
