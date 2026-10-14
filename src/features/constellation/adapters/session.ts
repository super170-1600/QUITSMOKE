import {createConstellationRemote,type RemoteConfiguration} from './remote'
import {validateRemoteMutation,type RemoteEncouragement,type RemotePlan,type RemotePlanMutation} from '../domain/persistenceContract'
import {isEffectId,type EffectId} from '../config/effects'
type Command={kind:'send';input:{requestId:string;effect:EffectId;text:string}}|{kind:'plan';input:RemotePlanMutation}
export type SessionSnapshot={ready:boolean;busy:boolean;pending:boolean;error:string;timezone:string;encouragements:RemoteEncouragement[];plans:RemotePlan[]}
/** Page-lifetime staging coordinator. Construct only after the target database is approved.
 * No timers, optimistic writes, storage of private drafts, or automatic mock fallback.
 */
export function createConstellationSession(config:RemoteConfiguration,onChange:(state:SessionSnapshot)=>void=()=>{},makeId:()=>string=()=>crypto.randomUUID()){
 const remote=createConstellationRemote(config)
 let generation=0,scopeKey='',command:Command|undefined,refreshVersion=0
 let state:SessionSnapshot={ready:false,busy:false,pending:false,error:'',timezone:'',encouragements:[],plans:[]}
 const identityKey=()=>JSON.stringify(config.identity())
 const snapshot=():SessionSnapshot=>({...state,encouragements:state.encouragements.map(row=>({...row})),plans:state.plans.map(row=>({...row}))})
 function publish(){onChange(snapshot())}
 function reset(){generation++;refreshVersion++;remote.clear();scopeKey='';command=undefined;state={ready:false,busy:false,pending:false,error:'',timezone:'',encouragements:[],plans:[]};publish()}
 function syncIdentity(){if(scopeKey&&scopeKey!==identityKey())reset()}
 function current(token:number){syncIdentity();if(token!==generation)throw new Error('账号、家庭或目标已切换，请重新连接')}
 function ready(){syncIdentity();if(!state.ready)throw new Error('真实服务尚未就绪');if(state.busy)throw new Error('请等待当前请求完成')}
 const message=(error:unknown)=>error instanceof Error?error.message:'请求失败'
 async function execute(){ready();if(!command)throw new Error('没有待确认请求');const token=generation,captured=command;state.busy=true;state.error='';publish()
  try{const result=captured.kind==='send'?await remote.send(captured.input):await remote.mutate(captured.input);current(token)
   // Commit only the authoritative receipt; reads do not overwrite unrelated entries.
   if(captured.kind==='send'){const row=result as RemoteEncouragement;state.encouragements=[row,...state.encouragements.filter(item=>item.id!==row.id)].slice(0,100)}
   else{const receipt=result as Awaited<ReturnType<typeof remote.mutate>>;state.plans=[receipt.plan,...state.plans.filter(item=>item.id!==receipt.plan.id)].slice(0,100)}
   command=undefined;state.pending=false;return result
  }catch(error){syncIdentity();if(token===generation){state.pending=true;state.error=`${message(error)}；未确认成功，请保留原请求重试`}throw error}
  finally{syncIdentity();if(token===generation){state.busy=false;publish()}}
 }
 return {
  get state(){syncIdentity();return snapshot()},
  reset,
  async connect(){syncIdentity();if(state.busy||command)throw new Error('请先处理待确认请求');reset();const token=generation;scopeKey=identityKey();state.busy=true;publish()
   try{const capabilities=await remote.connect();current(token);if(capabilities.timezone!=='Asia/Shanghai')throw new Error('服务端计划时区不兼容');state.timezone=capabilities.timezone;state.ready=true}
   catch(error){syncIdentity();if(token===generation){remote.clear();state.error=message(error);state.ready=false}throw error}
   finally{syncIdentity();if(token===generation){state.busy=false;publish()}}
  },
  async refresh(){ready();if(command)throw new Error('请先重试待确认请求');const token=generation,version=++refreshVersion;state.busy=true;state.error='';publish()
   try{const [encouragements,plans]=await Promise.all([remote.inbox(),remote.plans()]);current(token);if(version!==refreshVersion)return;state.encouragements=encouragements;state.plans=plans}
   catch(error){syncIdentity();if(token===generation&&version===refreshVersion)state.error=message(error);throw error}
   finally{syncIdentity();if(token===generation&&version===refreshVersion){state.busy=false;publish()}}
  },
  send(input:{effect:EffectId;text:string}){ready();if(command)throw new Error('有待确认请求，请重试原请求');if(config.identity()?.role!=='supporter')throw new Error('仅支持者可发送此鼓励');if(!isEffectId(input.effect)||Array.from(input.text.trim()).length>200)throw new Error('光效或留言无效');command={kind:'send',input:{...input,text:input.text.trim(),requestId:makeId()}};return execute()},
  mutate(input:Omit<RemotePlanMutation,'requestId'>){ready();if(command)throw new Error('有待确认请求，请重试原请求');const value=structuredClone({...input,requestId:makeId()});validateRemoteMutation(value,config.identity()!);command={kind:'plan',input:value};return execute()},
  retry(){return execute()},
  async markRead(id:string){ready();if(command)throw new Error('请先处理待确认请求');const token=generation;state.busy=true;state.error='';publish()
   try{const row=await remote.markRead(id);current(token);state.encouragements=state.encouragements.map(item=>item.id===id?row:item);return row}
   catch(error){syncIdentity();if(token===generation)state.error=message(error);throw error}
   finally{syncIdentity();if(token===generation){state.busy=false;publish()}}
  },
  async history(planId:string){ready();const token=generation;const events=await remote.history(planId);current(token);return events},
 }
}
