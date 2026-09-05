import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  getFamilyMessages,
  getMyFamilyMessageActivity,
  sendFamilyTextMessage,
} from '@/api/message'
import { useMessageStore } from '@/stores/message'

vi.mock('@/api/message', () => ({
  getFamilyMessages: vi.fn(),
  getMyFamilyMessageActivity: vi.fn(),
  sendFamilyTextMessage: vi.fn(),
  subscribeToFamilyActivity: vi.fn(() => () => undefined),
}))

describe('message store send result', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps a successful message when follow-up refreshes fail', async () => {
    vi.mocked(sendFamilyTextMessage).mockResolvedValue({
      id: 'message-1',
      family_id: 'family-1',
      sender_id: 'supporter-1',
      type: 'text',
      content: '继续保持',
      event_key: null,
      created_at: '2026-09-05T10:00:00Z',
    })
    vi.mocked(getFamilyMessages).mockRejectedValue(new Error('timeline unavailable'))
    vi.mocked(getMyFamilyMessageActivity).mockRejectedValue(new Error('activity unavailable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const store = useMessageStore()

    await expect(store.sendText('family-1', '继续保持', '妈妈')).resolves.toBeUndefined()

    expect(store.items).toHaveLength(1)
    expect(store.items[0]).toMatchObject({ id: 'message-1', senderNickname: '妈妈' })
    expect(store.myItems).toHaveLength(1)
    expect(store.myTotal).toBe(1)
    expect(consoleError).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })
})
