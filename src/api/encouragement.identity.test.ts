import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getFamilyMembers, getMyFamilyMembership, getMyFamilies } from './family'
import { getEncouragements, sendReaction } from './encouragement'
import { getFamilyMessages } from './message'

const state = vi.hoisted(() => ({ database: null as unknown }))
vi.mock('@/services/backend', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/backend')>(),
  getBackendDatabase: () => state.database,
  getAuthenticatedUserId: async () => '2096107842256662530',
}))

const familyId = '36dc6ba5-1c89-4c04-8dc1-3858ce2b833e'
const supporterId = '2096107842256662530'
const quitterId = '2096133324830961665'
let sent: Record<string, unknown>

beforeEach(() => {
  sent = {}
  // Use the real PostgREST query builder and JSON decoder. The mock server
  // emits bigint JSON numbers unless the query requests a text cast.
  state.database = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input))
        const select = url.searchParams.get('select') ?? ''
        const encodedId = (field: string, id: string) => select.includes(`${field}::text`) ? JSON.stringify(id) : id
        const table = url.pathname.split('/').pop()
        if (table === 'family_members') {
          return new Response(`[{"id":"member","family_id":"${familyId}","user_id":${encodedId('user_id', quitterId)},"role":"quitter","profiles":{"nickname":"老爸"}}]`)
        }
        if (table === 'families') {
          return new Response(`[{"id":"${familyId}","created_by":${encodedId('created_by', quitterId)}}]`)
        }
        if (table === 'messages') {
          return new Response(`[{"id":"message","sender_id":${encodedId('sender_id', quitterId)},"profiles":{"nickname":"老爸"}}]`)
        }
        const row = `{"id":"reaction","family_id":"${familyId}","from_user_id":${encodedId('from_user_id', supporterId)},"to_user_id":${encodedId('to_user_id', quitterId)},"type":"heart","message":null}`
        if (init?.method === 'POST') {
          sent = JSON.parse(String(init.body))
          return new Response(row, { status: 201 })
        }
        return new Response(`[${row}]`)
      },
    },
  })
})

describe('family chat bigint identity round trip', () => {
  it('sends the exact selected member ID and preserves returned sender/recipient IDs', async () => {
    const [member] = await getFamilyMembers(familyId)
    expect(member?.user_id).toBe(quitterId)
    const reaction = await sendReaction({ familyId, toUserId: member!.user_id, type: 'heart' })
    expect(sent).toMatchObject({ from_user_id: supporterId, to_user_id: quitterId, family_id: familyId })
    expect(reaction).toMatchObject({ from_user_id: supporterId, to_user_id: quitterId })
  })

  it('preserves IDs when refreshing membership, families, chat and encouragements', async () => {
    expect((await getMyFamilyMembership())[0]?.user_id).toBe(quitterId)
    expect((await getMyFamilies())[0]?.created_by).toBe(quitterId)
    expect((await getFamilyMessages(familyId))[0]?.sender_id).toBe(quitterId)
    expect((await getEncouragements(familyId))[0]).toMatchObject({ from_user_id: supporterId, to_user_id: quitterId })
  })
})
