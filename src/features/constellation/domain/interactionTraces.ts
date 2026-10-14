export interface InteractionTrace{id:string;kind:'checkin'|'encouragement';date:string}
/** Deterministic, bounded projection of confirmed records, not new achievements. */
export function interactionTraces(checkins:{id:string;checkinDate:string}[],encouragements:{id:string;type:string;createdAt:string}[]):InteractionTrace[]{
 const daily=new Map(checkins.map(row=>[row.checkinDate,{id:`checkin:${row.id}`,kind:'checkin' as const,date:row.checkinDate}]))
 const stars=encouragements.filter(row=>row.type!=='message').map(row=>({id:`encouragement:${row.id}`,kind:'encouragement' as const,date:row.createdAt}))
 const valid=[...daily.values(),...stars].filter(row=>!Number.isNaN(Date.parse(row.date)))
 const unique=Array.from(new Map(valid.map(row=>[row.id,row])).values()).sort((a,b)=>b.date.localeCompare(a.date))
 const reserved=unique.filter(row=>row.kind==='encouragement').slice(0,80)
 const chosen=new Map<string,InteractionTrace>(reserved.map(row=>[row.id,row]))
 for(const row of unique){if(chosen.size>=100)break;chosen.set(row.id,row)}
 return Array.from(chosen.values()).sort((a,b)=>a.date.localeCompare(b.date))
}
