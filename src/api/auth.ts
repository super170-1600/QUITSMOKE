import {
  authIdentifierKind,
  getCurrentSession,
  signIn,
  signOut as backendSignOut,
  signUp,
  subscribeToAuthState as subscribeToBackendAuthState,
} from '@/services/backend/auth'
import type { BackendAuthEvent, BackendSession } from '@/services/backend/types'

export const authPresentation = authIdentifierKind === 'username'
  ? {
      identifierKind: 'username' as const,
      label: '用户名',
      placeholder: '请输入用户名',
      autocomplete: 'username',
      inputType: 'text' as const,
    }
  : {
      identifierKind: 'email' as const,
      label: '邮箱',
      placeholder: 'name@example.com',
      autocomplete: 'email',
      inputType: 'email' as const,
    }

export async function signUpWithIdentifier(identifier: string, password: string) {
  return signUp(identifier, password)
}

export async function signInWithPassword(identifier: string, password: string) {
  return signIn(identifier, password)
}

export async function signOut() {
  await backendSignOut()
}

export function subscribeToAuthState(
  listener: (event: BackendAuthEvent, session: BackendSession | null) => void,
) {
  return subscribeToBackendAuthState(listener)
}

export { getCurrentSession }
