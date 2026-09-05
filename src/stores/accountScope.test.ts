import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearProjectAccountStorage } from './accountScope'

function storage(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('project account storage cleanup', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('removes account-scoped keys while preserving display preferences', () => {
    const localStorage = storage({
      'quit-smoking-auth-user': 'administrator',
      'quit-smoking-milestone-seen-7': '1',
      'quit-smoking-display-mode': 'desktop',
      'cloudbase-sdk-session': 'managed-by-sdk-signout',
    })
    const sessionStorage = storage({ 'quit-smoking-profile-id': 'old-profile' })
    vi.stubGlobal('window', { localStorage, sessionStorage })

    clearProjectAccountStorage()

    expect(localStorage.getItem('quit-smoking-auth-user')).toBeNull()
    expect(localStorage.getItem('quit-smoking-milestone-seen-7')).toBeNull()
    expect(sessionStorage.getItem('quit-smoking-profile-id')).toBeNull()
    expect(localStorage.getItem('quit-smoking-display-mode')).toBe('desktop')
    expect(localStorage.getItem('cloudbase-sdk-session')).toBe('managed-by-sdk-signout')
  })
})
