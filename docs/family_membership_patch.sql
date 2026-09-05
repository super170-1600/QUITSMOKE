-- Enforce one current family per user and add safe family exit.
-- Paste this whole file into Supabase SQL Editor after the base database script.
-- It preserves personal smoking profiles and check-ins.

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

create or replace function public.create_family(family_name text, member_role text)
returns table (family_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_invite_code text;
  v_attempt integer;
begin
  if v_user_id is null then
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
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_invite_code text := upper(btrim(invite_code));
begin
  if v_user_id is null then
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
  v_user_id uuid := auth.uid();
  v_membership_id uuid;
  v_family_id uuid;
  v_creator_id uuid;
  v_next_owner_id uuid;
begin
  if v_user_id is null then
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

revoke all on function public.create_family(text, text) from public;
revoke all on function public.join_family_by_invite_code(text, text) from public;
revoke all on function public.leave_current_family() from public;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family_by_invite_code(text, text) to authenticated;
grant execute on function public.leave_current_family() to authenticated;

-- Make the new RPC visible to PostgREST immediately after this patch runs.
notify pgrst, 'reload schema';
