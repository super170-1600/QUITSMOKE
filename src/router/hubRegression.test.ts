import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  authenticated: true, hasFamily: true, role: 'quitter', hasProfile: true, desktop: true,
}))
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, createWebHashHistory: actual.createMemoryHistory }
})
vi.mock('./routes', async () => {
  const actual = await vi.importActual<typeof import('./routes')>('./routes')
  return { ...actual, appRoutes: actual.appRoutes.map(route => ({ ...route, component: { render: () => null } })) }
})
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ initialized: true, get isAuthenticated() { return state.authenticated } }) }))
vi.mock('@/stores/family', () => ({ useFamilyStore: () => ({
  initializeFamily: async () => undefined,
  get hasFamily() { return state.hasFamily },
  get isQuitter() { return state.role === 'quitter' },
  get isSupporter() { return state.role === 'supporter' },
  get currentMember() { return state.hasFamily ? { role: state.role } : null },
}) }))
vi.mock('@/stores/smoking', () => ({ useSmokingStore: () => ({ ensureSmokingProfileLoaded: async () => state.hasProfile ? {} : null }) }))
vi.mock('@/composables/useDisplayMode', () => ({ useDisplayMode: () => ({ isDesktop: { get value() { return state.desktop } } }) }))

import router from './index'

beforeEach(async () => {
  Object.assign(state, { authenticated: true, hasFamily: true, role: 'quitter', hasProfile: true, desktop: true })
  await router.push('/')
})
describe('original route guard with added hub', () => {
  it('allows configured quitters and supporters to visit hub on either viewport', async () => {
    for (const role of ['quitter', 'supporter']) for (const desktop of [false, true]) {
      state.role = role; state.desktop = desktop
      await router.push('/'); await router.push('/hub')
      expect(router.currentRoute.value.path).toBe('/hub')
    }
  })
  it('preserves anonymous redirect and the exact hub deep link', async () => {
    state.authenticated = false
    await router.push('/hub')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/hub')
  })
  it('moves family setup into Identity while keeping smoking onboarding', async () => {
    state.hasFamily = false; await router.push('/hub')
    expect(router.currentRoute.value.path).toBe('/hub')
    await router.push('/family/setup');expect(router.currentRoute.value.path).toBe('/profile');expect(router.currentRoute.value.query.section).toBe('family');
    await router.push('/family');expect(router.currentRoute.value.path).toBe('/profile');
    state.hasFamily = true; state.hasProfile = false; await router.push('/hub')
    expect(router.currentRoute.value.path).toBe('/setup')
    state.role = 'supporter'; await router.push('/hub')
    expect(router.currentRoute.value.path).toBe('/hub')
  })
  it('still prevents supporters from entering checkin or smoking setup', async () => {
    state.role = 'supporter'; state.desktop = false
    for (const path of ['/checkin', '/setup']) {
      await router.push(path)
      expect(router.currentRoute.value.path).toBe('/hub')
    }
  })
  it('redirects legacy dashboards to the crystal and keeps canonical new modules',async()=>{
    for(const path of ['/home','/dashboard']){await router.push('/');await router.push(path);expect(router.currentRoute.value.path).toBe('/hub')}
    for(const path of ['/trend','/family','/profile','/achievements']){await router.push(path);expect(router.currentRoute.value.path).toBe(path)}
  })
  it('keeps old dashboard deep links on the new identity route',async()=>{
    for(const desktop of [true,false]){state.desktop=desktop;await router.push('/');await router.push('/dashboard?module=profile');expect(router.currentRoute.value.path).toBe('/profile');expect(router.currentRoute.value.query.module).toBe('profile')}
  })
  it('sends signed-in login visits to the new hub',async()=>{await router.push('/login');expect(router.currentRoute.value.path).toBe('/hub')})
})