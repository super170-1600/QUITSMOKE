import { describe, expect, it } from 'vitest'
import { resolveSingleFamilyMembership } from '@/utils/familyMembership'

describe('resolveSingleFamilyMembership', () => {
  it('returns null when the user has no family', () => {
    expect(resolveSingleFamilyMembership([])).toBeNull()
  })

  it('returns the only family membership', () => {
    const membership = { id: 'membership-1', familyId: 'family-1' }
    expect(resolveSingleFamilyMembership([membership])).toBe(membership)
  })

  it('refuses to silently choose when legacy data contains multiple families', () => {
    expect(() => resolveSingleFamilyMembership([
      { id: 'membership-1' },
      { id: 'membership-2' },
    ])).toThrow('检测到多个家庭绑定')
  })
})
