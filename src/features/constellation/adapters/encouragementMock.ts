import {isEffectId,type EffectId} from '../config/effects'
export interface MockEncouragement {id:string;senderId:'sample-a'|'sample-b';recipientId:'sample-core';effect:EffectId;text:string;createdAt:string;read:boolean;source:'mock'}
export function createEncouragementMock(storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>,key='nico-local-encouragement-history'){
 const records:MockEncouragement[]=[]
 let sequence=0,failNext=false
 try{const saved=storage?.getItem(key);if(saved){const rows=JSON.parse(saved);if(Array.isArray(rows)){records.push(...rows.filter(row=>row?.source==='mock'&&typeof row.id==='string'&&isEffectId(row.effect)&&['sample-a','sample-b'].includes(row.senderId)&&typeof row.createdAt==='string'&&!Number.isNaN(Date.parse(row.createdAt))&&typeof row.text==='string').slice(0,100));sequence=Math.max(0,...records.map(row=>Number(row.id.replace('mock-',''))||0))}}}catch{/* Invalid local samples are not treated as confirmed history. */}
 function persist(){if(storage)try{storage.setItem(key,JSON.stringify(records))}catch{throw new Error('本地历史保存失败，请检查浏览器存储权限')}}
 return {
  list:()=>records.map(record=>({...record})),
  ensureExamples:(members=2)=>{if(records.length||members===0)return;const previous=sequence;const ids:EffectId[]=['glow','starlight','bloom'];ids.forEach((effect,index)=>{records.push({id:`mock-${++sequence}`,senderId:members>1&&index===1?'sample-b':'sample-a',recipientId:'sample-core',effect,text:'示例鼓励 · 可点击追溯',createdAt:new Date(Date.now()-index*3600000).toISOString(),read:false,source:'mock'})});try{persist()}catch(error){records.splice(0);sequence=previous;throw error}},
  failNext:()=>{failNext=true},
  markRead:(id:string)=>{const item=records.find(record=>record.id===id);if(item){const old=item.read;item.read=true;try{persist()}catch(error){item.read=old;throw error}}},
  clear:()=>{storage?.removeItem(key);records.splice(0);failNext=false},
  async send(input:{senderId:'sample-a'|'sample-b';effect:EffectId;text:string},signal:AbortSignal){
   if(!isEffectId(input.effect))throw new Error('请选择光效')
   if(input.senderId!=='sample-a'&&input.senderId!=='sample-b')throw new Error('模拟成员无效')
   const text=input.text.trim();if(Array.from(text).length>200)throw new Error('留言最多 200 字')
   await new Promise<void>((resolve,reject)=>{
    if(signal.aborted){reject(new DOMException('已取消','AbortError'));return}
    const abort=()=>{clearTimeout(timer);reject(new DOMException('已取消','AbortError'))}
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},180)
    signal.addEventListener('abort',abort,{once:true})
   })
   if(signal.aborted)throw new DOMException('已取消','AbortError')
   if(failNext){failNext=false;throw new Error('模拟发送失败，输入已保留，可重试')}
   const record:MockEncouragement={id:`mock-${++sequence}`,senderId:input.senderId,recipientId:'sample-core',effect:input.effect,text,createdAt:new Date().toISOString(),read:false,source:'mock'}
   const old=records.slice();records.unshift(record);records.splice(storage?100:20);try{persist()}catch(error){records.splice(0,records.length,...old);throw error}return {...record}
  },
 }
}
