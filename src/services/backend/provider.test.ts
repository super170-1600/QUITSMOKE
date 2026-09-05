import { describe, expect, it } from 'vitest'
import { getAuthIdentifierKind, resolveBackendProvider } from './provider'

describe('backend provider selection', () => {
  it('keeps Supabase as the backward-compatible default', () => {
    expect(resolveBackendProvider(undefined)).toBe('supabase')
    expect(resolveBackendProvider('supabase')).toBe('supabase')
  })

  it('selects CloudBase explicitly and changes the auth identifier', () => {
    expect(resolveBackendProvider('cloudbase')).toBe('cloudbase')
    expect(getAuthIdentifierKind('cloudbase')).toBe('username')
    expect(getAuthIdentifierKind('supabase')).toBe('email')
  })

  it('rejects an unknown provider instead of silently choosing one', () => {
    expect(() => resolveBackendProvider('other')).toThrow('supabase 或 cloudbase')
  })
})
