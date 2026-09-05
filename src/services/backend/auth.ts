import { requireCloudbaseAuth } from '@/services/cloudbase'
import { requireSupabaseClient } from '@/services/supabase'
import {
  getAuthIdentityDebugInfo,
  getSdkResponseError,
  mapAuthEvent,
  mapAuthResult,
  mapBackendUser,
} from './authMapping'
import { toBackendError } from './errors'
import { backendProvider, getAuthIdentifierKind } from './provider'
import {
  clearCloudbaseAuthDiagnostics,
  recordCloudbaseLoginDiagnostics,
} from './authDiagnostics'
import type {
  BackendAuthAdapter,
  BackendAuthEvent,
  BackendAuthResult,
  BackendAuthSubscription,
  BackendSession,
  BackendUser,
} from './types'

function authLabel(adapter: BackendAuthAdapter) {
  return adapter.identifierKind === 'username' ? '用户名' as const : '邮箱' as const
}

async function runAuthRequest<T>(
  adapter: BackendAuthAdapter,
  request: () => Promise<T>,
): Promise<T> {
  try {
    const response = await request()
    const error = getSdkResponseError(response)
    if (error) throw error
    return response
  } catch (error: unknown) {
    throw toBackendError(error, { authIdentifier: authLabel(adapter) })
  }
}

function createSupabaseAuthAdapter(): BackendAuthAdapter {
  const adapter: BackendAuthAdapter = {
    identifierKind: 'email',
    async signUp(identifier, password) {
      const response = await runAuthRequest(adapter, () => (
        requireSupabaseClient().auth.signUp({ email: identifier, password })
      ))
      return mapAuthResult(response)
    },
    async signIn(identifier, password) {
      const response = await runAuthRequest(adapter, () => (
        requireSupabaseClient().auth.signInWithPassword({ email: identifier, password })
      ))
      return mapAuthResult(response)
    },
    async signOut() {
      await runAuthRequest(adapter, () => requireSupabaseClient().auth.signOut())
    },
    async getSession() {
      const response = await runAuthRequest(adapter, () => requireSupabaseClient().auth.getSession())
      return mapAuthResult(response).session
    },
    async getUser() {
      const response = await runAuthRequest(adapter, () => requireSupabaseClient().auth.getUser())
      const data = typeof response.data === 'object' && response.data !== null ? response.data : null
      return mapBackendUser(data?.user ?? null)
    },
    subscribe(listener) {
      const subscription = requireSupabaseClient().auth.onAuthStateChange((event, session) => {
        listener(mapAuthEvent(event), mapAuthResult(session).session)
      }).data.subscription
      return { unsubscribe: () => subscription.unsubscribe() }
    },
  }
  return adapter
}

type CloudbaseAuthClient = ReturnType<typeof requireCloudbaseAuth>

function debugCloudbaseIdentity(
  action: 'login' | 'restore',
  loginUsername: string | null,
  sdkResponse: unknown,
  normalizedUser: BackendUser | null,
) {
  if (!import.meta.env.DEV) return
  const sdk = getAuthIdentityDebugInfo(sdkResponse)
  console.debug('[auth]', {
    action,
    loginUsername,
    sdkUid: sdk.uid,
    sdkSub: sdk.sub,
    sdkId: sdk.id,
    sdkUsername: sdk.username,
    normalizedUserId: normalizedUser?.id ?? null,
  })
}

function withCurrentUser(
  result: BackendAuthResult,
  currentUser: BackendUser | null,
): BackendAuthResult {
  if (!result.session || !currentUser) return { user: currentUser, session: null }
  return {
    user: currentUser,
    session: { ...result.session, user: currentUser },
  }
}

export function createCloudbaseAuthAdapter(client?: CloudbaseAuthClient): BackendAuthAdapter {
  const getAuth = () => client ?? requireCloudbaseAuth()
  const adapter: BackendAuthAdapter = {
    identifierKind: 'username',
    async signUp(identifier, password) {
      const auth = getAuth()
      const response = await runAuthRequest(adapter, () => (
        auth.signUp({ username: identifier, password })
      ))
      const result = mapAuthResult(response)
      if (!result.session) return result
      const currentResponse = await runAuthRequest(adapter, () => auth.getUser())
      return withCurrentUser(result, mapAuthResult(currentResponse).user)
    },
    async signIn(identifier, password) {
      const auth = getAuth()
      const response = await runAuthRequest(adapter, () => (
        auth.signInWithPassword({ username: identifier, password })
      ))
      recordCloudbaseLoginDiagnostics(identifier, response)
      const result = mapAuthResult(response)
      const currentResponse = await runAuthRequest(adapter, () => auth.getUser())
      const currentUser = mapAuthResult(currentResponse).user
      debugCloudbaseIdentity('login', identifier, currentResponse, currentUser)
      return withCurrentUser(result, currentUser)
    },
    async signOut() {
      await runAuthRequest(adapter, () => getAuth().signOut())
      clearCloudbaseAuthDiagnostics()
    },
    async getSession() {
      const auth = getAuth()
      const response = await runAuthRequest(adapter, () => auth.getSession())
      const result = mapAuthResult(response)
      if (!result.session) return null
      const currentResponse = await runAuthRequest(adapter, () => auth.getUser())
      const currentUser = mapAuthResult(currentResponse).user
      debugCloudbaseIdentity('restore', currentUser?.username ?? null, currentResponse, currentUser)
      return withCurrentUser(result, currentUser).session
    },
    async getUser() {
      const response = await runAuthRequest(adapter, () => getAuth().getUser())
      const mapped = mapAuthResult(response).user
      return mapped
    },
    subscribe(listener) {
      const auth = getAuth()
      const subscription = auth.onAuthStateChange((event, session) => {
        void runAuthRequest(adapter, () => auth.getSession())
          .then(async (currentSessionResponse) => {
            const currentResult = mapAuthResult(currentSessionResponse)
            if (!currentResult.session) {
              listener(mapAuthEvent(event), null)
              return
            }
            const currentUserResponse = await runAuthRequest(adapter, () => auth.getUser())
            listener(mapAuthEvent(event), withCurrentUser(
              currentResult,
              mapAuthResult(currentUserResponse).user,
            ).session)
          })
          .catch((error: unknown) => console.error('[auth] 认证状态变化后读取当前用户失败', error))
      }).data.subscription
      return { unsubscribe: () => subscription.unsubscribe() }
    },
  }
  return adapter
}

export function selectAuthAdapter(
  provider = backendProvider,
  adapters: { supabase: BackendAuthAdapter; cloudbase: BackendAuthAdapter } = {
    supabase: createSupabaseAuthAdapter(),
    cloudbase: createCloudbaseAuthAdapter(),
  },
): BackendAuthAdapter {
  return adapters[provider]
}

const authAdapter = selectAuthAdapter()

export const authIdentifierKind = getAuthIdentifierKind(backendProvider)

export function signUp(identifier: string, password: string): Promise<BackendAuthResult> {
  return authAdapter.signUp(identifier, password)
}

export function signIn(identifier: string, password: string): Promise<BackendAuthResult> {
  return authAdapter.signIn(identifier, password)
}

export function signOut(): Promise<void> {
  return authAdapter.signOut()
}

export function getCurrentSession(): Promise<BackendSession | null> {
  return authAdapter.getSession()
}

export function getCurrentUser(): Promise<BackendUser | null> {
  return authAdapter.getUser()
}

export function subscribeToAuthState(
  listener: (event: BackendAuthEvent, session: BackendSession | null) => void,
): BackendAuthSubscription {
  return authAdapter.subscribe(listener)
}

export async function getAuthenticatedUserId() {
  const user = await getCurrentUser()
  if (!user) throw new Error('登录状态已失效，请重新登录。')
  return user.id
}
