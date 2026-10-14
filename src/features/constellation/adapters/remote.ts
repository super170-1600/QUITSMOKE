import {getBackendDatabase,runBackendRequest} from '@/services/backend'
import {normalizeRpcResponse} from '@/services/backend/rpc'
import {isEffectId,type EffectId} from '../config/effects'
import {assertRequestId,constellationContractVersion,decodeRemoteEncouragement,decodeRemotePlan,decodeRemoteEvent,validateRemoteMutation,type ConstellationIdentity,type RemotePlanMutation} from '../domain/persistenceContract'
type Rpc=(name:string,args:Record<string,unknown>)=>Promise<unknown>
export interface RemoteConfiguration {approved:boolean;identity:()=>ConstellationIdentity|null;rpc?:Rpc}
/** Prepared transport only: not instantiated by the demo or production routes. No silent mock fallback. */
export function createConstellationRemote(config:RemoteConfiguration){
 const rpc:Rpc=config.rpc??(async(name,args)=>{const result=await runBackendRequest(getBackendDatabase().rpc(name,args),'共生星图请求');return normalizeRpcResponse(result.data,name)})
 let readyFor='',generation=0,busy=false
 const key=(scope:ConstellationIdentity)=>JSON.stringify([scope.accountId,scope.familyId,scope.quitterId,scope.role,scope.revision])
 function scope(){if(!config.approved)throw new Error('S4 数据契约和迁移尚未确认，真实服务未启用');const value=config.identity();if(!value)throw new Error('请先登录并选择家庭戒烟者');return {...value}}
 function assertCurrent(snapshot:ConstellationIdentity,revision:number){if(revision!==generation||key(config.identity()??{} as ConstellationIdentity)!==key(snapshot))throw new Error('账号、家庭或目标已切换，请重新读取')}
 async function connect(){readyFor='';const identity=scope(),revision=generation,result=await rpc('nico_constellation_capabilities',{});assertCurrent(identity,revision);const data=result as {contract_version?:unknown;provider?:unknown;features?:unknown;timezone?:unknown},features=data?.features;if(!data||data.contract_version!==constellationContractVersion||!Array.isArray(features)||!['effects','plans','receipts','events'].every(feature=>features.includes(feature)))throw new Error('后端未部署兼容的共生星图服务');readyFor=key(identity);return data}
 async function request(name:string,args:Record<string,unknown>,write=false){const identity=scope(),revision=generation;if(readyFor!==key(identity))throw new Error('请先核对后端服务能力');if(write&&busy)throw new Error('请等待当前请求完成');if(write)busy=true;try{const result=await rpc(name,{...args,p_family_id:identity.familyId,p_quitter_id:identity.quitterId});assertCurrent(identity,revision);return {result,identity}}finally{if(write&&generation===revision)busy=false}}
 return {
  connect,
  clear(){generation++;readyFor='';busy=false},
  async send(input:{requestId:string;effect:EffectId;text:string}){const identity=scope();assertRequestId(input.requestId);if(identity.role!=='supporter')throw new Error('仅支持者可发送此鼓励');if(!isEffectId(input.effect)||Array.from(input.text.trim()).length>200)throw new Error('光效或留言无效');const {result,identity:captured}=await request('nico_send_encouragement',{p_request_id:input.requestId,p_effect_type:input.effect,p_text:input.text.trim()},true);const row=decodeRemoteEncouragement(result,captured);if(row.senderId!==captured.accountId)throw new Error('发送结果与本人不匹配');return row},
  async inbox(){const {result,identity}=await request('nico_list_encouragements',{});if(!Array.isArray(result)||result.length>100)throw new Error('鼓励列表数据契约不匹配');return result.map(row=>decodeRemoteEncouragement(row,identity))},
  async markRead(id:string){if(scope().role!=='quitter')throw new Error('仅接收者可标记已查看');const {result,identity}=await request('nico_mark_encouragement_read',{p_id:id},true);const row=decodeRemoteEncouragement(result,identity);if(row.id!==id||!row.readAt)throw new Error('已查看回执不匹配');return row},
  async plans(){const {result,identity}=await request('nico_list_plans',{});if(!Array.isArray(result)||result.length>100)throw new Error('计划列表数据契约不匹配');return result.map(row=>decodeRemotePlan(row,identity))},
  async history(planId:string){const {result,identity}=await request('nico_list_plan_events',{p_plan_id:planId});if(!Array.isArray(result)||result.length>100)throw new Error('历史列表数据契约不匹配');return result.map(row=>decodeRemoteEvent(row,planId,identity))},
  async mutate(input:RemotePlanMutation){validateRemoteMutation(input,scope());const {result,identity}=await request('nico_mutate_plan',{p_request:input},true);const data=result as {plan:unknown;event_id:unknown;transitioned:unknown};if(!data||typeof data.transitioned!=='boolean'||(data.event_id!==null&&typeof data.event_id!=='string'))throw new Error('计划事件回执无效');const plan=decodeRemotePlan(data.plan,identity);if(input.planId&&plan.id!==input.planId)throw new Error('更新回执与计划不匹配');if(data.transitioned&&plan.status==='completed'&&!data.event_id)throw new Error('完成状态缺少持久化事件');return {plan,eventId:data.event_id as string|null,transitioned:data.transitioned}},
 }
}
