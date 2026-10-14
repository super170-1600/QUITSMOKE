import {describe,it,expect} from 'vitest'
import {interactionTraces} from './interactionTraces'
describe('confirmed interaction traces',()=>{
 it('keeps encouragement marks represented despite many newer checkins',()=>{const days=Array.from({length:49},(_,i)=>({id:String(i),checkinDate:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10)}));const rows=interactionTraces(days,[{id:'older-star',type:'heart',createdAt:'2026-08-01'}]);expect(rows).toHaveLength(50);expect(rows.some(row=>row.id==='encouragement:older-star')).toBe(true)})
 it('deduplicates edited days and reactions and excludes chat',()=>{const rows=interactionTraces([{id:'old',checkinDate:'2026-10-14'},{id:'new',checkinDate:'2026-10-14'}],[{id:'r',type:'heart',createdAt:'2026-10-14T10:00:00Z'},{id:'r',type:'heart',createdAt:'2026-10-14T10:00:00Z'},{id:'m',type:'message',createdAt:'2026-10-14'}]);expect(rows).toHaveLength(2);expect(rows.map(row=>row.id)).toContain('checkin:new')})
 it('caps the recent display and ignores invalid dates',()=>{expect(interactionTraces([],Array.from({length:150},(_,i)=>({id:String(i),type:'clap',createdAt:'2026-10-14'})))).toHaveLength(100);expect(interactionTraces([{id:'bad',checkinDate:'invalid'}],[])).toEqual([])})
})
