import type { HubFaceId } from '@/config/hubModules'
import { hubDestinations } from './hubJourney'
export function hubModuleDestination(face:HubFaceId,desktop:boolean){
  const path=hubDestinations[face]
  if(!path)return null
  return {path,query:{module:face}}
}
/** Only render modules on their existing permission-protected destinations. */
export function resolveHubModule(path:string,module:unknown):HubFaceId|null {
  if(typeof module!=='string'||module==='reserved')return null
  const id=module as HubFaceId,destination=hubDestinations[id]
  if(!destination)return null
  return destination===path||(path==='/dashboard'&&id!=='checkin')?id:null
}
