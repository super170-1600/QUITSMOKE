import { SMOKING_PROFILE_COLUMNS } from './columns'
import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { normalizeUserIdFields } from '@/services/backend/userId'
import type { SmokingProfile } from '@/types/database'

export interface CreateSmokingProfileInput {
  quit_start_date: string
  baseline_daily_cigarettes: number
  cigarettes_per_pack: number
  price_per_pack: number
}

export type UpdateSmokingProfileInput = CreateSmokingProfileInput

export async function getMySmokingProfile() {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('smoking_profiles')
      .select(SMOKING_PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle(),
    '读取戒烟设置',
  )
  return data ? normalizeUserIdFields(data as unknown as SmokingProfile, ['user_id']) : null
}

export async function getSmokingProfileByUserId(userId: string) {
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('smoking_profiles')
      .select(SMOKING_PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle(),
    '读取家庭戒烟设置',
  )
  return data ? normalizeUserIdFields(data as unknown as SmokingProfile, ['user_id']) : null
}

export async function createMySmokingProfile(input: CreateSmokingProfileInput) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('smoking_profiles')
      .insert({ ...input, user_id: userId })
      .select(SMOKING_PROFILE_COLUMNS)
      .single(),
    '创建戒烟设置',
  )
  return normalizeUserIdFields(data as unknown as SmokingProfile, ['user_id'])
}

export async function updateMySmokingProfile(input: UpdateSmokingProfileInput) {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('smoking_profiles')
      .update(input)
      .eq('user_id', userId)
      .select(SMOKING_PROFILE_COLUMNS)
      .single(),
    '更新戒烟设置',
  )
  return normalizeUserIdFields(data as unknown as SmokingProfile, ['user_id'])
}
