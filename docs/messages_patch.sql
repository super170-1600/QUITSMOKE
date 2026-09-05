-- Lightweight family chat patch for an existing Quit Smoking Family database.
-- Paste this whole file into Supabase SQL Editor. It does not recreate existing tables.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
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

create index if not exists messages_family_created_idx
  on public.messages (family_id, created_at desc);

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
    values (v_family.family_id, null, 'system_checkin', v_checkin_content, 'checkin:' || new.id::text, v_event_time)
    on conflict (family_id, event_key) do update set content = excluded.content;

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
      on conflict (family_id, event_key) do update set content = excluded.content;
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

revoke all on function public.publish_checkin_family_event() from public;
revoke all on table public.messages from anon, authenticated;
grant select on table public.messages to authenticated;
grant insert (family_id, sender_id, type, content) on table public.messages to authenticated;
alter table public.messages enable row level security;

drop policy if exists "messages_select_family" on public.messages;
create policy "messages_select_family" on public.messages
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "messages_insert_family_text" on public.messages;
create policy "messages_insert_family_text" on public.messages
for insert to authenticated
with check (
  type = 'text'
  and sender_id = auth.uid()
  and event_key is null
  and public.is_family_member(family_id)
);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.encouragements;
exception
  when duplicate_object then null;
end;
$$;
