import type { RouteRecordRaw } from 'vue-router'

export const devToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'

export const appRoutes: RouteRecordRaw[] = [
  { path: '/', component: () => import('@/views/LandingView.vue') },
  ...(import.meta.env.DEV ? [{path:'/__identity-demo',component:()=>import('@/features/identity/preview/IdentityDemo.vue'),meta:{localDemo:true}}] satisfies RouteRecordRaw[] : []),
  ...(import.meta.env.DEV ? [{path:'/__constellation-demo',component:()=>import('@/features/constellation/preview/ConstellationDemo.vue'),meta:{localDemo:true}}] satisfies RouteRecordRaw[] : []),
  ...(import.meta.env.DEV ? [{path:'/__orbital-demo',component:()=>import('@/features/insights/preview/OrbitalConsoleDemo.vue'),meta:{localDemo:true}}] satisfies RouteRecordRaw[] : []),
  ...(import.meta.env.DEV ? [{path:'/__pulse-demo',component:()=>import('@/views/PulseDemoView.vue'),meta:{localDemo:true}}] satisfies RouteRecordRaw[] : []),
  { path: '/hub', component: () => import('@/views/HubView.vue'), meta: { requiresAuth: true } },
  // Development-only visual inspection. No business data or permission bypass.
  ...(import.meta.env.DEV ? [{ path: '/__hub-preview', component: () => import('@/views/HubView.vue') }] satisfies RouteRecordRaw[] : []),
  ...(import.meta.env.DEV ? [{ path: '/__hub-module/:face(checkin|progress|achievements|support|profile)', component: () => import('@/views/HubModulePreview.vue'),meta:{localDemo:true} }] satisfies RouteRecordRaw[] : []),
  { path: '/login', component: () => import('@/views/LoginView.vue') },
  { path: '/family/setup', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/setup', component: () => import('@/views/SmokingSetupView.vue'), meta: { requiresAuth: true } },
  { path: '/home', component: () => import('@/views/HubView.vue'), meta: { requiresAuth: true } },
  { path: '/checkin', component: () => import('@/views/CheckinView.vue'), meta: { requiresAuth: true } },
  { path: '/trend', component: () => import('@/features/insights/views/InsightsPage.vue'), meta: { requiresAuth: true } },
  { path: '/family', component: () => import('@/features/constellation/views/FamilySpace.vue'), meta: { requiresAuth: true } },
  {path:'/achievements',component:()=>import('@/views/AchievementsView.vue'),meta:{requiresAuth:true}},
  { path: '/profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard', component: () => import('@/views/HubView.vue'), meta: { requiresAuth: true } },
  ...(devToolsEnabled
    ? [
        { path: '/dev', component: () => import('@/views/DevToolsView.vue'), meta: { requiresAuth: true } },
        { path: '/auth-debug', component: () => import('@/views/AuthDebugView.vue') },
      ] satisfies RouteRecordRaw[]
    : []),
]
