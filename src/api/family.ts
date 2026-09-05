import { getAuthenticatedUserId, getBackendDatabase, runBackendRequest } from '@/services/backend'
import { getBackendErrorDiagnostics } from '@/services/backend/errors'
import { normalizeUserIdFields } from '@/services/backend/userId'
import type { Family, FamilyMember, FamilyRole } from '@/types/database'
import { resolveSingleFamilyMembership } from '@/utils/familyMembership'

interface FamilyMemberWithProfileRow extends FamilyMember {
  profiles: { nickname: string } | { nickname: string }[] | null
}

export interface FamilyMemberWithNickname extends FamilyMember {
  nickname: string
}

export interface CurrentFamilyResult {
  family: Family
  membership: FamilyMember
}

interface CreateFamilyRpcRow {
  family_id: string
  invite_code: string
}

function logRpcError(rpcName: string, error: unknown) {
  const diagnostics = getBackendErrorDiagnostics(error)
  console.error(
    `[Family API] ${rpcName} failed\n` +
    `message: ${diagnostics.message}\n` +
    `code: ${diagnostics.code}\n` +
    `details: ${diagnostics.details}\n` +
    `hint: ${diagnostics.hint}`,
  )
}

export async function getMyFamilyMembership() {
  const userId = await getAuthenticatedUserId()
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('family_members')
      .select('id, family_id, user_id, role, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true }),
    '读取家庭成员关系',
  )
  return (data as unknown as FamilyMember[]).map((row) => normalizeUserIdFields(row, ['user_id']))
}

export async function getMyFamilies() {
  const memberships = await getMyFamilyMembership()
  if (memberships.length === 0) return []
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('families')
      .select('id, name, invite_code, created_by, created_at, updated_at')
      .in('id', memberships.map((membership) => membership.family_id)),
    '读取家庭',
  )
  return (data as unknown as Family[]).map((row) => normalizeUserIdFields(row, ['created_by']))
}

export async function getCurrentFamily(): Promise<CurrentFamilyResult | null> {
  const memberships = await getMyFamilyMembership()
  const membership = resolveSingleFamilyMembership(memberships)
  if (!membership) return null
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('families')
      .select('id, name, invite_code, created_by, created_at, updated_at')
      .eq('id', membership.family_id)
      .single(),
    '读取当前家庭',
  )
  return { family: normalizeUserIdFields(data as unknown as Family, ['created_by']), membership }
}

export async function getFamilyMembers(familyId: string) {
  const { data } = await runBackendRequest(
    getBackendDatabase()
      .from('family_members')
      .select('id, family_id, user_id, role, joined_at, profiles!family_members_user_id_fkey(nickname)')
      .eq('family_id', familyId)
      .order('joined_at', { ascending: true }),
    '读取家庭成员',
  )
  return (data as unknown as FamilyMemberWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.id, family_id: row.family_id, user_id: normalizeUserIdFields(row, ['user_id']).user_id, role: row.role, joined_at: row.joined_at, nickname: profile?.nickname ?? '家庭成员' }
  }) satisfies FamilyMemberWithNickname[]
}

export async function createFamily(name: string, role: FamilyRole) {
  try {
    const { data } = await runBackendRequest(getBackendDatabase().rpc('create_family', {
      family_name: name.trim(),
      member_role: role,
    }), '创建家庭')
    const result = (data as unknown as CreateFamilyRpcRow[] | null)?.[0]
    if (!result) throw new Error('家庭创建后未返回结果。')
    return result
  } catch (error: unknown) {
    logRpcError('create_family', error)
    throw error
  }
}

export async function joinFamilyByInviteCode(inviteCode: string, role: FamilyRole) {
  try {
    const { data } = await runBackendRequest(getBackendDatabase().rpc('join_family_by_invite_code', {
      invite_code: inviteCode.trim().toUpperCase(),
      member_role: role,
    }), '加入家庭')
    if (typeof data !== 'string') throw new Error('加入家庭后未返回结果。')
    return data
  } catch (error: unknown) {
    logRpcError('join_family_by_invite_code', error)
    throw error
  }
}

export async function leaveCurrentFamily() {
  try {
    const { data } = await runBackendRequest(
      getBackendDatabase().rpc('leave_current_family'),
      '退出家庭',
    )
    return data === true
  } catch (error: unknown) {
    logRpcError('leave_current_family', error)
    throw error
  }
}
