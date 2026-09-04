import type { FamilyRole } from '@/types/database'

export type OnboardingState = 'login' | 'family_setup' | 'smoking_setup' | 'ready'

export interface OnboardingContext {
  authenticated: boolean
  hasFamily: boolean
  role: FamilyRole | null
  hasSmokingProfile: boolean
}

export function resolveOnboardingState(context: OnboardingContext): OnboardingState {
  if (!context.authenticated) return 'login'
  if (!context.hasFamily || !context.role) return 'family_setup'
  if (context.role === 'quitter' && !context.hasSmokingProfile) return 'smoking_setup'
  return 'ready'
}
