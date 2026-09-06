import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { recordProfileDiagnostics } from '@/services/backend/authDiagnostics'
import type { Profile } from '@/types/database'

function mapProfileForUser(value: unknown, requestedUserId: string): Profile | null {
  if (!value) return null

  // PostgreSQL bigint values can be decoded as imprecise JavaScript numbers by
  // a REST client. This row was selected with the exact session user id, so the
  // request id is the authoritative owner id at the domain boundary.
  return {
    ...(value as Profile),
    id: requestedUserId,
  }
}

function debugProfile(requestedUserId: string, rawProfile: unknown, profile: Profile | null) {
  if (!import.meta.env.DEV) return
  const rawReturnedProfileId = rawProfile && typeof rawProfile === 'object'
    ? (rawProfile as Record<string, unknown>).id ?? null
    : null
  const rawRecord = rawProfile && typeof rawProfile === 'object'
    ? rawProfile as Record<string, unknown>
    : null
  recordProfileDiagnostics({
    requestedUserId,
    rawReturnedProfileId: rawReturnedProfileId === null ? null : String(rawReturnedProfileId),
    returnedProfileId: profile?.id ?? null,
    returnedNickname: typeof rawRecord?.nickname === 'string' ? rawRecord.nickname : null,
  })
  console.debug('[profile]', {
    requestedUserId,
    rawReturnedProfileId,
    returnedProfileId: profile?.id ?? null,
  })
}

export async function getMyProfile(knownUserId?: string) {
  const userId = knownUserId ?? await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('profiles')
      .select('id::text, nickname, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    '读取个人资料',
  )
  const profile = mapProfileForUser(data, userId)
  debugProfile(userId, data, profile)
  return profile
}

export async function updateMyNickname(nicknameValue: string) {
  const userId = await getAuthenticatedUserId()
  const nickname = nicknameValue.trim()
  if (!nickname) throw new Error('昵称不能为空。')
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('profiles')
      .update({ nickname })
      .eq('id', userId)
      .select('id::text, nickname, created_at, updated_at')
      .single(),
    '更新个人资料',
  )
  return mapProfileForUser(data, userId) as Profile
}
