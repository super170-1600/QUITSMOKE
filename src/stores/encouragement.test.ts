import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  getEncouragements,
  getMyEncouragementActivity,
  sendReaction,
} from '@/api/encouragement'
import { useEncouragementStore } from '@/stores/encouragement'

vi.mock('@/api/encouragement', () => ({
  deleteMyEncouragement: vi.fn(),
  getEncouragements: vi.fn(),
  getMyEncouragementActivity: vi.fn(),
  sendMessage: vi.fn(),
  sendReaction: vi.fn(),
}))

describe('encouragement store send result', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('keeps a successful reaction when follow-up refreshes fail', async () => {
    vi.mocked(sendReaction).mockResolvedValue({
      id: 'encouragement-1',
      family_id: 'family-1',
      from_user_id: 'supporter-1',
      to_user_id: 'quitter-1',
      type: 'clap',
      message: null,
      created_at: '2026-09-05T10:00:00Z',
    })
    vi.mocked(getEncouragements).mockRejectedValue(new Error('timeline unavailable'))
    vi.mocked(getMyEncouragementActivity).mockRejectedValue(new Error('activity unavailable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const store = useEncouragementStore()

    await expect(store.sendReaction('family-1', 'quitter-1', 'clap', '妈妈')).resolves.toBeUndefined()

    expect(store.items).toHaveLength(1)
    expect(store.items[0]).toMatchObject({ id: 'encouragement-1', fromNickname: '妈妈' })
    expect(store.myItems).toHaveLength(1)
    expect(store.myTotal).toBe(1)
    expect(store.isReactionCoolingDown('quitter-1', 'clap')).toBe(true)
    expect(consoleError).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })
})
