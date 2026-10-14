import {PGlite} from '../artifacts/constellation-db-runtime/node_modules/@electric-sql/pglite/dist/index.js'
import {constellationMigration} from './build-constellation-migration.mjs'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const results=[]
for(const provider of ['cloudbase','supabase']){
 const db=new PGlite(),checks=[]
 try{
  const native=provider==='cloudbase'?'bigint':'uuid',ids=provider==='cloudbase'?['9007199254740993','9007199254740994','9007199254740995','9007199254740996','9007199254740997']:Array.from({length:5},()=>randomUUID()),[q,a,b,c,outsider]=ids
  const family=randomUUID(),otherFamily=randomUUID()
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function public.current_user_id() returns bigint language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::bigint$$;
   create function public.current_request_role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
   create table public.profiles(id ${native} primary key);
   create table public.families(id uuid primary key);
   create table public.family_members(family_id uuid references families(id),user_id ${native} references profiles(id),role text,primary key(family_id,user_id));
   create table public.checkins(id uuid primary key default gen_random_uuid(),user_id ${native},checkin_date date,cigarettes integer,craving_level integer,note text,unique(user_id,checkin_date));
   create table public.encouragements(id uuid primary key default gen_random_uuid(),family_id uuid references families(id),from_user_id ${native} references profiles(id),to_user_id ${native} references profiles(id),type text check(type in ('heart','like','clap','fire','celebrate','message')),message text check(char_length(message)<=200),created_at timestamptz default now());
   create function public.is_family_member(p_id uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.family_members where family_id=p_id and user_id::text=current_setting('request.jwt.claim.sub',true))$$;
   grant usage on schema public,auth to anon,authenticated;
   insert into profiles values ${ids.map(id=>`('${id}')`).join(',')};insert into families values('${family}'),('${otherFamily}');
   insert into family_members values('${family}','${q}','quitter'),('${family}','${a}','supporter'),('${family}','${b}','supporter'),('${family}','${c}','supporter'),('${otherFamily}','${outsider}','supporter');`)
  const migration=await constellationMigration(provider)
  await assert.rejects(db.exec(migration),/Deployment requires/);await db.exec('rollback;');checks.push('deployment approval gate')
  await db.exec("set nico.s4_deployment_approved='v1';");await db.exec(migration);checks.push('complete additive migration executes')
  const actor=async(id,role='authenticated')=>{await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.role','${role}',false);set role ${role};`)}
  const owner=()=>db.exec('reset role;')
  const rpc=async(name,args)=>{const keys=Object.keys(args),sql=`select public.${name}(${keys.map((key,i)=>`${key}=>$${i+1}`).join(',')}) as result`;return (await db.query(sql,keys.map(key=>typeof args[key]==='object'?JSON.stringify(args[key]):args[key]))).rows[0].result}
  const scope={p_family_id:family,p_quitter_id:q}
  await actor(a,'anon');await assert.rejects(rpc('nico_constellation_capabilities',{}),/permission denied/)
  await actor(outsider);await assert.rejects(rpc('nico_list_plans',scope),/membership required/);checks.push('anonymous and cross-family denied')
  await actor(a);assert.equal((await rpc('nico_constellation_capabilities',{})).contract_version,1)
  await assert.rejects(db.query('select * from nico_plans'),/permission denied/)
  await assert.rejects(db.query('select nico_private.nico_evaluate($1)',[randomUUID()]),/permission denied/);checks.push('raw private tables and helpers inaccessible')
  const request=randomUUID(),send={...scope,p_request_id:request,p_effect_type:'bloom',p_text:'陪伴'}
  const sent=await rpc('nico_send_encouragement',send);assert.equal(sent.sender_id,a);assert.equal(sent.recipient_id,q)
  assert.equal((await rpc('nico_send_encouragement',send)).id,sent.id)
  await assert.rejects(rpc('nico_send_encouragement',{...send,p_text:'other'}),/different payload/)
  await assert.rejects(rpc('nico_send_encouragement',{...send,p_request_id:randomUUID()}),/cooldown/)
  await owner();assert.equal((await db.query('select count(*)::int as n from encouragements')).rows[0].n,1);checks.push('atomic encouragement, bigint-safe strings, retry idempotency, key conflict, server cooldown')
  await actor(b);assert.deepEqual(await rpc('nico_list_encouragements',scope),[])
  await actor(a);await assert.rejects(rpc('nico_mark_encouragement_read',{...scope,p_id:sent.id}),/Recipient required/)
  await actor(q);const read=await rpc('nico_mark_encouragement_read',{...scope,p_id:sent.id});assert.ok(read.read_at);assert.equal((await rpc('nico_mark_encouragement_read',{...scope,p_id:sent.id})).read_at,read.read_at);checks.push('recipient-only stable read receipt, no third-party inbox')
  await owner();await db.exec("create function public.test_nico_failure() returns trigger language plpgsql as $$begin raise exception 'Injected optics failure';end $$;create trigger test_nico_failure before insert on nico_encouragement_effects for each row execute function test_nico_failure();")
  const interrupted={...scope,p_request_id:randomUUID(),p_effect_type:'halo',p_text:'测试回滚'}
  await actor(c);await assert.rejects(rpc('nico_send_encouragement',interrupted),/Injected optics failure/);await owner();assert.equal((await db.query('select count(*)::int as n from encouragements')).rows[0].n,1);assert.equal((await db.query('select count(*)::int as n from nico_requests where actor_id=$1',[c])).rows[0].n,0)
  await db.exec('drop trigger test_nico_failure on nico_encouragement_effects;drop function test_nico_failure();');await actor(c);assert.ok((await rpc('nico_send_encouragement',interrupted)).id);checks.push('mid-write optics failure rolls back legacy row and receipt, same request retry succeeds')
  const today=(await db.query("select (now() at time zone 'Asia/Shanghai')::date::text as day")).rows[0].day
  const date=(delta)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
  const command=(request)=>rpc('nico_mutate_plan',{...scope,p_request:request})
  const create=async(type,target=3,start=date(-2),end=today,sharedSummary=false)=>command({requestId:randomUUID(),action:'create',values:{type,title:type,start,end,target,sharedSummary}})
  const mutate=async(receipt,action,more={})=>command({requestId:randomUUID(),action,planId:receipt.plan.id,expectedVersion:receipt.plan.version,...more})
  const start=async(receipt)=>mutate(await mutate(receipt,'accept'),'activate')
  const setCounts=async(counts)=>{await owner();await db.query('delete from checkins where user_id=$1',[q]);for(let i=0;i<counts.length;i++)if(counts[i]!==null)await db.query('insert into checkins(user_id,checkin_date,cigarettes,note) values($1,$2,$3,$4)',[q,date(i-2),counts[i],'PRIVATE NOTE']);await actor(q)}
  await actor(a);const proposal=await create('records');assert.equal(proposal.plan.progress,null);assert.equal(proposal.plan.coverage,null)
  await assert.rejects(mutate(proposal,'accept'),/Quitter required/)
  await assert.rejects(create('records',3,date(-2),today,true),/Only quitter may share/)
  await actor(q);let active=await start(proposal)
  await setCounts([2,3,1]);let done=await mutate(active,'verify');assert.equal(done.plan.status,'completed');assert.ok(done.event_id);assert.equal(done.transitioned,true)
  const repeat=await mutate(done,'verify');assert.equal(repeat.transitioned,false);assert.equal(repeat.event_id,null)
  const hist=await rpc('nico_list_plan_events',{...scope,p_plan_id:done.plan.id});assert.equal(hist.filter(e=>e.kind==='completed').length,1);checks.push('supporter proposal redacted, owner-only accept, nonzero consecutive records, completion event once')
  await setCounts([0,null,0]);let zero=await start(await create('smokeFree'));let pending=await mutate(zero,'verify');assert.equal(pending.plan.status,'active');assert.equal(pending.plan.progress,1)
  await setCounts([0,0,0]);done=await mutate(pending,'verify');assert.equal(done.plan.status,'completed')
  await setCounts([0,2,0]);const corrected=await mutate(done,'verify');assert.equal(corrected.plan.status,'active');assert.equal(corrected.transitioned,false)
  await setCounts([0,0,0]);const again=await mutate(corrected,'verify');assert.equal(again.plan.status,'completed');const history=await rpc('nico_list_plan_events',{...scope,p_plan_id:again.plan.id});assert.equal(history.filter(e=>e.kind==='completed').length,2);assert.equal(history.filter(e=>e.kind==='corrected').length,1);checks.push('missing not zero, backfill, correction, durable completion cycles')
  await setCounts([2,null,4]);let cap=await start(await create('limit',10));assert.equal((await mutate(cap,'verify')).plan.status,'active');await setCounts([2,3,4]);assert.equal((await mutate(cap,'verify')).plan.status,'completed');checks.push('limit requires whole-range coverage and actual total')
  let scene=await start(await create('scene',1,today,today));assert.equal((await mutate(scene,'verify')).plan.status,'active');scene=await mutate(scene,'confirm');assert.equal(scene.plan.status,'completed');checks.push('scene is explicit owner self-confirmation')
  let revised=await start(await create('scene',2,today,date(1)));revised=await mutate(revised,'confirm');assert.equal(revised.plan.progress,1);revised=await mutate(revised,'revise',{values:{type:'scene',title:'新版行为目标',start:today,end:date(1),target:2,sharedSummary:false}});revised=await start(revised);assert.equal(revised.plan.progress,0);checks.push('revision preserves history without carrying self confirmations into new target')
  let future=await create('records',1,date(1),date(1));future=await mutate(future,'accept');await assert.rejects(mutate(future,'activate'),/Cannot activate/)
  let expired=await create('records',1,date(-4),date(-4));assert.equal((await mutate(expired,'expire')).plan.status,'expired');let cancelled=await create('records');cancelled=await mutate(cancelled,'cancel');assert.equal(cancelled.plan.status,'cancelled');await assert.rejects(mutate(cancelled,'verify'),/Cannot verify/);checks.push('future activation denied, expired/cancelled lifecycle guards')
  let shared=await create('records',3,date(-2),today,true);await actor(a);shared=await mutate(shared,'join');await actor(b);shared=await mutate(shared,'join');await actor(c);await assert.rejects(mutate(shared,'join'),/Two supporters maximum/);checks.push('two supporters per plan, existing family remains intact')
  await actor(a);assert.ok((await rpc('nico_list_plans',scope)).some(p=>p.id===shared.plan.id&&p.progress!==null));await actor(q);shared=await mutate(shared,'share',{sharedSummary:false});await actor(a);assert.ok(!(await rpc('nico_list_plans',scope)).some(p=>p.id===shared.plan.id));checks.push('sharing opt-in, withdrawal removes access')
  await actor(q);let proposal2=await create('records');const stale={requestId:randomUUID(),action:'accept',planId:proposal2.plan.id,expectedVersion:proposal2.plan.version};proposal2=await command(stale);const retry=await command(stale);assert.equal(retry.plan.version,proposal2.plan.version);assert.equal(retry.transitioned,false);await assert.rejects(command({...stale,requestId:randomUUID()}),/version conflict/)
  await assert.rejects(command({requestId:randomUUID(),action:'verify',planId:proposal2.plan.id,expectedVersion:proposal2.plan.version,progress:999}),/Unrecognized/);checks.push('optimistic versions, stable retry, client progress rejected')
  await owner();const before=(await db.query('select count(*)::int as n from nico_plans')).rows[0].n;await actor(q);await assert.rejects(create('records',100,today,today),/constraint/);await owner();assert.equal((await db.query('select count(*)::int as n from nico_plans')).rows[0].n,before);checks.push('invalid target rolls back all new writes')
  await db.query('delete from encouragements where id=$1',[sent.id]);assert.equal((await db.query('select count(*)::int as n from nico_encouragement_effects where encouragement_id=$1',[sent.id])).rows[0].n,0);const deletedReceipt=(await db.query('select payload,response from nico_requests where actor_id=$1 and request_id=$2',[a,request])).rows[0];assert.ok(!JSON.stringify(deletedReceipt).includes('陪伴'));await actor(a);await assert.rejects(rpc('nico_send_encouragement',send),/deleted/);checks.push('deleted encouragement removes optics, no copied plaintext remains in receipt, retry cannot recreate deleted event')
  await owner();await db.query('delete from family_members where family_id=$1 and user_id=$2',[family,a]);await actor(a);await assert.rejects(rpc('nico_list_encouragements',scope),/membership required/);checks.push('leaving family immediately removes access')
  results.push({provider,checks,status:'passed',note:'Real PostgreSQL WASM, synthetic users and minimal existing-table fixture; not deployed CloudBase or Supabase.'})
 }finally{await db.close()}
}
// Integration against the repository's complete existing schemas, including their
// original RLS and family/check-in triggers. Only vendor auth fixture and pgcrypto
// availability differ from a deployed provider.
for(const provider of ['cloudbase','supabase']){
 const db=new PGlite()
 try{
  const native=provider==='cloudbase'?'bigint':'uuid',q=provider==='cloudbase'?'9007199254740993':randomUUID(),a=provider==='cloudbase'?'9007199254740994':randomUUID(),family=randomUUID()
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id ${native} primary key,email text,name text,username text,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
   grant usage on schema auth,public to authenticated,anon;${provider==='supabase'?'create publication supabase_realtime;':''}`)
  const baseline=await readFile(provider==='cloudbase'?'docs/database_cloudbase.sql':'docs/database.sql','utf8')
  await db.exec(baseline.replace('create extension if not exists pgcrypto;','-- Isolated WASM uses PostgreSQL native gen_random_uuid().'))
  await db.query('insert into auth.users(id,email,name,username) values($1,$2,$3,$4),($5,$6,$7,$8)',[q,'quitter@test.invalid','戒烟者','quitter',a,'support@test.invalid','支持者','support'])
  await db.query('insert into families(id,name,invite_code,created_by) values($1,$2,$3,$4)',[family,'SQL测试家庭','SQLTEST1',q])
  await db.query("insert into family_members(family_id,user_id,role) values($1,$2,'quitter'),($1,$3,'supporter')",[family,q,a])
  await db.query("insert into smoking_profiles(user_id,quit_start_date,baseline_daily_cigarettes,cigarettes_per_pack,price_per_pack) values($1,current_date-10,20,20,30)",[q])
  await db.query('insert into checkins(user_id,checkin_date,cigarettes,craving_level,note) values($1,current_date,0,2,$2)',[q,'PRIVATE NOTE'])
  const oldFunctions=(await db.query("select proname,pg_get_functiondef(oid) as definition from pg_proc where pronamespace='public'::regnamespace order by proname")).rows
  const oldTriggers=(await db.query("select tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal order by tgname")).rows
  const oldCheckins=(await db.query('select * from checkins order by id')).rows
  await db.exec("set nico.s4_deployment_approved='v1';");await db.exec(await constellationMigration(provider))
  for(const fn of oldFunctions)assert.equal((await db.query('select pg_get_functiondef(oid) as definition from pg_proc where pronamespace=$1::regnamespace and proname=$2',['public',fn.proname])).rows[0].definition,fn.definition)
  assert.deepEqual((await db.query("select tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal order by tgname")).rows,oldTriggers)
  assert.deepEqual((await db.query('select * from checkins order by id')).rows,oldCheckins)
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[a]);await db.exec('set role authenticated;')
  const sent=(await db.query('select nico_send_encouragement($1,$2,$3,$4,$5) as result',[family,q,randomUUID(),'glow','陪伴'])).rows[0].result
  assert.equal(sent.sender_id,a);assert.equal((await db.query('select type,message from encouragements where id=$1',[sent.id])).rows[0].type,'heart')
  results.push({provider,integration:'complete repository baseline',status:'passed',checks:['original RLS and trigger schema installed','legacy function definitions unchanged','legacy triggers unchanged','private check-in records unchanged','new transaction writes legacy encouragement readable by original policy'],note:'Vendor auth.users is synthetic; CloudBase-only pgcrypto install statement omitted because PostgreSQL provides gen_random_uuid natively in this WASM runtime.'})
 }finally{await db.close()}
}
await mkdir('artifacts/constellation-s4',{recursive:true});await writeFile('artifacts/constellation-s4/database-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
