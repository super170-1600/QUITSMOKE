import { describe, expect, it, vi } from 'vitest'
import { BackendError } from './errors'
import { normalizeRpcResponse, runCloudbaseRpc } from './rpc'
import { selectBackendDatabaseClient } from './database'

const uuid = '36dc6ba5-1c89-4c04-8dc1-3858ce2b833e'

describe('normalizeRpcResponse', () => {
  it.each([
    { value: { family_id: uuid } }, { value: [{ family_id: uuid }] },
    { value: 'success' }, { value: uuid }, { value: '  scalar  ' },
    { value: 42 }, { value: true }, { value: false }, { value: null },
  ])('preserves $value', ({ value }) => {
    expect(normalizeRpcResponse(value, 'create_family')).toBe(value)
  })
  it('maps undefined to null', () => {
    expect(normalizeRpcResponse(undefined, 'create_family')).toBeNull()
  })
  it.each([' {"family_id":"abc"} ', '[{"family_id":"abc"}]'])('parses JSON %s', (value) => {
    expect(normalizeRpcResponse(value, 'create_family')).toEqual(JSON.parse(value))
  })
  it.each(['{invalid', '[invalid'])('wraps malformed JSON %s with RPC context', (value) => {
    try {
      normalizeRpcResponse(value, 'join_family_by_invite_code')
      expect.fail('Expected malformed JSON to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(BackendError)
      expect(error).toMatchObject({ code: 'INVALID_RPC_RESPONSE', details: 'rpc: join_family_by_invite_code', original: expect.any(SyntaxError) })
    }
  })
})

// Reproduce the SDK's unconditional JSON.parse and error-to-response conversion.
function sdkRequest(body: string) {
  return {
    fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(body)),
    async then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
      try {
        const response = await this.fetch('https://example.test/rpc')
        return resolve({ data: JSON.parse(await response.text()), error: null })
      } catch (error) {
        return resolve({ data: null, error })
      }
    },
  }
}

describe('CloudBase RPC transport', () => {
  it.each(['create_family', 'join_family_by_invite_code'])('%s shares normalization before SDK parsing', async (name) => {
    const request = sdkRequest(uuid)
    const transport = request.fetch
    const rpc = vi.fn().mockReturnValue(request)
    const adapter = selectBackendDatabaseClient('cloudbase', { cloudbase: { from: vi.fn(), rpc }, supabase: null })
    await expect(adapter.rpc(name, { member_role: 'supporter' })).resolves.toMatchObject({ data: uuid, error: null })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('preserves BackendError even when SDK catches the parse failure', async () => {
    await expect(runCloudbaseRpc(sdkRequest('{bad') as never, 'create_family')).rejects.toMatchObject({
      name: 'BackendError', details: 'rpc: create_family',
    })
  })
  it('preserves server errors', async () => {
    const error = { code: '42501', message: 'denied' }
    await expect(runCloudbaseRpc(Promise.resolve({ data: null, error }), 'create_family')).resolves.toEqual({ data: null, error })
  })
})
