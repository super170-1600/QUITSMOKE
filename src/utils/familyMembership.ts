export function resolveSingleFamilyMembership<T>(memberships: readonly T[]): T | null {
  if (memberships.length > 1) {
    throw new Error('检测到多个家庭绑定，请先修复家庭成员数据。')
  }
  return memberships[0] ?? null
}
