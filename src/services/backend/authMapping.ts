import type {
  BackendAuthEvent,
  BackendAuthResult,
  BackendSession,
  BackendUser,
} from './types'
import { normalizeUserId } from './userId'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function readBoolean(value: unknown): boolean {
  return value === true
}

function readUserMetadata(user: Record<string, unknown>) {
  return isRecord(user.user_metadata) ? user.user_metadata : {}
}

function isAnonymousUser(user: Record<string, unknown>) {
  if (readBoolean(user.is_anonymous)) return true
  const roles = Array.isArray(user.role) ? user.role.filter((role): role is string => typeof role === 'string') : []
  if (roles.includes('anon') && !roles.includes('authenticated')) return true
  const metadata = readUserMetadata(user)
  const loginType = readString(user.loginType) ?? readString(metadata.loginType)
  return loginType?.toUpperCase() === 'ANONYMOUS'
}

export function mapBackendUser(value: unknown): BackendUser | null {
  if (!isRecord(value) || isAnonymousUser(value)) return null
  const metadata = readUserMetadata(value)
  // A raw CloudBase current user exposes `uid`; the v3 normalized User exposes
  // the JWT subject through `sub`/`id`. user_metadata.uid is provider metadata,
  // not the PostgreSQL/RLS identity, so it must never participate here.
  const rawId = value.uid ?? value.sub ?? value.id
  if (rawId === null || rawId === undefined || rawId === '') return null

  return {
    id: normalizeUserId(rawId),
    email: readString(value.email),
    username: readString(value.username) ?? readString(metadata.username),
    isAnonymous: false,
  }
}

function unwrapData(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  return isRecord(value.data) ? value.data : value
}

function getRawAuthUser(value: unknown): Record<string, unknown> | null {
  const data = unwrapData(value)
  if (isRecord(data.user)) return data.user
  if (isRecord(data.session) && isRecord(data.session.user)) return data.session.user
  return null
}

function debugValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return null
}

export function getAuthIdentityDebugInfo(value: unknown) {
  const user = getRawAuthUser(value)
  const metadata = user ? readUserMetadata(user) : {}
  return {
    uid: debugValue(user?.uid),
    sub: debugValue(user?.sub),
    id: debugValue(user?.id),
    username: debugValue(user?.username ?? metadata.username),
  }
}

export function getSdkResponseError(value: unknown): unknown | null {
  if (!isRecord(value)) return null
  return value.error ?? null
}

export function mapAuthResult(value: unknown): BackendAuthResult {
  const data = unwrapData(value)
  const isDirectSession = isRecord(data.user)
    && ('access_token' in data || 'refresh_token' in data || 'expires_in' in data)
  const rawSession = isRecord(data.session) ? data.session : isDirectSession ? data : null
  const rawUser = data.user ?? rawSession?.user ?? null
  const user = mapBackendUser(rawUser)

  if (!user || !rawSession) return { user, session: null }

  const session: BackendSession = {
    accessToken: readString(rawSession.access_token),
    refreshToken: readString(rawSession.refresh_token),
    user,
  }
  return { user, session }
}

export function mapAuthEvent(value: unknown): BackendAuthEvent {
  switch (value) {
    case 'INITIAL_SESSION':
    case 'SIGNED_IN':
    case 'SIGNED_OUT':
    case 'TOKEN_REFRESHED':
    case 'USER_UPDATED':
    case 'PASSWORD_RECOVERY':
    case 'BIND_IDENTITY':
      return value
    default:
      return 'UNKNOWN'
  }
}
