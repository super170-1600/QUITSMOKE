import { createRouter, createWebHashHistory, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { resolveOnboardingState } from '@/utils/onboarding'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { appRoutes, devToolsEnabled } from './routes'

const mobileMainRoutes = new Set(['/home', '/trend', '/family', '/profile'])

const router = createRouter({
  history: createWebHashHistory(),
  routes: appRoutes,
})

async function resolveAuthenticatedRoute(to: RouteLocationNormalized) {
  const familyStore = useFamilyStore()
  const smokingStore = useSmokingStore()
  await familyStore.initializeFamily()

  let hasSmokingProfile = false
  if (familyStore.isQuitter) {
    hasSmokingProfile = Boolean(await smokingStore.ensureSmokingProfileLoaded())
  }

  const state = resolveOnboardingState({
    authenticated: true,
    hasFamily: familyStore.hasFamily,
    role: familyStore.currentMember?.role ?? null,
    hasSmokingProfile,
  })

  if (state === 'family_setup') {
    return to.path === '/family/setup' ? undefined : '/family/setup'
  }
  if (to.path === '/family/setup') return '/family'

  if (familyStore.isSupporter && (to.path === '/checkin' || to.path === '/setup')) {
    return '/home'
  }
  if (to.path === '/dev' && (!devToolsEnabled || familyStore.isSupporter)) return '/home'
  if (state === 'smoking_setup') {
    return to.path === '/setup' ? undefined : '/setup'
  }
  if (to.path === '/setup' && to.query.edit !== '1') return '/home'
  const { isDesktop } = useDisplayMode()
  if (isDesktop.value && mobileMainRoutes.has(to.path)) return '/dashboard'
  if (!isDesktop.value && to.path === '/dashboard') return '/home'
  return undefined
}

router.beforeEach(async (to) => {
  if ((to.path === '/dev' || to.path === '/auth-debug') && !devToolsEnabled) return '/home'
  const authStore = useAuthStore()
  if (!authStore.initialized) {
    try {
      await authStore.initialize()
    } catch {
      // The login form reports configuration or network errors.
    }
  }

  if (to.path === '/auth-debug') return undefined

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && authStore.isAuthenticated) return '/home'
  if (!authStore.isAuthenticated) return undefined

  try {
    return await resolveAuthenticatedRoute(to)
  } catch (error: unknown) {
    console.error('初始化家庭状态失败', error)
    return undefined
  }
})

export default router
