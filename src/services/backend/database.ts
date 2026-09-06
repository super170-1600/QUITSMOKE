import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCloudbaseDatabase } from '@/services/cloudbase'
import { requireSupabaseClient } from '@/services/supabase'
import { backendProvider } from './provider'
import type { BackendProvider } from './types'
import { runCloudbaseRpc } from './rpc'

export type BackendDatabaseClient = Pick<SupabaseClient, 'from'> & {
  rpc(name: string, args?: Record<string, unknown>, options?: { head?: boolean; get?: boolean; count?: 'exact' | 'planned' | 'estimated' }): PromiseLike<{ data: any; error: unknown }>
}

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
  const client = adaptBackendDatabaseClient(clients[provider])
  if (provider !== 'cloudbase') return client
  return {
    from: client.from.bind(client),
    rpc: (name, args, options) => runCloudbaseRpc(client.rpc(name, args, options), name),
  }
}

export function getBackendDatabase(): BackendDatabaseClient {
  if (backendProvider === 'cloudbase') {
    return selectBackendDatabaseClient('cloudbase', { cloudbase: requireCloudbaseDatabase(), supabase: null })
  }
  return adaptBackendDatabaseClient(requireSupabaseClient())
}
