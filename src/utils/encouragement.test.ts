import { describe, expect, it } from 'vitest'
import { getReactionCooldownKey, getReactionEmoji, isReactionCooldownActive, normalizeEncouragementMessage } from '@/utils/encouragement'
import { buildFamilyQuitterSummary } from '@/utils/familySummary'
import type { FamilyMemberModel, SmokingProfileModel } from '@/types/domain'

describe('encouragement helpers', () => {
  it('maps every reaction type to its emoji', () => {
    expect(['heart', 'like', 'clap', 'fire', 'celebrate'].map((type) => getReactionEmoji(type as 'heart' | 'like' | 'clap' | 'fire' | 'celebrate'))).toEqual(['❤️', '👍', '👏', '🔥', '🎉'])
  })

  it('trims messages and rejects empty or oversized content', () => {
    expect(normalizeEncouragementMessage('  今天继续坚持！  ')).toBe('今天继续坚持！')
    expect(normalizeEncouragementMessage('   ')).toBeNull()
    expect(normalizeEncouragementMessage('鼓'.repeat(201))).toBeNull()
  })

  it('scopes reaction cooldown to the same recipient and reaction', () => {
    const cooldowns = { [getReactionCooldownKey('dad', 'heart')]: 11_000 }
    expect(isReactionCooldownActive(cooldowns, 'dad', 'heart', 1_000)).toBe(true)
    expect(isReactionCooldownActive(cooldowns, 'dad', 'clap', 1_000)).toBe(false)
    expect(isReactionCooldownActive(cooldowns, 'mum', 'heart', 1_000)).toBe(false)
    expect(isReactionCooldownActive(cooldowns, 'dad', 'heart', 11_000)).toBe(false)
  })
})

describe('family quitter summary', () => {
  it('keeps a missing today checkin as null while reusing smoking statistics', () => {
    const member: FamilyMemberModel = { id: 'm1', familyId: 'f1', userId: 'u1', role: 'quitter', joinedAt: '2026-09-01T00:00:00Z', nickname: '爸爸' }
    const profile: SmokingProfileModel = { id: 's1', quitStartDate: '2026-09-01', baselineDailyCigarettes: 10, cigarettesPerPack: 20, pricePerPack: 25 }
    const summary = buildFamilyQuitterSummary(member, profile, [{ id: 'c1', checkinDate: '2026-09-03', cigarettes: 0, cravingLevel: 1, note: '' }], '2026-09-04')
    expect(summary.todayCheckin).toBeNull()
    expect(summary.statistics?.currentStreak).toBe(0)
  })
})
