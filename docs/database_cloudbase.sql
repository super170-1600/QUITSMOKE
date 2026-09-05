-- NO SMOKING - CloudBase PostgreSQL schema and RLS
-- Target environment contract: auth.users.id is bigint.
-- Run in the CloudBase PostgreSQL SQL editor as an administrator.
-- This is a fresh-install schema; it does not alter the Supabase schema file.

begin;

-- gen_random_uuid() is supplied by pgcrypto on supported CloudBase PG instances.
create extension if not exists pgcrypto;

-- Fail early instead of silently installing a bigint schema against a CloudBase
-- environment whose auth.users.id uses another type.
do $$
declare
  v_auth_user_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into v_auth_user_id_type
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid = a.attrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth'
    and c.relname = 'users'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if v_auth_user_id_type is null then
    raise exception 'CloudBase preflight failed: auth.users.id was not found';
  end if;

  if v_auth_user_id_type <> 'bigint' then
    raise exception
      'CloudBase preflight failed: expected auth.users.id bigint, found %',
      v_auth_user_id_type;
  end if;
end;
$$;

-- Centralized CloudBase JWT helpers. Some gateways expose the singular custom
-- setting while PostgREST exposes a JSON object in request.jwt.claims. Supporting
-- both keeps claim parsing in one audited place and never throws on bad input.
create or replace function public.current_user_id()
returns bigint
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_sub text;
  v_claims text;
begin
  v_sub := nullif(pg_catalog.btrim(
    current_setting('request.jwt.claim.sub', true)
  ), '');

  if v_sub is null then
    v_claims := nullif(current_setting('request.jwt.claims', true), '');
    if v_claims is not null then
      begin
        v_sub := nullif(pg_catalog.btrim(v_claims::jsonb ->> 'sub'), '');
      exception
        when invalid_text_representation then
          return null;
      end;
    end if;
  end if;

  if v_sub is null or v_sub !~ '^[0-9]+$' then
    return null;
  end if;

  begin
    return v_sub::bigint;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      return null;
  end;
end;
$$;

create or replace function public.current_request_role()
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_claims text;
begin
  v_role := nullif(pg_catalog.btrim(
    current_setting('request.jwt.claim.role', true)
  ), '');

  if v_role is null then
    v_claims := nullif(current_setting('request.jwt.claims', true), '');
    if v_claims is not null then
      begin
        v_role := nullif(pg_catalog.btrim(v_claims::jsonb ->> 'role'), '');
      exception
        when invalid_text_representation then
          return null;
      end;
    end if;
  end if;

  return v_role;
end;
$$;

create table if not exists public.profiles (
  id bigint primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by bigint not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id bigint not null references public.profiles(id) on delete cascade,
  role text not null constraint family_members_role_check
    check (role in ('quitter', 'supporter')),
  joined_at timestamptz not null default now(),
  constraint family_members_family_user_key unique (family_id, user_id),
  constraint family_members_user_key unique (user_id)
);

create table if not exists public.smoking_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null unique references public.profiles(id) on delete cascade,
  quit_start_date date not null,
  baseline_daily_cigarettes integer not null
    constraint smoking_profiles_baseline_check check (baseline_daily_cigarettes >= 0),
  cigarettes_per_pack integer not null default 20
    constraint smoking_profiles_pack_size_check check (cigarettes_per_pack > 0),
  price_per_pack numeric(10, 2) not null
    constraint smoking_profiles_price_check check (price_per_pack >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  cigarettes integer not null
    constraint checkins_cigarettes_check check (cigarettes between 0 and 200),
  craving_level integer not null
    constraint checkins_craving_level_check check (craving_level between 1 and 5),
  note text constraint checkins_note_length_check
    check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkins_user_date_key unique (user_id, checkin_date)
);

create table if not exists public.encouragements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  from_user_id bigint not null references public.profiles(id) on delete cascade,
  to_user_id bigint not null references public.profiles(id) on delete cascade,
  type text not null constraint encouragements_type_check
    check (type in ('heart', 'like', 'clap', 'fire', 'celebrate', 'message')),
  message text constraint encouragements_message_check check (
    (message is null or char_length(message) <= 200)
    and (type <> 'message' or nullif(btrim(message), '') is not null)
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sender_id bigint references public.profiles(id) on delete cascade,
  type text not null constraint messages_type_check
    check (type in ('text', 'system_checkin', 'system_milestone')),
  content text not null constraint messages_content_check
    check (nullif(btrim(content), '') is not null and char_length(content) <= 500),
  event_key text,
  created_at timestamptz not null default now(),
  constraint messages_family_event_key unique (family_id, event_key),
  constraint messages_sender_type_check check (
    (type = 'text' and sender_id is not null and event_key is null)
    or (type <> 'text' and sender_id is null and event_key is not null)
  )
);

do $$
begin
  if exists (
    select 1 from public.family_members fm
    group by fm.user_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one family per user: duplicate family memberships exist';
  end if;
end;
$$;

create unique index if not exists family_members_user_key
  on public.family_members (user_id);
create index if not exists checkins_user_date_desc_idx
  on public.checkins (user_id, checkin_date desc);
create index if not exists encouragements_family_created_idx
  on public.encouragements (family_id, created_at desc);
create index if not exists encouragements_to_user_idx
  on public.encouragements (to_user_id);
create index if not exists messages_family_created_idx
  on public.messages (family_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists families_set_updated_at on public.families;
create trigger families_set_updated_at
before update on public.families
for each row execute function public.set_updated_at();

drop trigger if exists smoking_profiles_set_updated_at on public.smoking_profiles;
create trigger smoking_profiles_set_updated_at
before update on public.smoking_profiles
for each row execute function public.set_updated_at();

drop trigger if exists checkins_set_updated_at on public.checkins;
create trigger checkins_set_updated_at
before update on public.checkins
for each row execute function public.set_updated_at();

-- Trigger-only function: creates idempotent family timeline events for quitter
-- check-ins. It does not read identity from the request and cannot accept user_id.
create or replace function public.publish_checkin_family_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family record;
  v_nickname text;
  v_streak integer := 0;
  v_cursor_date date;
  v_checkin_content text;
  v_event_time timestamptz;
begin
  select p.nickname into v_nickname
  from public.profiles p
  where p.id = new.user_id;

  v_nickname := pg_catalog.left(coalesce(v_nickname, '家人'), 80);
  v_event_time := case
    when new.checkin_date = current_date then now()
    else (new.checkin_date::timestamp + interval '12 hours') at time zone 'UTC'
  end;

  if new.cigarettes = 0 then
    v_checkin_content := '🚭 ' || v_nickname || case
      when new.checkin_date = current_date then '今天完成无烟打卡'
      else '完成无烟打卡'
    end;
  else
    v_checkin_content := '📝 ' || v_nickname || case
      when new.checkin_date = current_date then '今天记录 ' else '记录 '
    end || new.cigarettes::text || ' 支烟';
  end if;

  if new.cigarettes = 0 then
    v_cursor_date := new.checkin_date;
    loop
      exit when not exists (
        select 1 from public.checkins c
        where c.user_id = new.user_id
          and c.checkin_date = v_cursor_date
          and c.cigarettes = 0
      );
      v_streak := v_streak + 1;
      v_cursor_date := v_cursor_date - 1;
    end loop;
  end if;

  for v_family in
    select fm.family_id
    from public.family_members fm
    where fm.user_id = new.user_id
      and fm.role = 'quitter'
  loop
    insert into public.messages (family_id, sender_id, type, content, event_key, created_at)
    values (
      v_family.family_id,
      null,
      'system_checkin',
      v_checkin_content,
      'checkin:' || new.id::text,
      v_event_time
    )
    on conflict (family_id, event_key) do update
    set content = excluded.content;

    if v_streak in (3, 7, 14, 30) then
      insert into public.messages (family_id, sender_id, type, content, event_key, created_at)
      values (
        v_family.family_id,
        null,
        'system_milestone',
        '🏆 ' || v_nickname || '达成「连续无烟 ' || v_streak::text || ' 天」',
        'milestone:' || new.user_id::text || ':' || new.checkin_date::text,
        v_event_time + interval '1 second'
      )
      on conflict (family_id, event_key) do update
      set content = excluded.content;
    else
      delete from public.messages m
      where m.family_id = v_family.family_id
        and m.event_key = 'milestone:' || new.user_id::text || ':' || new.checkin_date::text;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists checkins_publish_family_event on public.checkins;
create trigger checkins_publish_family_event
after insert or update of cigarettes, checkin_date on public.checkins
for each row execute function public.publish_checkin_family_event();

-- CloudBase auth.users adaptation. This intentionally does not reference the
-- Supabase-only raw_user_meta_data column.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.btrim(new.name::text), ''),
      nullif(pg_catalog.btrim(new.username::text), ''),
      nullif(pg_catalog.split_part(coalesce(new.email::text, ''), '@', 1), ''),
      '用户'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Cover users created before this trigger was installed.
insert into public.profiles (id, nickname)
select
  u.id,
  coalesce(
    nullif(pg_catalog.btrim(u.name::text), ''),
    nullif(pg_catalog.btrim(u.username::text), ''),
    nullif(pg_catalog.split_part(coalesce(u.email::text, ''), '@', 1), ''),
    '用户'
  )
from auth.users u
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS helpers run as their owner to avoid recursive family_members policies.
-- CloudBase currently exposes RPC endpoints broadly, so the helpers also reject
-- callers whose JWT role is not authenticated.
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_request_role() = 'authenticated'
    and public.current_user_id() is not null
    and exists (
      select 1
      from public.family_members fm
      where fm.family_id = target_family_id
        and fm.user_id = public.current_user_id()
    );
$$;

create or replace function public.shares_family_with(target_user_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_request_role() = 'authenticated'
    and public.current_user_id() is not null
    and exists (
      select 1
      from public.family_members mine
      join public.family_members theirs on theirs.family_id = mine.family_id
      where mine.user_id = public.current_user_id()
        and theirs.user_id = target_user_id
    );
$$;

create or replace function public.create_family(family_name text, member_role text)
returns table (family_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id bigint := public.current_user_id();
  v_family_id uuid;
  v_invite_code text;
  v_attempt integer;
begin
  if public.current_request_role() <> 'authenticated' or v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(family_name), '') is null then
    raise exception 'Family name is required' using errcode = '22023';
  end if;
  if member_role not in ('quitter', 'supporter') then
    raise exception 'Invalid family role' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Profile not found' using errcode = '23503';
  end if;
  if exists (select 1 from public.family_members fm where fm.user_id = v_user_id) then
    raise exception 'User already belongs to a family' using errcode = '23505';
  end if;

  for v_attempt in 1..10 loop
    v_invite_code := upper(pg_catalog.substr(
      pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 8
    ));
    v_family_id := null;

    insert into public.families as f (name, invite_code, created_by)
    values (btrim(family_name), v_invite_code, v_user_id)
    on conflict on constraint families_invite_code_key do nothing
    returning f.id into v_family_id;

    exit when v_family_id is not null;
  end loop;

  if v_family_id is null then
    raise exception 'Could not generate a unique invite code';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_user_id, member_role);

  return query select v_family_id, v_invite_code;
end;
$$;

create or replace function public.join_family_by_invite_code(invite_code text, member_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id bigint := public.current_user_id();
  v_family_id uuid;
  v_invite_code text := upper(btrim(invite_code));
begin
  if public.current_request_role() <> 'authenticated' or v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if member_role not in ('quitter', 'supporter') then
    raise exception 'Invalid family role' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Profile not found' using errcode = '23503';
  end if;

  select f.id into v_family_id
  from public.families f
  where f.invite_code = v_invite_code;

  if v_family_id is null then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.family_members fm
    where fm.user_id = v_user_id
      and fm.family_id = v_family_id
  ) then
    return v_family_id;
  end if;
  if exists (select 1 from public.family_members fm where fm.user_id = v_user_id) then
    raise exception 'User already belongs to a family' using errcode = '23505';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_user_id, member_role);

  return v_family_id;
end;
$$;

create or replace function public.leave_current_family()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id bigint := public.current_user_id();
  v_membership_id uuid;
  v_family_id uuid;
  v_creator_id bigint;
  v_next_owner_id bigint;
begin
  if public.current_request_role() <> 'authenticated' or v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select fm.id, fm.family_id
  into v_membership_id, v_family_id
  from public.family_members fm
  where fm.user_id = v_user_id
  for update;

  if v_membership_id is null then
    return false;
  end if;

  select f.created_by into v_creator_id
  from public.families f
  where f.id = v_family_id
  for update;

  if v_creator_id = v_user_id then
    select fm.user_id into v_next_owner_id
    from public.family_members fm
    where fm.family_id = v_family_id
      and fm.id <> v_membership_id
    order by fm.joined_at, fm.id
    limit 1;

    if v_next_owner_id is null then
      delete from public.families f where f.id = v_family_id;
      return true;
    end if;

    update public.families f
    set created_by = v_next_owner_id
    where f.id = v_family_id;
  end if;

  delete from public.family_members fm where fm.id = v_membership_id;
  return true;
end;
$$;

-- Function privileges remain useful as PostgreSQL defense in depth. The body
-- checks above remain mandatory because CloudBase's RPC gateway may expose an
-- endpoint even when EXECUTE was revoked from anon/PUBLIC.
revoke all on function public.current_user_id() from public;
revoke all on function public.current_request_role() from public;
revoke all on function public.set_updated_at() from public;
revoke all on function public.publish_checkin_family_event() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.shares_family_with(bigint) from public;
revoke all on function public.create_family(text, text) from public;
revoke all on function public.join_family_by_invite_code(text, text) from public;
revoke all on function public.leave_current_family() from public;

grant execute on function public.current_user_id() to anon, authenticated, service_role;
grant execute on function public.current_request_role() to anon, authenticated, service_role;
grant execute on function public.is_family_member(uuid) to authenticated, service_role;
grant execute on function public.shares_family_with(bigint) to authenticated, service_role;
grant execute on function public.create_family(text, text) to authenticated, service_role;
grant execute on function public.join_family_by_invite_code(text, text) to authenticated, service_role;
grant execute on function public.leave_current_family() to authenticated, service_role;

-- Explicit table privileges complement RLS. No business table is exposed to anon.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.families from anon, authenticated;
revoke all on table public.family_members from anon, authenticated;
revoke all on table public.smoking_profiles from anon, authenticated;
revoke all on table public.checkins from anon, authenticated;
revoke all on table public.encouragements from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.families to authenticated;
grant select on table public.family_members to authenticated;
grant select, insert, update, delete on table public.smoking_profiles to authenticated;
grant select, insert, update, delete on table public.checkins to authenticated;
grant select, insert, delete on table public.encouragements to authenticated;
grant select on table public.messages to authenticated;
grant insert (family_id, sender_id, type, content) on table public.messages to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.families to service_role;
grant all on table public.family_members to service_role;
grant all on table public.smoking_profiles to service_role;
grant all on table public.checkins to service_role;
grant all on table public.encouragements to service_role;
grant all on table public.messages to service_role;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.smoking_profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.encouragements enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select_self_or_family" on public.profiles;
create policy "profiles_select_self_or_family" on public.profiles
for select to authenticated
using (id = public.current_user_id() or public.shares_family_with(id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = public.current_user_id())
with check (id = public.current_user_id());

drop policy if exists "families_select_member" on public.families;
create policy "families_select_member" on public.families
for select to authenticated
using (public.is_family_member(id));

drop policy if exists "families_insert_creator" on public.families;
create policy "families_insert_creator" on public.families
for insert to authenticated
with check (created_by = public.current_user_id());

drop policy if exists "families_update_creator" on public.families;
create policy "families_update_creator" on public.families
for update to authenticated
using (created_by = public.current_user_id())
with check (created_by = public.current_user_id());

drop policy if exists "families_delete_creator" on public.families;
create policy "families_delete_creator" on public.families
for delete to authenticated
using (created_by = public.current_user_id());

-- Membership INSERT/DELETE remains available only through the validated RPCs.
drop policy if exists "family_members_select_member" on public.family_members;
create policy "family_members_select_member" on public.family_members
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "smoking_profiles_select_self_or_family" on public.smoking_profiles;
create policy "smoking_profiles_select_self_or_family" on public.smoking_profiles
for select to authenticated
using (
  user_id = public.current_user_id()
  or public.shares_family_with(user_id)
);

drop policy if exists "smoking_profiles_insert_self" on public.smoking_profiles;
create policy "smoking_profiles_insert_self" on public.smoking_profiles
for insert to authenticated
with check (user_id = public.current_user_id());

drop policy if exists "smoking_profiles_update_self" on public.smoking_profiles;
create policy "smoking_profiles_update_self" on public.smoking_profiles
for update to authenticated
using (user_id = public.current_user_id())
with check (user_id = public.current_user_id());

drop policy if exists "smoking_profiles_delete_self" on public.smoking_profiles;
create policy "smoking_profiles_delete_self" on public.smoking_profiles
for delete to authenticated
using (user_id = public.current_user_id());

drop policy if exists "checkins_select_self_or_family" on public.checkins;
create policy "checkins_select_self_or_family" on public.checkins
for select to authenticated
using (
  user_id = public.current_user_id()
  or public.shares_family_with(user_id)
);

drop policy if exists "checkins_insert_self" on public.checkins;
create policy "checkins_insert_self" on public.checkins
for insert to authenticated
with check (user_id = public.current_user_id());

drop policy if exists "checkins_update_self" on public.checkins;
create policy "checkins_update_self" on public.checkins
for update to authenticated
using (user_id = public.current_user_id())
with check (user_id = public.current_user_id());

drop policy if exists "checkins_delete_self" on public.checkins;
create policy "checkins_delete_self" on public.checkins
for delete to authenticated
using (user_id = public.current_user_id());

drop policy if exists "encouragements_select_family" on public.encouragements;
create policy "encouragements_select_family" on public.encouragements
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "encouragements_insert_family" on public.encouragements;
create policy "encouragements_insert_family" on public.encouragements
for insert to authenticated
with check (
  from_user_id = public.current_user_id()
  and public.is_family_member(family_id)
  and exists (
    select 1 from public.family_members recipient
    where recipient.family_id = encouragements.family_id
      and recipient.user_id = encouragements.to_user_id
  )
);

drop policy if exists "encouragements_delete_sender" on public.encouragements;
create policy "encouragements_delete_sender" on public.encouragements
for delete to authenticated
using (from_user_id = public.current_user_id());

drop policy if exists "messages_select_family" on public.messages;
create policy "messages_select_family" on public.messages
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "messages_insert_family_text" on public.messages;
create policy "messages_insert_family_text" on public.messages
for insert to authenticated
with check (
  type = 'text'
  and sender_id = public.current_user_id()
  and event_key is null
  and public.is_family_member(family_id)
);

-- Deliberately omitted for CloudBase:
--   alter publication supabase_realtime ...
--   notify pgrst, 'reload schema'
-- CloudBase PG realtime compatibility must be verified and implemented in the
-- frontend separately; database CRUD and RLS do not depend on a publication.

commit;
