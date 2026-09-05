import { describe, expect, it } from 'vitest'
import type { EncouragementModel, FamilyMessageModel } from '@/types/domain'
import { selectLatestFamilySupport } from '@/utils/familyMoment'

const message = (overrides: Partial<FamilyMessageModel> = {}): FamilyMessageModel => ({
  id: 'm1', familyId: 'f1', senderId: 'supporter', type: 'text', content: '继续保持',
  createdAt: '2026-09-05T12:00:00Z', senderNickname: '妈妈', ...overrides,
})
const encouragement = (overrides: Partial<EncouragementModel> = {}): EncouragementModel => ({
  id: 'e1', familyId: 'f1', fromUserId: 'supporter', toUserId: 'quitter', type: 'clap',
  message: '', createdAt: '2026-09-05T11:00:00Z', fromNickname: '妈妈', ...overrides,
})

describe('selectLatestFamilySupport', () => {
  it('returns the latest message or direct encouragement from another family member', () => {
    expect(selectLatestFamilySupport([message()], [encouragement()], 'quitter')).toMatchObject({
      id: 'message:m1', fromNickname: '妈妈', content: '继续保持',
    })
  })

  it('ignores system messages, self messages and reactions sent to somebody else', () => {
    const result = selectLatestFamilySupport(
      [message({ senderId: null, type: 'system_checkin' }), message({ id: 'mine', senderId: 'quitter' })],
      [encouragement({ toUserId: 'another' })],
      'quitter',
    )
    expect(result).toBeNull()
  })
})
