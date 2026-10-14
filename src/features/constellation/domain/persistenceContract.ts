import {isEffectId,type EffectId} from '../config/effects'
import {validatePlan,type PlanType,type PlanStatus} from './plans'
import {normalizeUserId} from '@/services/backend/userId'
export const constellationContractVersion=1
export interface ConstellationIdentity {accountId:string;familyId:string;quitterId:string;role:'quitter'|'supporter';revision:number}
export interface RemoteEncouragement {id:string;familyId:string;senderId:string;recipientId:string;effect:EffectId;text:string;createdAt:string;readAt:string|null;source:'real'}
export interface RemotePlan {id:string;familyId:string;quitterId:string;proposerId:string;type:PlanType;start:string;end:string;target:number;title:string;status:PlanStatus;version:number;progress:number|null;coverage:number|null;sharedSummary:boolean;source:'real'}
export type RemoteAction='create'|'revise'|'accept'|'activate'|'verify'|'cancel'|'expire'|'join'|'confirm'|'share'
export interface RemotePlanMutation {requestId:string;action:RemoteAction;planId?:string;expectedVersion?:number;sharedSummary?:boolean;values?:{type:PlanType;start:string;end:string;target:number;title:string;sharedSummary:boolean}}
export interface RemotePlanEvent {id:string;planId:string;kind:string;version:number;cycle:number;createdAt:string;confirmedDate:string|null}
export function assertRequestId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Error('请保留有效请求 ID 后重试')}
export function validateRemoteMutation(input:RemotePlanMutation,identity:ConstellationIdentity){
 assertRequestId(input.requestId)
 const actions:RemoteAction[]=['create','revise','accept','activate','verify','cancel','expire','join','confirm','share']
 if(!actions.includes(input.action))throw new Error('计划动作无效')
 if(identity.role==='supporter'&&!['create','join'].includes(input.action))throw new Error('支持者不能确认或核验戒烟目标')
 if(input.action==='create'||input.action==='revise'){if(!input.values)throw new Error('缺少计划内容');validatePlan(input.values)}
 if(input.action==='share'&&typeof input.sharedSummary!=='boolean')throw new Error('请选择共享摘要开关')
 if(input.action!=='create'){if(!input.planId||!Number.isInteger(input.expectedVersion)||(input.expectedVersion??0)<1)throw new Error('需要计划 ID 与当前版本')}
}
export function decodeRemoteEvent(value:unknown,planId:string,identity:ConstellationIdentity):RemotePlanEvent{
 const row=object(value),kind=text(row.kind),date=row.confirmed_date===null?null:text(row.confirmed_date)
 const kinds=['proposed','revised','accepted','activated','confirmed','completed','corrected','missed','cancelled','expired','joined','shared']
 if(row.plan_id!==planId||!kinds.includes(kind)||!Number.isInteger(row.version)||(row.version as number)<1||!Number.isInteger(row.cycle)||(row.cycle as number)<0||identity.role==='supporter'&&(date!==null||kind==='confirmed'))throw new Error('历史事件或共享范围不匹配')
 return {id:text(row.id),planId,kind,version:row.version as number,cycle:row.cycle as number,createdAt:timestamp(row.created_at),confirmedDate:date}
}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('服务器数据契约不匹配');return value as Record<string,unknown>}
function text(value:unknown){if(typeof value!=='string')throw new Error('服务器数据契约不匹配');return value}
function timestamp(value:unknown){const result=text(value);if(!result||!Number.isFinite(Date.parse(result)))throw new Error('服务器时间无效');return result}
export function decodeRemoteEncouragement(value:unknown,identity:ConstellationIdentity):RemoteEncouragement{
 const row=object(value),familyId=text(row.family_id),senderId=normalizeUserId(row.sender_id),recipientId=normalizeUserId(row.recipient_id)
 if(familyId!==identity.familyId||recipientId!==identity.quitterId||![senderId,recipientId].includes(identity.accountId)||!isEffectId(row.effect_type))throw new Error('鼓励身份或光效不匹配')
 const message=text(row.text);if(Array.from(message).length>200)throw new Error('服务器留言长度无效')
 return {id:text(row.id),familyId,senderId,recipientId,effect:row.effect_type,text:message,createdAt:timestamp(row.created_at),readAt:row.read_at===null?null:timestamp(row.read_at),source:'real'}
}
export function decodeRemotePlan(value:unknown,identity:ConstellationIdentity):RemotePlan{
 const row=object(value),familyId=text(row.family_id),quitterId=normalizeUserId(row.quitter_id)
 if(familyId!==identity.familyId||quitterId!==identity.quitterId)throw new Error('计划所属家庭或戒烟者不匹配')
 const type=text(row.type) as PlanType,start=text(row.start_date),end=text(row.end_date),title=text(row.title),target=Number(row.target)
 validatePlan({type,start,end,title,target})
 const statuses:PlanStatus[]=['proposed','accepted','active','completed','missed','cancelled','expired'],status=text(row.status) as PlanStatus
 const proposerId=normalizeUserId(row.proposer_id),validCount=(value:unknown)=>value===null||Number.isInteger(value)&&(value as number)>=0
 if(!statuses.includes(status)||!Number.isInteger(row.version)||(row.version as number)<1||!validCount(row.progress)||!validCount(row.coverage)||typeof row.shared_summary!=='boolean')throw new Error('服务器计划状态无效')
 if(identity.role==='supporter'&&!row.shared_summary&&(proposerId!==identity.accountId||row.progress!==null||row.coverage!==null))throw new Error('未授权共享计划摘要')
 return {id:text(row.id),familyId,quitterId,proposerId,type,start,end,target,title,status,version:row.version as number,progress:row.progress as number|null,coverage:row.coverage as number|null,sharedSummary:row.shared_summary,source:'real'}
}
