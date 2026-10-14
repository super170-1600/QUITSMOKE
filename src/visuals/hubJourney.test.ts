import { afterEach, describe, expect, it } from 'vitest'
import { hubJourney, isJourneyModule, hubDestinations } from './hubJourney'
import { appRoutes } from '@/router/routes'
afterEach(()=>{hubJourney.mode='idle';hubJourney.target='';hubJourney.face=null})
describe('spatial route handoff',()=>{
  it('maps enabled faces to existing protected routes and gives no destination to the reserved face',()=>{
    expect(hubDestinations.reserved).toBeUndefined()
    for(const path of Object.values(hubDestinations))expect(appRoutes.find(r=>r.path===path)?.meta?.requiresAuth).toBe(true)
  })
  it('does not overlay unrelated routes, fresh deep links or a closing hub',()=>{
    hubJourney.target='/trend'
    expect(isJourneyModule('/trend')).toBe(false)
    hubJourney.mode='module'
    expect(isJourneyModule('/trend')).toBe(true)
    expect(isJourneyModule('/login')).toBe(false)
    hubJourney.mode='closing'
    expect(isJourneyModule('/trend')).toBe(false)
  })
})
