import {describe,it,expect} from 'vitest'
import {hubModuleDestination,resolveHubModule} from './hubModuleRoutes'
describe('Existing permission-protected module destinations',()=>{
 it('keeps checkin on its role-protected route',()=>{expect(hubModuleDestination('checkin',true)?.path).toBe('/checkin');expect(resolveHubModule('/dashboard','checkin')).toBeNull()})
 it('preserves individual modules on desktop and mobile',()=>{for(const [id,path] of [['progress','/trend'],['achievements','/achievements'],['support','/family'],['profile','/profile']] as const){expect(hubModuleDestination(id,true)).toEqual({path,query:{module:id}});expect(hubModuleDestination(id,false)?.path).toBe(path);expect(resolveHubModule(path,id)).toBe(id);expect(resolveHubModule('/dashboard',id)).toBe(id)}})
 it('rejects blank, unknown, reserved and unrelated paths',()=>{for(const id of [null,undefined,[], 'reserved','unknown'])expect(resolveHubModule('/dashboard',id)).toBeNull();expect(hubModuleDestination('reserved',true)).toBeNull();expect(resolveHubModule('/login','profile')).toBeNull();expect(resolveHubModule('/family','profile')).toBeNull()})
})
