import { describe, expect, it } from 'vitest'
import type { EncouragementModel, FamilyMessageModel } from '@/types/domain'
import { buildFamilyTimeline } from '@/utils/familyTimeline'

describe('buildFamilyTimeline', () => {
  it('merges system events, text and existing reactions chronologically', () => {
    const messages: FamilyMessageModel[] = [
      { id: 'm2', familyId: 'f', senderId: null, type: 'system_checkin', content: '🚭 爸爸今天完成无烟打卡', createdAt: '2026-09-05T10:02:00Z', senderNickname: '无烟之家' },
      { id: 'm1', familyId: 'f', senderId: 'u1', type: 'text', content: '今天轻松一些', createdAt: '2026-09-05T10:00:00Z', senderNickname: '爸爸' },
    ]
    const encouragements: EncouragementModel[] = [
      { id: 'e1', familyId: 'f', fromUserId: 'u2', toUserId: 'u1', type: 'clap', message: '', createdAt: '2026-09-05T10:01:00Z', fromNickname: '妈妈' },
    ]

    expect(buildFamilyTimeline(messages, encouragements).map((item) => item.kind)).toEqual([
      'text',
      'reaction',
      'system',
    ])
  })

  it('keeps legacy encouragement messages as chat text', () => {
    const items = buildFamilyTimeline([], [
      { id: 'e1', familyId: 'f', fromUserId: 'u2', toUserId: 'u1', type: 'message', message: '继续保持', createdAt: '2026-09-05T10:01:00Z', fromNickname: '妈妈' },
    ])

    expect(items[0]).toMatchObject({ kind: 'text', content: '继续保持', toUserId: 'u1' })
  })
})
