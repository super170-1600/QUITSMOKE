import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutRequest,
  signUpWithEmail,
  subscribeToAuthState,
} from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const initialized = ref(false)
  let initializePromise: Promise<void> | null = null
  let subscribed = false

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => user.value !== null)

  function initialize() {
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      if (!subscribed) {
        subscribeToAuthState((_event, nextSession) => {
          session.value = nextSession
        })
        subscribed = true
      }

      session.value = await getCurrentSession()
    })().finally(() => {
      initialized.value = true
    })

    return initializePromise
  }

  async function login(email: string, password: string) {
    const data = await signInWithPassword(email, password)
    session.value = data.session
  }

  async function register(email: string, password: string) {
    const data = await signUpWithEmail(email, password)
    session.value = data.session
    return data.session
  }

  async function logout() {
    await signOutRequest()
    session.value = null
  }

  return {
    session,
    user,
    isAuthenticated,
    initialized,
    initialize,
    login,
    register,
    logout,
  }
})
