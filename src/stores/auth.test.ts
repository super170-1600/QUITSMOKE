import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  getCurrentSession,
  signInWithPassword,
  signOut,
  subscribeToAuthState,
} from '@/api/auth'
import { getMyProfile } from '@/api/profile'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { useEncouragementStore } from '@/stores/encouragement'
import { useMessageStore } from '@/stores/message'
import type { BackendSession } from '@/services/backend/types'
import type { Profile } from '@/types/database'

const authState = vi.hoisted(() => ({
  listener: null as ((event: string, session: BackendSession | null) => void) | null,
}))

vi.mock('@/api/auth', () => ({
  getCurrentSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUpWithIdentifier: vi.fn(),
  subscribeToAuthState: vi.fn((listener) => {
    authState.listener = listener
    return { unsubscribe: vi.fn() }
  }),
}))

vi.mock('@/api/profile', () => ({ getMyProfile: vi.fn() }))

const ADMIN_ID = '2096101953535741952'
const USER_170_ID = '2096107842256662530'

function session(id: string, username: string): BackendSession {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { id, username, email: null, isAnonymous: false },
  }
}

function profile(id: string, nickname: string): Profile {
  return {
    id,
    nickname,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('auth store account switching', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    authState.listener = null
    vi.mocked(getCurrentSession).mockResolvedValue(null)
    vi.mocked(signOut).mockResolvedValue(undefined)
    vi.mocked(getMyProfile).mockImplementation(async (id) => (
      profile(id ?? USER_170_ID, id === ADMIN_ID ? 'administrator' : '170')
    ))
    vi.mocked(signInWithPassword).mockImplementation(async (identifier) => {
      const nextSession = identifier === '170'
        ? session(USER_170_ID, '170')
        : session(ADMIN_ID, 'administrator')
      return { user: nextSession.user, session: nextSession }
    })
  })

  it('switches administrator -> logout -> 170 and queries only the 170 profile id', async () => {
    const store = useAuthStore()
    await store.initialize()
    await store.login('administrator', 'password')
    await store.logout()
    vi.mocked(getMyProfile).mockClear()

    await store.login('170', 'password')

    expect(store.user?.id).toBe(USER_170_ID)
    expect(store.profile?.id).toBe(USER_170_ID)
    expect(store.profile?.nickname).toBe('170')
    expect(getMyProfile).toHaveBeenCalledTimes(1)
    expect(getMyProfile).toHaveBeenCalledWith(USER_170_ID)
  })

  it('drops a late profile response from the previous account', async () => {
    const oldProfile = deferred<Profile | null>()
    vi.mocked(getMyProfile).mockImplementation((id) => (
      id === ADMIN_ID ? oldProfile.promise : Promise.resolve(profile(USER_170_ID, '170'))
    ))
    const store = useAuthStore()
    await store.initialize()

    authState.listener?.('SIGNED_IN', session(ADMIN_ID, 'administrator'))
    await vi.waitFor(() => expect(getMyProfile).toHaveBeenCalledWith(ADMIN_ID))
    authState.listener?.('SIGNED_IN', session(USER_170_ID, '170'))
    await vi.waitFor(() => expect(store.profile?.id).toBe(USER_170_ID))
    oldProfile.resolve(profile(ADMIN_ID, 'administrator'))
    await Promise.resolve()

    expect(store.user?.id).toBe(USER_170_ID)
    expect(store.profile?.id).toBe(USER_170_ID)
  })

  it('does not let a delayed signed-out callback clear the new SDK session', async () => {
    const store = useAuthStore()
    await store.initialize()
    await store.login('170', 'password')
    vi.mocked(getCurrentSession).mockClear()
    vi.mocked(getMyProfile).mockClear()
    vi.mocked(getCurrentSession).mockResolvedValue(session(USER_170_ID, '170'))

    authState.listener?.('SIGNED_OUT', null)
    await vi.waitFor(() => expect(getCurrentSession).toHaveBeenCalled())
    await vi.waitFor(() => expect(getMyProfile).toHaveBeenCalledWith(USER_170_ID))

    expect(store.user?.id).toBe(USER_170_ID)
    expect(store.profile?.id).toBe(USER_170_ID)
  })

  it('clears every account-scoped store on logout', async () => {
    const store = useAuthStore()
    await store.initialize()
    await store.login('administrator', 'password')
    const family = useFamilyStore()
    const smoking = useSmokingStore()
    const encouragement = useEncouragementStore()
    const message = useMessageStore()
    family.$patch({ selectedQuitterId: ADMIN_ID, initialized: true })
    smoking.$patch({ loading: true, trendData: [{ date: '2026-09-05', cigarettes: 0 }] })
    encouragement.$patch({ myTotal: 3, loading: true })
    message.$patch({ myTotal: 2, loading: true })

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.profile).toBeNull()
    expect(family.selectedQuitterId).toBe('')
    expect(family.initialized).toBe(false)
    expect(smoking.trendData).toEqual([])
    expect(smoking.loading).toBe(false)
    expect(encouragement.myTotal).toBe(0)
    expect(message.myTotal).toBe(0)
    expect(subscribeToAuthState).toHaveBeenCalledTimes(1)
  })
})
