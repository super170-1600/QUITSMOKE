export type BackendProvider = 'supabase' | 'cloudbase'

export type AuthIdentifierKind = 'email' | 'username'

export interface BackendUser {
  id: string
  email: string | null
  username: string | null
  isAnonymous: boolean
}

export interface BackendSession {
  accessToken: string | null
  refreshToken: string | null
  user: BackendUser
}

export interface BackendAuthResult {
  session: BackendSession | null
  user: BackendUser | null
}

export type BackendAuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'BIND_IDENTITY'
  | 'UNKNOWN'

export interface BackendAuthSubscription {
  unsubscribe: () => void
}

export interface BackendAuthAdapter {
  readonly identifierKind: AuthIdentifierKind
  signUp: (identifier: string, password: string) => Promise<BackendAuthResult>
  signIn: (identifier: string, password: string) => Promise<BackendAuthResult>
  signOut: () => Promise<void>
  getSession: () => Promise<BackendSession | null>
  getUser: () => Promise<BackendUser | null>
  subscribe: (
    listener: (event: BackendAuthEvent, session: BackendSession | null) => void,
  ) => BackendAuthSubscription
}
