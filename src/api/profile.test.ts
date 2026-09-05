import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBackendDatabase, runBackendRequest } from '@/services/backend'
import { getMyProfile } from './profile'

vi.mock('@/services/backend', () => ({
  getAuthenticatedUserId: vi.fn(),
  getBackendDatabase: vi.fn(),
  runBackendRequest: vi.fn(),
}))

describe('profile account identity mapping', () => {
  const exactUserId = '2096107842256662530'
  const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getBackendDatabase).mockReturnValue({
      from: vi.fn(() => ({ select })),
    } as never)
  })

  it('keeps the exact session id when a bigint response was decoded as a rounded number', async () => {
    vi.mocked(runBackendRequest).mockResolvedValue({
      data: {
        id: 2096107842256662500,
        nickname: '170',
        created_at: '2026-09-05T00:00:00Z',
        updated_at: '2026-09-05T00:00:00Z',
      },
      error: null,
    } as never)

    const profile = await getMyProfile(exactUserId)

    expect(eq).toHaveBeenCalledWith('id', exactUserId)
    expect(profile?.id).toBe(exactUserId)
    expect(profile?.nickname).toBe('170')
  })
})
