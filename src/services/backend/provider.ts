import type { AuthIdentifierKind, BackendProvider } from './types'

export function resolveBackendProvider(value: unknown): BackendProvider {
  if (value === undefined || value === null || value === '' || value === 'supabase') {
    return 'supabase'
  }
  if (value === 'cloudbase') return 'cloudbase'
  throw new Error('VITE_BACKEND_PROVIDER 只能是 supabase 或 cloudbase。')
}

export function getAuthIdentifierKind(provider: BackendProvider): AuthIdentifierKind {
  return provider === 'cloudbase' ? 'username' : 'email'
}

export const backendProvider = resolveBackendProvider(import.meta.env.VITE_BACKEND_PROVIDER)
