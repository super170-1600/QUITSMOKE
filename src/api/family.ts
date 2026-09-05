import { requireSupabaseClient } from '@/services/supabase'
import type { PostgrestError } from '@supabase/supabase-js'
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

function logRpcError(rpcName: string, error: PostgrestError) {
  console.error(
    `[Family API] ${rpcName} failed\n` +
    `message: ${error.message}\n` +
    `code: ${error.code}\n` +
    `details: ${error.details ?? ''}\n` +
    `hint: ${error.hint ?? ''}`,
  )
}

async function getAuthenticatedUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('登录状态已失效，请重新登录。')
  return data.user.id
}

export async function getMyFamilyMembership() {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await requireSupabaseClient()
    .from('family_members')
    .select('id, family_id, user_id, role, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data as FamilyMember[]
}

export async function getMyFamilies() {
  const memberships = await getMyFamilyMembership()
  if (memberships.length === 0) return []
  const { data, error } = await requireSupabaseClient()
    .from('families')
    .select('id, name, invite_code, created_by, created_at, updated_at')
    .in('id', memberships.map((membership) => membership.family_id))
  if (error) throw error
  return data as Family[]
}

export async function getCurrentFamily(): Promise<CurrentFamilyResult | null> {
  const memberships = await getMyFamilyMembership()
  const membership = resolveSingleFamilyMembership(memberships)
  if (!membership) return null
  const { data, error } = await requireSupabaseClient()
    .from('families')
    .select('id, name, invite_code, created_by, created_at, updated_at')
    .eq('id', membership.family_id)
    .single()
  if (error) throw error
  return { family: data as Family, membership }
}

export async function getFamilyMembers(familyId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('family_members')
    .select('id, family_id, user_id, role, joined_at, profiles!family_members_user_id_fkey(nickname)')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data as unknown as FamilyMemberWithProfileRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.id, family_id: row.family_id, user_id: row.user_id, role: row.role, joined_at: row.joined_at, nickname: profile?.nickname ?? '家庭成员' }
  }) satisfies FamilyMemberWithNickname[]
}

export async function createFamily(name: string, role: FamilyRole) {
  const { data, error } = await requireSupabaseClient().rpc('create_family', {
    family_name: name.trim(),
    member_role: role,
  })
  if (error) {
    logRpcError('create_family', error)
    throw error
  }
  const result = (data as unknown as CreateFamilyRpcRow[] | null)?.[0]
  if (!result) throw new Error('家庭创建后未返回结果。')
  return result
}

export async function joinFamilyByInviteCode(inviteCode: string, role: FamilyRole) {
  const { data, error } = await requireSupabaseClient().rpc('join_family_by_invite_code', {
    invite_code: inviteCode.trim().toUpperCase(),
    member_role: role,
  })
  if (error) {
    logRpcError('join_family_by_invite_code', error)
    throw error
  }
  if (typeof data !== 'string') throw new Error('加入家庭后未返回结果。')
  return data
}

export async function leaveCurrentFamily() {
  const { data, error } = await requireSupabaseClient().rpc('leave_current_family')
  if (error) {
    logRpcError('leave_current_family', error)
    throw error
  }
  return data === true
}
