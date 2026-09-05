import { describe, expect, it, vi } from 'vitest'
import { createCloudbaseAuthAdapter } from './auth'

function rawUser(id: string, username: string) {
  return { id, uid: id, username, is_anonymous: false }
}

describe('CloudBase current-user reconciliation', () => {
  it('uses the SDK current user after login instead of a stale response snapshot', async () => {
    const client = {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: rawUser('2096101953535741952', 'administrator'),
          session: {
            access_token: 'old-access',
            user: rawUser('2096101953535741952', 'administrator'),
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: rawUser('2096107842256662530', '170') },
        error: null,
      }),
    }
    const adapter = createCloudbaseAuthAdapter(client as never)

    const result = await adapter.signIn('170', 'not-logged')

    expect(client.signInWithPassword).toHaveBeenCalledWith({ username: '170', password: 'not-logged' })
    expect(result.session?.user).toMatchObject({
      id: '2096107842256662530',
      username: '170',
    })
  })

  it('restores the session using the current SDK user', async () => {
    const client = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'persisted-access',
            user: rawUser('2096101953535741952', 'administrator'),
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: rawUser('2096107842256662530', '170') },
        error: null,
      }),
    }
    const adapter = createCloudbaseAuthAdapter(client as never)

    const session = await adapter.getSession()

    expect(session?.user.id).toBe('2096107842256662530')
    expect(session?.user.username).toBe('170')
  })
})
