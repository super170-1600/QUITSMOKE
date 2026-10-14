import { reactive } from 'vue'
import type { HubFaceId } from '@/config/hubModules'

/** Ephemeral presentation state; no account or business data. */
export const hubJourney = reactive({
  origin: '/hub', face: null as HubFaceId|null,
  mode: 'idle' as 'idle'|'opening'|'module'|'closing', target: '',
  progress: 1, transitioning:false,
  anchor:{x:.5,y:.5,width:.2,height:.2},
})
export const hubDestinations: Partial<Record<HubFaceId,string>> = {
  checkin:'/checkin', progress:'/trend', achievements:'/achievements', support:'/family', profile:'/profile',
}
export function isJourneyModule(path:string) {
  return hubJourney.mode==='module' && path===hubJourney.target
}
