import {beforeEach,describe,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {useSmokingStore} from './smoking'
import {getLocalDateString,addLocalDays} from '@/utils/date'
const mock=vi.hoisted(()=>({rows:new Map<string,any>(),creates:0,fail:false,collision:false,history:null as (()=>Promise<any[]>)|null}))
vi.mock('@/stores/auth',()=>({useAuthStore:()=>({user:{id:'owner'}})}))
vi.mock('@/api/checkin',()=>({getTodayCheckin:async()=>null,getCheckinsBetween:async()=>mock.history?mock.history():[],getCheckinByDate:async(date:string)=>mock.rows.get(date)??null,createCheckin:async(input:any)=>{if(mock.fail)throw new Error('offline');if(mock.collision){mock.collision=false;mock.rows.set(input.checkin_date,{...input,id:'raced',created_at:'actual-now'});throw {code:'23505'}}mock.creates++;const row={...input,id:input.checkin_date,created_at:'actual-now',updated_at:'actual-now'};mock.rows.set(input.checkin_date,row);return row},updateCheckin:async(id:string,input:any)=>{const row=[...mock.rows.values()].find(row=>row.id===id);Object.assign(row,input,{updated_at:'changed-now'});return row}}))
vi.mock('@/api/smokingProfile',()=>({getMySmokingProfile:async()=>({id:'p',quit_start_date:'2020-01-01',baseline_daily_cigarettes:20,cigarettes_per_pack:20,price_per_pack:30}),createMySmokingProfile:vi.fn(),updateMySmokingProfile:vi.fn()}))
beforeEach(()=>{setActivePinia(createPinia());mock.rows.clear();mock.creates=0;mock.fail=false;mock.collision=false;mock.history=null})
describe('Date-based checkin writes',()=>{
 const values=(date:string,cigarettes=0)=>({checkinDate:date,cigarettes,cravingLevel:2,note:''})
 it('updates the selected date, never a cached today row',async()=>{const store=useSmokingStore(),today=getLocalDateString(),yesterday=addLocalDays(today,-1);await store.saveDailyCheckin(values(today,3));await store.saveDailyCheckin(values(yesterday,0));await store.saveDailyCheckin(values(yesterday,2));expect(mock.creates).toBe(2);expect(mock.rows.get(today).cigarettes).toBe(3);expect(mock.rows.get(yesterday)).toMatchObject({cigarettes:2,created_at:'actual-now',updated_at:'changed-now'});expect(store.checkins).toHaveLength(2)})
 it('recovers a concurrent unique-key collision using that date',async()=>{mock.collision=true;await useSmokingStore().saveDailyCheckin(values(getLocalDateString(),4));expect(mock.rows.size).toBe(1);expect([...mock.rows.values()][0]).toMatchObject({id:'raced',cigarettes:4})})
 it('does not put failed writes into the cache',async()=>{mock.fail=true;const store=useSmokingStore();await expect(store.saveDailyCheckin(values(getLocalDateString()))).rejects.toThrow('offline');expect(store.checkins).toHaveLength(0)})
 it('rejects future dates and reads missing days as null',async()=>{const store=useSmokingStore();await expect(store.saveDailyCheckin(values(addLocalDays(getLocalDateString(),1)))).rejects.toThrow();expect(await store.loadDailyCheckin('2026-01-01')).toBeNull()})
 it('does not overwrite a confirmed save when an older history read arrives late',async()=>{
  const store=useSmokingStore(),date=getLocalDateString();let finish!:(rows:any[])=>void
  mock.history=vi.fn(()=>new Promise<any[]>(resolve=>{finish=resolve}))
  const loading=store.loadStatistics();await vi.waitFor(()=>expect(mock.history).toHaveBeenCalled())
  await store.saveDailyCheckin(values(date,2));finish([]);await loading
  expect(store.checkins.find(row=>row.checkinDate===date)?.cigarettes).toBe(2)
  expect(store.statistics?.actualCigarettes).toBe(2)
 })
 it('does not restore a stale history row after the date read confirms it is absent',async()=>{
  const store=useSmokingStore(),date=getLocalDateString();let finish!:(rows:any[])=>void
  mock.history=vi.fn(()=>new Promise<any[]>(resolve=>{finish=resolve}))
  const loading=store.loadStatistics();await vi.waitFor(()=>expect(mock.history).toHaveBeenCalled())
  await store.loadDailyCheckin(date);finish([{id:'old',checkin_date:date,cigarettes:8,craving_level:2,note:null}]);await loading
  expect(store.checkins).toHaveLength(0)
 })
})
