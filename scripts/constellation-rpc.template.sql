-- Reviewed S4 contract implementation. New functions/tables only; no old table DDL.
create schema nico_private;
revoke all on schema nico_private from public,anon,authenticated;
create function nico_private.nico_scope(p_family_id uuid,p_quitter_id text) returns __USER_TYPE__
language plpgsql security definer set search_path='' as $$
declare v_actor __USER_TYPE__ := __CALLER__;
begin
 if not coalesce(__AUTH_CHECK__,false) then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Membership before family matches the existing leave RPC lock order.
 perform 1 from public.family_members where family_id=p_family_id and user_id=v_actor for share;
 if not found then raise exception 'Family membership required' using errcode='42501'; end if;
 perform 1 from public.family_members where family_id=p_family_id and user_id::text=p_quitter_id and role='quitter' for share;
 if not found then raise exception 'Quitter unavailable' using errcode='42501'; end if;
 perform 1 from public.families where id=p_family_id for key share;
 if not found then raise exception 'Family unavailable' using errcode='42501'; end if;
 return v_actor;
end $$;

create function nico_private.nico_evaluate(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.nico_plans%rowtype;r record;v_today date:=(now() at time zone 'Asia/Shanghai')::date;
 v_run integer:=0;v_best integer:=0;v_coverage integer:=0;v_total integer:=0;v_confirmed integer:=0;v_missing boolean:=false;v_ok boolean;v_progress integer;v_eligible boolean;
begin
 select * into strict p from public.nico_plans where id=p_id;
 -- One query snapshot; neither missing nor future records are fabricated.
 for r in select g.day::date as day,c.cigarettes,
  exists(select 1 from public.nico_plan_events e where e.plan_id=p.id and e.kind='confirmed' and e.goal_revision=p.goal_revision and e.confirmed_date=g.day::date) as confirmed
  from pg_catalog.generate_series(p.start_date::timestamp,p.end_date::timestamp,interval '1 day') g(day)
  left join public.checkins c on c.user_id=p.quitter_id and c.checkin_date=g.day::date and g.day::date<=v_today
  order by g.day
 loop
  if r.cigarettes is not null then v_coverage:=v_coverage+1;v_total:=v_total+r.cigarettes;end if;
  if r.day<=v_today and r.cigarettes is null and p.type<>'scene' then v_missing:=true;end if;
  v_ok:=r.day<=v_today and case when p.type='scene' then r.confirmed else r.cigarettes is not null and (p.type<>'smokeFree' or r.cigarettes=0) end;
  if v_ok then v_run:=v_run+1;v_confirmed:=v_confirmed+1;else v_run:=0;end if;
  v_best:=greatest(v_best,v_run);
 end loop;
 v_progress:=case when p.type='limit' then v_coverage when p.type='scene' then v_confirmed else v_best end;
 v_eligible:=case when p.type='limit' then v_coverage=p.end_date-p.start_date+1 and v_today>=p.end_date and v_total<=p.target else v_progress>=p.target end;
 return jsonb_build_object('progress',v_progress,'coverage',v_coverage,'eligible',v_eligible,'pending',v_missing,
  'outcome',case when v_eligible then 'completed' when v_today>p.end_date and not v_missing then 'missed' else 'active' end);
end $$;

create function nico_private.nico_plan_json(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.nico_plans%rowtype;v jsonb;v_full boolean;
begin
 if not public.nico_can_read_plan(p_id) then raise exception 'Plan access denied' using errcode='42501';end if;
 select * into strict p from public.nico_plans where id=p_id;
 v_full:=p.quitter_id=__CALLER__ or (p.shared_summary and exists(select 1 from public.nico_plan_participants where plan_id=p.id and user_id=__CALLER__));
 if v_full then v:=nico_private.nico_evaluate(p_id);end if;
 return jsonb_build_object('id',p.id,'family_id',p.family_id,'quitter_id',p.quitter_id::text,'proposer_id',p.proposer_id::text,
  'type',p.type,'title',p.title,'start_date',p.start_date,'end_date',p.end_date,'target',p.target,'status',p.status,'version',p.version,
  'shared_summary',p.shared_summary,'progress',v->'progress','coverage',v->'coverage','reason',p.reason);
end $$;

create function nico_private.nico_encouragement_json(p_id uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('id',e.id,'family_id',e.family_id,'sender_id',e.from_user_id::text,'recipient_id',e.to_user_id::text,
  'effect_type',o.effect_type,'text',coalesce(e.message,''),'created_at',e.created_at,'read_at',o.read_at)
 from public.encouragements e join public.nico_encouragement_effects o on o.encouragement_id=e.id where e.id=p_id;
$$;

create function public.nico_constellation_capabilities() returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 if not coalesce(__AUTH_CHECK__,false) then raise exception 'Authentication required' using errcode='42501';end if;
 return jsonb_build_object('contract_version',1,'provider','__PROVIDER__','timezone','Asia/Shanghai','features',jsonb_build_array('effects','plans','receipts','events'));
end $$;

create function public.nico_send_encouragement(p_family_id uuid,p_quitter_id text,p_request_id uuid,p_effect_type text,p_text text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor __USER_TYPE__;v_quitter __USER_TYPE__;v_id uuid;v_payload jsonb;v_old public.nico_requests%rowtype;v_response jsonb;v_type text;
begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);v_quitter:=p_quitter_id::__USER_TYPE__;
 if not exists(select 1 from public.family_members where family_id=p_family_id and user_id=v_actor and role='supporter') then raise exception 'Supporter required' using errcode='42501';end if;
 if p_request_id is null or p_effect_type is null or p_effect_type not in ('glow','starlight','resonance','bloom','halo') or char_length(btrim(coalesce(p_text,'')))>200 then raise exception 'Invalid encouragement' using errcode='22023';end if;
 -- Do not retain a second plaintext copy after the sender deletes the legacy row.
 v_payload:=jsonb_build_object('command','send','family',p_family_id,'quitter',p_quitter_id,'effect',p_effect_type,
  'text_hash',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(btrim(coalesce(p_text,'')),'UTF8')),'hex'));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||p_request_id::text,0));
 select * into v_old from public.nico_requests where actor_id=v_actor and request_id=p_request_id;
 if found then
  if v_old.payload<>v_payload then raise exception 'Request key reused with different payload' using errcode='23505';end if;
  v_response:=nico_private.nico_encouragement_json((v_old.response->>'id')::uuid);
  if v_response is null then raise exception 'Original encouragement was deleted' using errcode='P0002';end if;
  return v_response;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('encourage:'||v_actor::text||':'||p_quitter_id,0));
 if exists(select 1 from public.encouragements where family_id=p_family_id and from_user_id=v_actor and to_user_id=v_quitter and created_at>now()-interval '10 seconds') then raise exception 'Encouragement cooldown' using errcode='22023';end if;
 v_type:=case p_effect_type when 'glow' then 'heart' when 'starlight' then 'clap' when 'resonance' then 'like' else 'celebrate' end;
 insert into public.encouragements(family_id,from_user_id,to_user_id,type,message) values(p_family_id,v_actor,v_quitter,v_type,nullif(btrim(p_text),'')) returning id into v_id;
 insert into public.nico_encouragement_effects(encouragement_id,sender_id,request_id,effect_type) values(v_id,v_actor,p_request_id,p_effect_type);
 v_response:=nico_private.nico_encouragement_json(v_id);
 insert into public.nico_requests(actor_id,request_id,family_id,payload,response) values(v_actor,p_request_id,p_family_id,v_payload,jsonb_build_object('id',v_id));
 return v_response;
end $$;

create function public.nico_list_encouragements(p_family_id uuid,p_quitter_id text) returns jsonb
language plpgsql security definer set search_path='' as $$ declare v_actor __USER_TYPE__;v_result jsonb;begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);
 select coalesce(jsonb_agg(nico_private.nico_encouragement_json(s.id) order by s.created_at desc,s.id),'[]'::jsonb) into v_result from (
  select e.id,e.created_at from public.encouragements e join public.nico_encouragement_effects o on o.encouragement_id=e.id
  where e.family_id=p_family_id and e.to_user_id::text=p_quitter_id and (e.from_user_id=v_actor or e.to_user_id=v_actor) order by e.created_at desc,e.id limit 100
 ) s;return v_result;
end $$;

create function public.nico_mark_encouragement_read(p_family_id uuid,p_quitter_id text,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ declare v_actor __USER_TYPE__;begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);
 if v_actor::text<>p_quitter_id then raise exception 'Recipient required' using errcode='42501';end if;
 update public.nico_encouragement_effects o set read_at=coalesce(o.read_at,now()) from public.encouragements e
 where o.encouragement_id=p_id and e.id=o.encouragement_id and e.family_id=p_family_id and e.to_user_id=v_actor;
 if not found then raise exception 'Encouragement unavailable' using errcode='42501';end if;
 return nico_private.nico_encouragement_json(p_id);
end $$;

create function public.nico_list_plans(p_family_id uuid,p_quitter_id text) returns jsonb
language plpgsql security definer set search_path='' as $$ declare v_actor __USER_TYPE__;v_result jsonb;begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);
 select coalesce(jsonb_agg(nico_private.nico_plan_json(s.id) order by s.updated_at desc,s.id),'[]'::jsonb) into v_result from (
  select p.id,p.updated_at from public.nico_plans p where p.family_id=p_family_id and p.quitter_id::text=p_quitter_id and public.nico_can_read_plan(p.id) order by p.updated_at desc,p.id limit 100
 ) s;return v_result;
end $$;

create function public.nico_list_plan_events(p_family_id uuid,p_quitter_id text,p_plan_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ declare v_actor __USER_TYPE__;v_result jsonb;begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);
 if not exists(select 1 from public.nico_plans where id=p_plan_id and family_id=p_family_id and quitter_id::text=p_quitter_id) or not public.nico_can_read_plan(p_plan_id) then raise exception 'Plan unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'plan_id',s.plan_id,'kind',s.kind,'version',s.version,'cycle',s.cycle,'created_at',s.created_at,'confirmed_date',case when v_actor::text=p_quitter_id then s.confirmed_date else null end) order by s.created_at,s.version,s.id),'[]'::jsonb) into v_result from (
  select * from public.nico_plan_events where plan_id=p_plan_id and (kind<>'confirmed' or v_actor::text=p_quitter_id) order by created_at desc,version desc,id limit 100
 ) s;return v_result;
end $$;

create function public.nico_mutate_plan(p_family_id uuid,p_quitter_id text,p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor __USER_TYPE__;v_owner boolean;v_action text;v_request uuid;v_payload jsonb;v_old public.nico_requests%rowtype;
 p public.nico_plans%rowtype;v_values jsonb;v_eval jsonb;v_event uuid;v_kind text;v_response jsonb;v_before text;v_today date:=(now() at time zone 'Asia/Shanghai')::date;v_transition boolean:=false;
begin
 v_actor:=nico_private.nico_scope(p_family_id,p_quitter_id);v_owner:=v_actor::text=p_quitter_id;
 v_action:=p_request->>'action';v_request:=(p_request->>'requestId')::uuid;v_values:=p_request->'values';
 if v_request is null or v_action is null or v_action not in ('create','revise','accept','activate','verify','cancel','expire','join','confirm','share') then raise exception 'Invalid plan command' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_request) k where k not in ('requestId','action','planId','expectedVersion','values','sharedSummary')) then raise exception 'Unrecognized plan fields' using errcode='22023';end if;
 if not v_owner and (v_action not in ('create','join') or not exists(select 1 from public.family_members where family_id=p_family_id and user_id=v_actor and role='supporter')) then raise exception 'Quitter required' using errcode='42501';end if;
 v_payload:=jsonb_build_object('command','plan','family',p_family_id,'quitter',p_quitter_id,'request',p_request);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||v_request::text,0));
 select * into v_old from public.nico_requests where actor_id=v_actor and request_id=v_request;
 if found then
  if v_old.payload<>v_payload then raise exception 'Request key reused with different payload' using errcode='23505';end if;
  -- Reproject current permission rather than replay an obsolete shared/private snapshot.
  return jsonb_build_object('plan',nico_private.nico_plan_json((v_old.response->'plan'->>'id')::uuid),'event_id',v_old.response->'event_id','transitioned',false);
 end if;
 if v_action in ('create','revise') then
  if v_values is null or jsonb_typeof(v_values)<>'object' or exists(select 1 from jsonb_object_keys(v_values) k where k not in ('type','start','end','target','title','sharedSummary')) then raise exception 'Invalid target fields' using errcode='22023';end if;
  if nullif(btrim(v_values->>'title'),'') is null or jsonb_typeof(v_values->'sharedSummary') is distinct from 'boolean' then raise exception 'Invalid target' using errcode='22023';end if;
  if not v_owner and (v_values->>'sharedSummary')::boolean then raise exception 'Only quitter may share' using errcode='42501';end if;
 end if;
 if v_action='create' then
  insert into public.nico_plans(family_id,quitter_id,proposer_id,type,title,start_date,end_date,target,shared_summary)
  values(p_family_id,p_quitter_id::__USER_TYPE__,v_actor,v_values->>'type',btrim(v_values->>'title'),(v_values->>'start')::date,(v_values->>'end')::date,(v_values->>'target')::integer,(v_values->>'sharedSummary')::boolean) returning * into p;
  insert into public.nico_plan_participants(plan_id,user_id) values(p.id,v_actor);
  v_kind:='proposed';
 else
  select * into p from public.nico_plans where id=(p_request->>'planId')::uuid and family_id=p_family_id and quitter_id::text=p_quitter_id for update;
  if not found then raise exception 'Plan unavailable' using errcode='42501';end if;
  if p_request->>'expectedVersion' is null or (p_request->>'expectedVersion')::integer<>p.version then raise exception 'Plan version conflict' using errcode='40001';end if;
  v_before:=p.status;
  case v_action
   when 'revise' then
    if p.status in ('completed','cancelled','expired') then raise exception 'Plan ended' using errcode='22023';end if;
    p.type:=v_values->>'type';p.title:=btrim(v_values->>'title');p.start_date:=(v_values->>'start')::date;p.end_date:=(v_values->>'end')::date;p.target:=(v_values->>'target')::integer;p.shared_summary:=(v_values->>'sharedSummary')::boolean;p.status:='proposed';p.goal_revision:=p.goal_revision+1;p.reason:='目标已修改，需重新接受';v_kind:='revised';
   when 'accept' then
    if p.status<>'proposed' then raise exception 'Not a proposal' using errcode='22023';end if;p.status:='accepted';p.reason:='';v_kind:='accepted';
   when 'activate' then
    if p.status<>'accepted' or v_today<p.start_date then raise exception 'Cannot activate' using errcode='22023';end if;p.status:='active';v_kind:='activated';
   when 'cancel' then
    if p.status in ('completed','cancelled','expired') then raise exception 'Plan ended' using errcode='22023';end if;p.status:='cancelled';p.reason:='戒烟者取消';v_kind:='cancelled';
   when 'expire' then
    if p.status<>'proposed' or v_today<=p.end_date then raise exception 'Proposal not expired' using errcode='22023';end if;p.status:='expired';p.reason:='未接受且超过截止日';v_kind:='expired';
   when 'share' then
    if jsonb_typeof(p_request->'sharedSummary') is distinct from 'boolean' then raise exception 'Sharing flag required' using errcode='22023';end if;
    p.shared_summary:=(p_request->>'sharedSummary')::boolean;v_kind:='shared';
   when 'join' then
    if v_owner or not (p.shared_summary or p.proposer_id=v_actor) or p.status in ('completed','cancelled','expired') then raise exception 'Cannot join' using errcode='42501';end if;
    if not exists(select 1 from public.nico_plan_participants where plan_id=p.id and user_id=v_actor) then
     if (select count(*) from public.nico_plan_participants part join public.family_members m on m.user_id=part.user_id and m.family_id=p.family_id where part.plan_id=p.id and m.role='supporter')>=2 then raise exception 'Two supporters maximum per plan' using errcode='22023';end if;
     insert into public.nico_plan_participants(plan_id,user_id) values(p.id,v_actor);v_kind:='joined';
    end if;
   when 'confirm' then
    if p.type<>'scene' or p.status<>'active' or v_today<p.start_date or v_today>p.end_date then raise exception 'Cannot self confirm' using errcode='22023';end if;
    if not exists(select 1 from public.nico_plan_events where plan_id=p.id and kind='confirmed' and goal_revision=p.goal_revision and confirmed_date=v_today) then v_kind:='confirmed';end if;
   when 'verify' then
    if p.status not in ('active','completed','missed') then raise exception 'Cannot verify' using errcode='22023';end if;
   else raise exception 'Invalid action' using errcode='22023';
  end case;
  if v_kind is not null then p.version:=p.version+1;end if;
 end if;
 update public.nico_plans set type=p.type,title=p.title,start_date=p.start_date,end_date=p.end_date,target=p.target,status=p.status,version=p.version,goal_revision=p.goal_revision,shared_summary=p.shared_summary,reason=p.reason,updated_at=now() where id=p.id;
 if v_kind is not null then
  insert into public.nico_plan_events(plan_id,actor_id,version,goal_revision,cycle,kind,confirmed_date) values(p.id,v_actor,p.version,p.goal_revision,p.completion_cycle,v_kind,case when v_kind='confirmed' then v_today else null end) returning id into v_event;
 end if;
 v_event:=null;
 if v_action in ('verify','confirm') then
  v_eval:=nico_private.nico_evaluate(p.id);
  if p.status<>v_eval->>'outcome' then
   v_before:=p.status;p.status:=v_eval->>'outcome';p.version:=p.version+1;
   if p.status='completed' then p.completion_cycle:=p.completion_cycle+1;v_kind:='completed';v_transition:=true;
   elsif v_before='completed' then v_kind:='corrected';else v_kind:='missed';end if;
   update public.nico_plans set status=p.status,version=p.version,completion_cycle=p.completion_cycle,reason=case when v_kind='corrected' then '记录已更正，当前条件未满足' when p.status='missed' then '完整证据未满足目标' else '' end,updated_at=now() where id=p.id;
   insert into public.nico_plan_events(plan_id,actor_id,version,goal_revision,cycle,kind) values(p.id,v_actor,p.version,p.goal_revision,p.completion_cycle,v_kind) returning id into v_event;
  end if;
 end if;
 v_response:=jsonb_build_object('plan',nico_private.nico_plan_json(p.id),'event_id',v_event,'transitioned',v_transition);
 insert into public.nico_requests(actor_id,request_id,family_id,payload,response) values(v_actor,v_request,p_family_id,v_payload,v_response);
 return v_response;
end $$;

-- Helpers are owner-only; exported RPCs still authenticate inside their bodies.
revoke all on function nico_private.nico_scope(uuid,text),nico_private.nico_evaluate(uuid),nico_private.nico_plan_json(uuid),nico_private.nico_encouragement_json(uuid) from public,anon,authenticated;
revoke all on function public.nico_constellation_capabilities(),public.nico_send_encouragement(uuid,text,uuid,text,text),public.nico_list_encouragements(uuid,text),public.nico_mark_encouragement_read(uuid,text,uuid),public.nico_list_plans(uuid,text),public.nico_list_plan_events(uuid,text,uuid),public.nico_mutate_plan(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nico_constellation_capabilities(),public.nico_send_encouragement(uuid,text,uuid,text,text),public.nico_list_encouragements(uuid,text),public.nico_mark_encouragement_read(uuid,text,uuid),public.nico_list_plans(uuid,text),public.nico_list_plan_events(uuid,text,uuid),public.nico_mutate_plan(uuid,text,jsonb) to authenticated;
