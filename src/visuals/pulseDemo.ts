import {reactive} from 'vue'
import type {CheckinModel,CheckinFormValues} from '@/types/domain'
import {addLocalDays,getLocalDateString} from '@/utils/date'
import {decodePulseNote,encodePulseNote,validatePulseDate,moods} from '@/utils/dailyPulse'
export const pulseDemoStorageKey='nico-local-pulse-demo-v1'
/** Local-only repository: never sets account stores or imports a backend client. */
export function createPulseDemo(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,today=getLocalDateString()){
 const profile={id:'local-demo',quitStartDate:addLocalDays(today,-90),baselineDailyCigarettes:20,cigarettesPerPack:20,pricePerPack:30}
 function samples():CheckinModel[]{return Array.from({length:26},(_,i)=>{const day=i+2,date=addLocalDays(today,-day);return {id:`demo-${date}`,checkinDate:date,cigarettes:day%4===0?2:0,cravingLevel:2,cravingScore:day%11,mood:moods[day%moods.length],note:'示例记录，可自由修改',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}).filter((_,i)=>i%5!==0)}
 let records=samples()
 try{const raw=storage.getItem(pulseDemoStorageKey);if(raw){const saved=JSON.parse(raw);if(saved.version===1&&Array.isArray(saved.records)&&saved.records.every((row:CheckinModel)=>typeof row.checkinDate==='string'&&typeof row.id==='string'&&Number.isInteger(row.cigarettes)&&typeof row.note==='string'))records=saved.records}}catch{/* Invalid or unavailable storage starts with samples; saving reports errors. */}
 const source=reactive({
  smokingProfile:profile,checkins:records,
  async ensureStatisticsLoaded(){},
  async loadDailyCheckin(date:string){return source.checkins.find(row=>row.checkinDate===date)??null},
  async saveDailyCheckin(values:CheckinFormValues){
   validatePulseDate(values.checkinDate,profile.quitStartDate)
   if(!Number.isInteger(values.cigarettes)||values.cigarettes<0||values.cigarettes>200)throw new Error('吸烟量须为 0–200 的整数')
   const decoded=decodePulseNote(encodePulseNote(values.note,values.cravingScore!,values.mood!)),old=source.checkins.find(row=>row.checkinDate===values.checkinDate),now=new Date().toISOString()
   const row:CheckinModel={id:old?.id??`demo-${values.checkinDate}`,checkinDate:values.checkinDate,cigarettes:values.cigarettes,cravingLevel:1+Math.round(values.cravingScore!*4/10),...decoded,createdAt:old?.createdAt??now,updatedAt:now}
   const next=source.checkins.filter(item=>item.checkinDate!==row.checkinDate).concat(row)
   try{storage.setItem(pulseDemoStorageKey,JSON.stringify({version:1,records:next}))}catch{throw new Error('当前浏览器不能保存测试记录，请允许本地存储后重试')}
   source.checkins=next;return row
  },
  reset(){storage.removeItem(pulseDemoStorageKey);source.checkins=samples()},
 })
 return source
}
export type PulseDataSource=Pick<ReturnType<typeof createPulseDemo>,'smokingProfile'|'checkins'|'ensureStatisticsLoaded'|'loadDailyCheckin'|'saveDailyCheckin'>
