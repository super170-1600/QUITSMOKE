import type {CheckinModel} from '@/types/domain'
import {moodLabels} from '@/utils/dailyPulse'
export const haloTokens={warmWhite:'#edca8d',silverBlue:'#438eaf',warmGold:'#c18a35',softBlue:'#667d9b',edge:'#7f9dab',missing:'#b2c2ca'} as const
export function haloMood(mood:CheckinModel['mood']){
 const appearances={
  relaxed:{color:haloTokens.warmWhite,shape:'soft'},
  calm:{color:haloTokens.silverBlue,shape:'smooth'},
  anxious:{color:'#9375c6',shape:'orbit'},
  irritable:{color:'#cb7144',shape:'faceted'},
  tired:{color:'#526d90',shape:'low'},
  fulfilled:{color:haloTokens.warmGold,shape:'radiant'},
 } as const
 return mood?appearances[mood]:{color:haloTokens.warmWhite,shape:'smooth' as const}
}
/** Visual encoding of an absolute count, never a recovery percentage or health score. */
export function haloAmount(cigarettes:number|null|undefined){
 const known=typeof cigarettes==='number'&&Number.isFinite(cigarettes)&&cigarettes>=0
 const intensity=known?Math.log1p(Math.min(200,cigarettes))/Math.log(201):0
 return {known,intensity,coverage:known?1-intensity*.8:0,fragments:known?(cigarettes===0?1:5+Math.floor(intensity*13)):0}
}
export function haloVisual(date:string,record:CheckinModel|null|undefined,isToday=false){
 if(!record)return {status:isToday?'today':'missing',complete:false,color:haloTokens.warmWhite,texture:0,label:`${date}，${isToday?'今天待记录':'无记录，未填写'}`} as const
 return {status:'recorded',complete:record.cigarettes===0,color:haloMood(record.mood).color,texture:record.cravingScore===undefined?0:Math.floor(record.cravingScore/2)+1,label:`${date}，${record.cigarettes} 支，${record.cravingScore===undefined?`旧量表烟瘾 ${record.cravingLevel}/5`:`当天最强烟瘾 ${record.cravingScore}/10`}，${record.mood?moodLabels[record.mood]:'感受未记录'}`} as const
}
/** Ring position depends only on the slot, never on the record set. */
export function haloSlot(index:number){if(!Number.isInteger(index)||index<0||index>=28)throw new Error('Invalid slot');const ring=Math.floor(index/7),angle=(index%7)*Math.PI*2/7,radius=17+ring*10;return {ring,indexInRing:index%7,x:50+Math.sin(angle)*radius,y:50-Math.cos(angle)*radius}}
