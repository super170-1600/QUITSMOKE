import { describe, expect, it } from 'vitest'
import { mapAuthResult } from './authMapping'

describe('CloudBase auth adapter mapping', () => {
  it('normalizes a CloudBase numeric user id into the shared session shape', () => {
    const result = mapAuthResult({
      data: {
        user: { id: 123, username: 'father', is_anonymous: false },
        session: {
          access_token: 'access',
          refresh_token: 'refresh',
          user: { id: 123, username: 'father', is_anonymous: false },
        },
      },
      error: null,
    })

    expect(result.session?.user).toMatchObject({ id: '123', username: 'father', isAnonymous: false })
    expect(result.session?.accessToken).toBe('access')
  })

  it('does not treat the Publishable Key anonymous identity as an app login', () => {
    const result = mapAuthResult({
      data: {
        session: {
          access_token: 'anonymous-access',
          user: { id: 9, role: ['anon'], is_anonymous: true },
        },
      },
      error: null,
    })
    expect(result.session).toBeNull()
    expect(result.user).toBeNull()
  })

  it('maps the direct Session shape emitted by CloudBase auth state changes', () => {
    const result = mapAuthResult({
      access_token: 'next-access',
      refresh_token: 'next-refresh',
      user: { id: '9876543210123456789', username: 'supporter', is_anonymous: false },
    })

    expect(result.session?.user.id).toBe('9876543210123456789')
    expect(result.session?.accessToken).toBe('next-access')
  })

  it('prefers the CloudBase string uid over a numeric id field', () => {
    const result = mapAuthResult({
      data: {
        user: {
          uid: '12345678901234567890',
          id: Number.MAX_SAFE_INTEGER + 1,
          username: 'quitter',
          is_anonymous: false,
        },
        session: {
          access_token: 'access',
          user: {
            uid: '12345678901234567890',
            id: Number.MAX_SAFE_INTEGER + 1,
            username: 'quitter',
            is_anonymous: false,
          },
        },
      },
      error: null,
    })

    expect(result.session?.user.id).toBe('12345678901234567890')
    expect(result.user?.id).toBe('12345678901234567890')
  })

  it('does not mistake user_metadata.uid for the JWT/database identity', () => {
    const result = mapAuthResult({
      data: {
        user: {
          id: '2002',
          user_metadata: { uid: 'legacy-provider-uid', username: 'new-user' },
          is_anonymous: false,
        },
        session: {
          access_token: 'access',
          user: {
            id: '2002',
            user_metadata: { uid: 'legacy-provider-uid', username: 'new-user' },
            is_anonymous: false,
          },
        },
      },
      error: null,
    })

    expect(result.session?.user.id).toBe('2002')
    expect(result.session?.user.username).toBe('new-user')
  })

  it('rejects metadata uid as the only available identity', () => {
    const result = mapAuthResult({
      data: {
        user: {
          user_metadata: { uid: 'wrong-profile-id', username: '170' },
          is_anonymous: false,
        },
        session: {
          access_token: 'access',
          user: {
            user_metadata: { uid: 'wrong-profile-id', username: '170' },
            is_anonymous: false,
          },
        },
      },
      error: null,
    })

    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
  })
})
