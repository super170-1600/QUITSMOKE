import { describe, expect, it, vi } from 'vitest'
import { adaptBackendDatabaseClient, selectBackendDatabaseClient } from './database'

describe('database adapter mapping', () => {
  const supabase = { from: vi.fn(), rpc: vi.fn() }
  const cloudbase = { from: vi.fn(), rpc: vi.fn() }

  it('selects the requested PostgREST-compatible client', () => {
    expect(selectBackendDatabaseClient('supabase', { supabase, cloudbase })).toBe(supabase)
    expect(selectBackendDatabaseClient('cloudbase', { supabase, cloudbase })).toHaveProperty('rpc')
  })

  it('rejects a client that cannot provide both table and RPC access', () => {
    expect(() => adaptBackendDatabaseClient({ from: vi.fn() })).toThrow('PostgreSQL/PostgREST')
  })
})
