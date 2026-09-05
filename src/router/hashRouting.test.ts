import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { appRoutes } from './routes'

describe('hash router deployment contract', () => {
  it('keeps every deployed business path in the route table', () => {
    const paths = new Set(appRoutes.map((route) => route.path))
    for (const path of ['/', '/login', '/home', '/family', '/family/setup', '/trend', '/profile']) {
      expect(paths.has(path), `missing route ${path}`).toBe(true)
    }
    if (import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true') {
      expect(paths.has('/auth-debug')).toBe(true)
    }
  })

  it('preserves a login redirect query without adding a hash to the route value', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: appRoutes })
    const login = router.resolve('/login?redirect=/home')

    expect(login.path).toBe('/login')
    expect(login.query.redirect).toBe('/home')
    expect(router.resolve(login.query.redirect as string).path).toBe('/home')
  })

  it('resolves nested family setup paths independently from the hosting pathname', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: appRoutes })
    const matched = router.resolve('/family/setup').matched
    expect(matched[matched.length - 1]?.path).toBe('/family/setup')
  })
})
