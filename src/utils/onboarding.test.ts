import { describe, expect, it } from 'vitest'
import { resolveOnboardingState } from '@/utils/onboarding'

describe('resolveOnboardingState', () => {
  it('sends unauthenticated users to login', () => expect(resolveOnboardingState({ authenticated: false, hasFamily: false, role: null, hasSmokingProfile: false })).toBe('login'))
  it('sends users without a family to family setup', () => expect(resolveOnboardingState({ authenticated: true, hasFamily: false, role: null, hasSmokingProfile: false })).toBe('family_setup'))
  it('sends quitters without a smoking profile to smoking setup', () => expect(resolveOnboardingState({ authenticated: true, hasFamily: true, role: 'quitter', hasSmokingProfile: false })).toBe('smoking_setup'))
  it('marks configured quitters as ready', () => expect(resolveOnboardingState({ authenticated: true, hasFamily: true, role: 'quitter', hasSmokingProfile: true })).toBe('ready'))
  it('does not require a smoking profile from supporters', () => expect(resolveOnboardingState({ authenticated: true, hasFamily: true, role: 'supporter', hasSmokingProfile: false })).toBe('ready'))
})
