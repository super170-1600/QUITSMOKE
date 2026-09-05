import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCloudbaseDatabase } from '@/services/cloudbase'
import { requireSupabaseClient } from '@/services/supabase'
import { backendProvider } from './provider'
import type { BackendProvider } from './types'

export type BackendDatabaseClient = Pick<SupabaseClient, 'from' | 'rpc'>

function isBackendDatabaseClient(value: unknown): value is BackendDatabaseClient {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.from === 'function' && typeof candidate.rpc === 'function'
}

export function adaptBackendDatabaseClient(value: unknown): BackendDatabaseClient {
  if (!isBackendDatabaseClient(value)) {
    throw new Error('当前后端没有提供兼容的 PostgreSQL/PostgREST 客户端。')
  }
  return value
}

export function selectBackendDatabaseClient(
  provider: BackendProvider,
  clients: { supabase: unknown; cloudbase: unknown },
): BackendDatabaseClient {
  return adaptBackendDatabaseClient(clients[provider])
}

export function getBackendDatabase(): BackendDatabaseClient {
  if (backendProvider === 'cloudbase') {
    return adaptBackendDatabaseClient(requireCloudbaseDatabase())
  }
  return adaptBackendDatabaseClient(requireSupabaseClient())
}
