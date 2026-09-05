import { requireCloudbaseAuth } from '@/services/cloudbase'
import { backendProvider } from './provider'
import { getAuthIdentityDebugInfo, mapAuthResult } from './authMapping'

export interface IdentityDebugFields {
  sdkUid: string | null
  sdkSub: string | null
  sdkId: string | null
  sdkUsername: string | null
  normalizedUserId: string | null
}

export interface ProfileDebugFields {
  requestedUserId: string | null
  rawReturnedProfileId: string | null
  returnedProfileId: string | null
  returnedNickname: string | null
}

export interface LiveAuthDiagnostics {
  provider: string
  loginUsername: string | null
  loginResponse: IdentityDebugFields | null
  currentUser: IdentityDebugFields | null
  sessionUser: IdentityDebugFields | null
  claimsSub: string | null
  claimsUserId: string | null
  profile: ProfileDebugFields | null
}

let loginUsername: string | null = null
let loginResponse: IdentityDebugFields | null = null
let profileResponse: ProfileDebugFields | null = null

function stringifyIdentity(value: unknown): IdentityDebugFields {
  const sdk = getAuthIdentityDebugInfo(value)
  return {
    sdkUid: sdk.uid,
    sdkSub: sdk.sub,
    sdkId: sdk.id,
    sdkUsername: sdk.username,
    normalizedUserId: mapAuthResult(value).user?.id ?? null,
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function readString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return null
}

export function recordCloudbaseLoginDiagnostics(username: string, response: unknown) {
  if (!import.meta.env.DEV) return
  loginUsername = username
  loginResponse = stringifyIdentity(response)
}

export function clearCloudbaseAuthDiagnostics() {
  loginUsername = null
  loginResponse = null
  profileResponse = null
}

export function recordProfileDiagnostics(fields: ProfileDebugFields) {
  if (!import.meta.env.DEV) return
  profileResponse = fields
}

export async function collectLiveAuthDiagnostics(): Promise<LiveAuthDiagnostics> {
  if (backendProvider !== 'cloudbase') {
    return {
      provider: backendProvider,
      loginUsername,
      loginResponse,
      currentUser: null,
      sessionUser: null,
      claimsSub: null,
      claimsUserId: null,
      profile: profileResponse,
    }
  }

  const auth = requireCloudbaseAuth()
  const refreshableGetUser = auth.getUser as unknown as (refresh?: boolean) => Promise<unknown>
  const [currentUserResponse, sessionResponse, claimsResponse] = await Promise.all([
    refreshableGetUser.call(auth, true),
    auth.getSession(),
    auth.getClaims(),
  ])
  const claimsData = readRecord(readRecord(claimsResponse)?.data)
  const claims = readRecord(claimsData?.claims)

  return {
    provider: backendProvider,
    loginUsername,
    loginResponse,
    currentUser: stringifyIdentity(currentUserResponse),
    sessionUser: stringifyIdentity(sessionResponse),
    claimsSub: readString(claims?.sub),
    claimsUserId: readString(claims?.user_id),
    profile: profileResponse,
  }
}

