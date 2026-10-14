import {beforeEach,describe,it,expect,vi} from 'vitest'
import {createClient} from '@supabase/supabase-js'
import {createPinia,setActivePinia} from 'pinia'
import {useSmokingStore} from './smoking'
import {addLocalDays,getLocalDateString} from '@/utils/date'
const state=vi.hoisted(()=>({database:null as unknown,rows:new Map<string,any>(),fail:false}))
vi.mock('@/stores/auth',()=>({useAuthStore:()=>({user:{id:'owner'}})}))
vi.mock('@/services/backend',async original=>({...await original<typeof import('@/services/backend')>(),getBackendDatabase:()=>state.database,getAuthenticatedUserId:async()=> 'owner'}))
beforeEach(()=>{
 state.rows.clear();state.fail=false;setActivePinia(createPinia())
 state.database=createClient('https://example.test','test',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init?.method??'GET',profile={id:'p',user_id:'owner',quit_start_date:addLocalDays(getLocalDateString(),-60),baseline_daily_cigarettes:20,cigarettes_per_pack:20,price_per_pack:30}
  const single=new Headers(init?.headers).get('accept')?.includes('pgrst.object'),json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
  if(url.pathname.endsWith('/smoking_profiles'))return json(single?profile:[profile])
  const date=url.searchParams.get('checkin_date')?.replace(/^eq\./,'')
  if(method==='GET'){const rows=[...state.rows.values()].filter(row=>!date||row.checkin_date===date);return json(single?rows[0]:rows)}
  if(state.fail)return json({code:'TEST_FAILURE',message:'Isolated backend write failed'},500)
  const values=JSON.parse(String(init?.body)),stamp=new Date().toISOString()
  if(method==='POST'){if(state.rows.has(values.checkin_date))return json({code:'23505',message:'Unique date'},409);const row={...values,id:values.checkin_date,created_at:stamp,updated_at:stamp};state.rows.set(row.checkin_date,row);return json(row,201)}
  const id=url.searchParams.get('id')?.replace(/^eq\./,''),row=[...state.rows.values()].find(row=>row.id===id);Object.assign(row,values,{updated_at:stamp});return json(row)
 }}})
})
describe('Real store + API contract over isolated persistent backend',()=>{
 it('creates today, reloads, updates the same record, and preserves exact metadata',async()=>{
  const date=getLocalDateString(),values={checkinDate:date,cigarettes:0,cravingLevel:1,cravingScore:0,mood:'calm' as const,note:'今天感受'}
  await useSmokingStore().saveDailyCheckin(values);setActivePinia(createPinia());const reloaded=useSmokingStore();expect(await reloaded.loadDailyCheckin(date)).toMatchObject({cigarettes:0,cravingScore:0,mood:'calm',note:'今天感受'})
  const created=state.rows.get(date).created_at;await reloaded.saveDailyCheckin({...values,cigarettes:4,cravingScore:10,mood:'anxious'});setActivePinia(createPinia());expect(await useSmokingStore().loadDailyCheckin(date)).toMatchObject({cigarettes:4,cravingScore:10,mood:'anxious'});expect(state.rows.size).toBe(1);expect(state.rows.get(date).created_at).toBe(created)
 })
 it('backfills yesterday with actual creation time and leaves today unchanged',async()=>{
  const today=getLocalDateString(),date=addLocalDays(today,-1),store=useSmokingStore();await store.saveDailyCheckin({checkinDate:today,cigarettes:3,cravingLevel:2,note:''});const result=await store.saveDailyCheckin({checkinDate:date,cigarettes:0,cravingLevel:1,cravingScore:2,mood:'fulfilled',note:'补签'});expect(getLocalDateString(new Date(result.createdAt!))).toBe(today);expect(state.rows.get(today).cigarettes).toBe(3);expect(state.rows.size).toBe(2)
 })
 it('does not claim success when the backend rejects a write',async()=>{state.fail=true;const store=useSmokingStore();await expect(store.saveDailyCheckin({checkinDate:getLocalDateString(),cigarettes:0,cravingLevel:1,note:''})).rejects.toThrow();expect(state.rows.size).toBe(0);expect(store.checkins).toHaveLength(0)})
})
