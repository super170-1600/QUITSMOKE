import {addLocalDays,getLocalDateString,parseLocalDate} from './date'
export const moods=['relaxed','calm','anxious','irritable','tired','fulfilled'] as const
export type DailyMood=typeof moods[number]
export const moodLabels:Record<DailyMood,string>={relaxed:'轻松',calm:'平静',anxious:'焦虑',irritable:'烦躁',tired:'疲惫',fulfilled:'充实'}
export const pulsePrefix='@nico/v1:'
export function decodePulseNote(note:string|null){
 if(note?.startsWith(pulsePrefix)){try{const value=JSON.parse(note.slice(pulsePrefix.length));if(Number.isInteger(value.score)&&value.score>=0&&value.score<=10&&moods.includes(value.mood)&&typeof value.note==='string')return {note:value.note,cravingScore:value.score as number,mood:value.mood as DailyMood}}catch{/* Preserve unrecognized legacy text. */}}
 return {note:note??'',cravingScore:undefined,mood:undefined}
}
export function encodePulseNote(note:string,score:number,mood:DailyMood){
 if(!Number.isInteger(score)||score<0||score>10||!moods.includes(mood))throw new Error('请选择 0–10 的烟瘾强度与每日感受')
 const value=pulsePrefix+JSON.stringify({score,mood,note:note.trim()})
 if(Array.from(value).length>300||Array.from(note).length>160)throw new Error('备注较长或包含过多特殊字符，请缩短后保存')
 return value
}
export function validatePulseDate(date:string,start:string,today=getLocalDateString()){
 parseLocalDate(date);parseLocalDate(start)
 if(date>today)throw new Error('未来日期不能打卡')
 if(date<start)throw new Error('补签从戒烟开始日期起开放')
}
export function archiveDates(today:string,offset=0,days=28){if(!Number.isInteger(offset)||offset<0||!Number.isInteger(days)||days<1)throw new Error('Invalid window');const end=addLocalDays(today,-days*offset);return Array.from({length:days},(_,i)=>addLocalDays(end,i-days+1))}
export function archiveWeekDates(today:string,offset=0){const weekday=parseLocalDate(today).getDay();const sunday=addLocalDays(today,(7-weekday)%7);return archiveDates(sunday,offset,49)}
