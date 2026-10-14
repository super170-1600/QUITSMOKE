import {addLocalDays} from '@/utils/date'
import type {DailyRecord,QuitSettings} from './types'
export interface PreviewValues{days:number;baseline:number;daily:number;craving:number;price:number}
/** Local visualization input only. Never passed to a Store or persistence API. */
export function previewData(values:PreviewValues,today:string):{records:DailyRecord[];settings:QuitSettings}{
 const days=Math.max(7,Math.min(49,Math.round(values.days))),start=addLocalDays(today,1-days)
 return {
  settings:{quitStartDate:start,timezone:'Asia/Shanghai',baselineCigarettesPerDay:String(values.baseline),packPrice:String(values.price),cigarettesPerPack:20,currency:'CNY'},
  records:Array.from({length:days},(_,i)=>({date:addLocalDays(start,i),cigarettesCount:Math.max(0,Math.round(values.daily*(1-i/Math.max(1,days-1)))),cravingScore:Math.max(0,Math.min(10,Math.round(values.craving*(1-i/days*.6)+Math.sin(i*.8))))})),
 }
}
