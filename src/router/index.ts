import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { resolveOnboardingState } from '@/utils/onboarding'
import { useDisplayMode } from '@/composables/useDisplayMode'

const devToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'
const mobileMainRoutes = new Set(['/home', '/trend', '/family', '/profile'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: () => import('@/views/LoginView.vue') },
    { path: '/family/setup', component: () => import('@/views/FamilySetupView.vue'), meta: { requiresAuth: true } },
    { path: '/setup', component: () => import('@/views/SmokingSetupView.vue'), meta: { requiresAuth: true } },
    { path: '/home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
    { path: '/checkin', component: () => import('@/views/CheckinView.vue'), meta: { requiresAuth: true } },
    { path: '/trend', component: () => import('@/views/TrendView.vue'), meta: { requiresAuth: true } },
    { path: '/family', component: () => import('@/views/FamilyView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', component: () => import('@/views/DesktopDashboardView.vue'), meta: { requiresAuth: true } },
    ...(devToolsEnabled
      ? [
          { path: '/dev', component: () => import('@/views/DevToolsView.vue'), meta: { requiresAuth: true } },
          { path: '/auth-debug', component: () => import('@/views/AuthDebugView.vue') },
        ]
      : []),
  ],
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
