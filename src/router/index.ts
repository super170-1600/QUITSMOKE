import { createRouter, createWebHashHistory, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { useSmokingStore } from '@/stores/smoking'
import { resolveOnboardingState } from '@/utils/onboarding'

import { appRoutes, devToolsEnabled } from './routes'
import { hubModuleDestination, resolveHubModule } from '@/visuals/hubModuleRoutes'



const router = createRouter({
  history: createWebHashHistory(),
  routes: appRoutes,
})

async function resolveAuthenticatedRoute(to: RouteLocationNormalized) {
  const familyStore = useFamilyStore()
  const smokingStore = useSmokingStore()
  await familyStore.initializeFamily()

  // Family onboarding lives inside Identity; the crystal remains accessible.
  if(to.path==='/family/setup')return {path:'/profile',query:{section:'family'}}
  if(!familyStore.hasFamily){
    if(['/hub','/profile','/login'].includes(to.path))return undefined
    if(['/home','/dashboard'].includes(to.path))return '/hub'
    return {path:'/profile',query:{section:'family'}}
  }
  if(to.path==='/profile')return undefined

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

  if (familyStore.isSupporter && (to.path === '/checkin' || to.path === '/setup')) {
    return '/hub'
  }
  if (to.path === '/dev' && (!devToolsEnabled || familyStore.isSupporter)) return '/hub'
  if (state === 'smoking_setup') {
    return to.path === '/setup' ? undefined : '/setup'
  }
  if (to.path === '/setup' && to.query.edit !== '1') return '/hub'
  const module = resolveHubModule(to.path,to.query.module)
  if(to.path==='/home')return to.query.module==='achievements'?{path:'/achievements',query:{...to.query,module:'achievements'}}:'/hub'
  if(to.path==='/dashboard')return module?{...hubModuleDestination(module,false)!,query:{...to.query,module}}:'/hub'
  return undefined
}

router.beforeEach(async (to) => {
  // Isolated development demo uses local samples and never initializes an account.
  if(import.meta.env.DEV&&to.meta.localDemo)return undefined
  // The public cover must render immediately, even when the backend is offline.
  if (to.path === '/') return undefined
  if ((to.path === '/dev' || to.path === '/auth-debug') && !devToolsEnabled) return '/hub'
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
  if (to.path === '/login' && authStore.isAuthenticated) return '/hub'
  if (!authStore.isAuthenticated) return undefined

  try {
    return await resolveAuthenticatedRoute(to)
  } catch (error: unknown) {
    console.error('初始化家庭状态失败', error)
    return undefined
  }
})

export default router
