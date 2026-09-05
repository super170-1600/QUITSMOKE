import type { RouteRecordRaw } from 'vue-router'

export const devToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'

export const appRoutes: RouteRecordRaw[] = [
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
      ] satisfies RouteRecordRaw[]
    : []),
]

