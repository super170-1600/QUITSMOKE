-- Provider: cloudbase. GENERATED REVIEW DRAFT, NOT DEPLOYED.
-- S4 REVIEW DRAFT: schema/read policies only. Server RPC implementation is a separate
-- reviewed step. Do not run against production; never enable capabilities from this draft.
begin;
do $$ begin
 if current_setting('nico.s4_contract_approved',true) is distinct from 'v1' then
  raise exception 'S4 contract has not been approved; review docs/SYMBIOTIC_CONSTELLATION_S4_CONTRACT.md';
 end if;
 if (select pg_catalog.format_type(atttypid,atttypmod) from pg_catalog.pg_attribute
     where attrelid='public.profiles'::regclass and attname='id' and not attisdropped) is distinct from 'bigint' then
  raise exception 'Profile ID type does not match this provider draft';
 end if;
end $$;

create table public.nico_plans (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 quitter_id bigint not null references public.profiles(id) on delete cascade,
 proposer_id bigint not null references public.profiles(id) on delete cascade,
 type text not null check(type in ('smokeFree','records','limit','scene')),
 title text not null check(char_length(btrim(title)) between 1 and 40),
 start_date date not null, end_date date not null,
 target integer not null check(target>0),
 status text not null default 'proposed' check(status in ('proposed','accepted','active','completed','missed','cancelled','expired')),
 version integer not null default 1 check(version>0),
 goal_revision integer not null default 1 check(goal_revision>0),
 completion_cycle integer not null default 0 check(completion_cycle>=0),
 shared_summary boolean not null default false,
 reason text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(end_date>=start_date and end_date-start_date<90),
 check(type='limit' and target<=18000 or type<>'limit' and target<=end_date-start_date+1)
);
create table public.nico_plan_participants (
 plan_id uuid not null references public.nico_plans(id) on delete cascade,
 user_id bigint not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(plan_id,user_id)
);
-- No existing encouragement enum/column changes. RPC must create legacy row and
-- its optics sidecar in one transaction, preserving the old family timeline.
create table public.nico_encouragement_effects (
 encouragement_id uuid primary key references public.encouragements(id) on delete cascade,
 sender_id bigint not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 effect_type text not null check(effect_type in ('glow','starlight','resonance','bloom','halo')),
 read_at timestamptz,
 unique(sender_id,request_id)
);
-- Acknowledged commands deduplicate uncertain writes. Same key/different payload
-- must reject, not overwrite. Record receipt and business change atomically in RPC.
create table public.nico_requests (
 actor_id bigint not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 family_id uuid not null references public.families(id) on delete cascade,
 payload jsonb not null,response jsonb not null,
 created_at timestamptz not null default now(), primary key(actor_id,request_id)
);
-- Append-only semantic history; no raw private check-in notes or mood stored.
create table public.nico_plan_events (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.nico_plans(id) on delete cascade,
 actor_id bigint not null references public.profiles(id) on delete cascade,
 version integer not null,cycle integer not null default 0,
 goal_revision integer not null default 1,
 kind text not null check(kind in ('proposed','revised','accepted','activated','confirmed','completed','corrected','missed','cancelled','expired','joined','shared')),
 confirmed_date date,
 created_at timestamptz not null default now(),
 unique(plan_id,version,kind,cycle),
 check((kind='confirmed')=(confirmed_date is not null))
);
create index nico_plans_target_idx on public.nico_plans(family_id,quitter_id,updated_at desc);
create index nico_plan_events_history_idx on public.nico_plan_events(plan_id,created_at desc);
create unique index nico_plan_confirmed_date_key on public.nico_plan_events(plan_id,goal_revision,confirmed_date) where kind='confirmed';

create function public.nico_can_read_plan(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select (public.current_user_id() is not null and public.current_request_role()='authenticated') and exists (
  select 1 from public.nico_plans p join public.family_members m on m.family_id=p.family_id
  where p.id=p_id and m.user_id=public.current_user_id() and (
   p.quitter_id=public.current_user_id() or p.proposer_id=public.current_user_id() or
   (p.shared_summary and exists(select 1 from public.nico_plan_participants part where part.plan_id=p.id and part.user_id=public.current_user_id()))
  )
 );
$$;
revoke all on function public.nico_can_read_plan(uuid) from public;
grant execute on function public.nico_can_read_plan(uuid) to authenticated;

alter table public.nico_plans enable row level security;
alter table public.nico_plan_participants enable row level security;
alter table public.nico_plan_events enable row level security;
alter table public.nico_encouragement_effects enable row level security;
alter table public.nico_requests enable row level security;
revoke all on public.nico_plans,public.nico_plan_participants,public.nico_plan_events,public.nico_encouragement_effects,public.nico_requests from public,anon,authenticated;
-- Raw plan/event/request tables are deliberately not SELECT-granted: RPC must redact
-- hidden progress and autonomous-confirmation dates. Read policies are defense in depth.
create policy nico_plans_read on public.nico_plans for select to authenticated using(public.nico_can_read_plan(id));
create policy nico_participants_read on public.nico_plan_participants for select to authenticated using(public.nico_can_read_plan(plan_id));
create policy nico_events_read on public.nico_plan_events for select to authenticated using(public.nico_can_read_plan(plan_id));
create policy nico_requests_read on public.nico_requests for select to authenticated using((public.current_user_id() is not null and public.current_request_role()='authenticated') and actor_id=public.current_user_id() and public.is_family_member(family_id));
create policy nico_effects_read on public.nico_encouragement_effects for select to authenticated using((public.current_user_id() is not null and public.current_request_role()='authenticated') and exists(
 select 1 from public.encouragements e where e.id=encouragement_id
 and public.is_family_member(e.family_id) and (e.from_user_id=public.current_user_id() or e.to_user_id=public.current_user_id())
));
-- No write grants, no mutation RPCs, no capability RPC, no deployment activation.
commit;
