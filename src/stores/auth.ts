import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutRequest,
  signUpWithIdentifier,
  subscribeToAuthState,
} from '@/api/auth'
import { getMyProfile } from '@/api/profile'
import type { Profile } from '@/types/database'
import type { BackendSession } from '@/services/backend/types'
import { clearProjectAccountStorage, resetAccountScopedStores } from '@/stores/accountScope'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<BackendSession | null>(null)
  const profile = ref<Profile | null>(null)
  const initialized = ref(false)
  let initializePromise: Promise<void> | null = null
  let subscribed = false
  let authRevision = 0
  let explicitAuthOperation = false

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => user.value !== null)

  function debugStore(action: string) {
    if (!import.meta.env.DEV) return
    console.debug('[store]', {
      action,
      currentSessionUserId: session.value?.user.id ?? null,
    })
  }

  async function clearAccountState(clearProjectStorage = false) {
    session.value = null
    profile.value = null
    await resetAccountScopedStores()
    if (clearProjectStorage) clearProjectAccountStorage()
    debugStore('cleared')
  }

  async function loadProfileForCurrentSession(requestedUserId: string, revision: number) {
    const nextProfile = await getMyProfile(requestedUserId)
    if (revision !== authRevision || session.value?.user.id !== requestedUserId) return null
    if (nextProfile && nextProfile.id !== requestedUserId) {
      throw new Error('个人资料与当前登录账号不一致，请退出后重试。')
    }
    profile.value = nextProfile
    return nextProfile
  }

  async function applyExternalSession(nextSessionValue: BackendSession | null) {
    if (explicitAuthOperation) return
    let nextSession = nextSessionValue
    // A delayed SIGNED_OUT callback may have started before a new login
    // completed. Verify null against the SDK before clearing a live account.
    if (!nextSession && session.value) nextSession = await getCurrentSession()
    if (explicitAuthOperation) return
    const revision = ++authRevision
    const previousUserId = session.value?.user.id ?? null
    const nextUserId = nextSession?.user.id ?? null
    if (previousUserId !== nextUserId) await clearAccountState()
    if (revision !== authRevision) return
    session.value = nextSession
    profile.value = null
    debugStore('auth-state-change')
    if (nextUserId) await loadProfileForCurrentSession(nextUserId, revision)
  }

  function initialize() {
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      if (!subscribed) {
        subscribeToAuthState((_event, nextSession) => {
          void applyExternalSession(nextSession)
            .catch((error: unknown) => console.error('认证状态变化后读取 profile 失败', error))
        })
        subscribed = true
      }

      explicitAuthOperation = true
      const revision = ++authRevision
      try {
        const restoredSession = await getCurrentSession()
        await clearAccountState()
        if (revision !== authRevision) return
        session.value = restoredSession
        debugStore('session-restored')
        if (restoredSession) await loadProfileForCurrentSession(restoredSession.user.id, revision)
      } finally {
        explicitAuthOperation = false
      }
    })().finally(() => {
      initialized.value = true
    })

    return initializePromise
  }

  async function login(identifier: string, password: string) {
    const revision = ++authRevision
    explicitAuthOperation = true
    try {
      await clearAccountState(true)
      await signOutRequest()
      const data = await signInWithPassword(identifier, password)
      if (!data.session) throw new Error('登录状态未建立，请重试。')
      if (revision !== authRevision) return
      session.value = data.session
      debugStore('login-committed')
      await loadProfileForCurrentSession(data.session.user.id, revision)
    } finally {
      explicitAuthOperation = false
    }
  }

  async function register(identifier: string, password: string) {
    const revision = ++authRevision
    explicitAuthOperation = true
    try {
      await clearAccountState(true)
      await signOutRequest()
      const data = await signUpWithIdentifier(identifier, password)
      if (revision !== authRevision) return null
      session.value = data.session
      debugStore('register-committed')
      if (data.session) await loadProfileForCurrentSession(data.session.user.id, revision)
      return data.session
    } finally {
      explicitAuthOperation = false
    }
  }

  async function logout() {
    ++authRevision
    explicitAuthOperation = true
    try {
      await signOutRequest()
    } finally {
      await clearAccountState(true)
      explicitAuthOperation = false
    }
  }

  return {
    session,
    profile,
    user,
    isAuthenticated,
    initialized,
    initialize,
    login,
    register,
    logout,
  }
})
