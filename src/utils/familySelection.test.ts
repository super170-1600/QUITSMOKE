import { describe, expect, it } from 'vitest'
import type { FamilyMemberModel } from '@/types/domain'
import { resolveSelectedQuitter } from '@/utils/familySelection'

const member = (userId: string, role: 'quitter' | 'supporter'): FamilyMemberModel => ({
  id: userId, familyId: 'family', userId, role, joinedAt: '2026-09-05T00:00:00Z', nickname: userId,
})

describe('resolveSelectedQuitter', () => {
  const members = [member('supporter', 'supporter'), member('dad', 'quitter'), member('uncle', 'quitter')]

  it('keeps the requested quitter across pages', () => {
    expect(resolveSelectedQuitter(members, 'uncle')?.userId).toBe('uncle')
  })

  it('falls back to the first quitter for an invalid or supporter id', () => {
    expect(resolveSelectedQuitter(members, 'supporter')?.userId).toBe('dad')
    expect(resolveSelectedQuitter(members, 'missing')?.userId).toBe('dad')
  })
})
