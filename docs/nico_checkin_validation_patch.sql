-- Optional, NOT automatically deployed. Review product timezone before applying.
-- No table migration, no backfill, no changes to RLS or family event triggers.
-- Server date policy in this draft: Asia/Shanghai. Client currently follows
-- existing device-local dates; only deploy for a product standardized to this zone.
begin;
create or replace function public.validate_nico_daily_checkin()
returns trigger language plpgsql set search_path=public as $$
declare payload jsonb; plan_date date;
begin
  if new.checkin_date > (now() at time zone 'Asia/Shanghai')::date then
    raise exception 'Future check-in dates are not allowed';
  end if;
  select quit_start_date into plan_date from public.smoking_profiles where user_id=new.user_id;
  if plan_date is null or new.checkin_date < plan_date then
    raise exception 'Date is outside the quit plan';
  end if;
  if left(coalesce(new.note,''),9)='@nico/v1:' then
    payload:=substring(new.note from 10)::jsonb;
    if jsonb_typeof(payload->'score') is distinct from 'number'
       or (payload->>'score')::numeric<>trunc((payload->>'score')::numeric)
       or (payload->>'score')::numeric not between 0 and 10
       or coalesce(payload->>'mood','') not in ('relaxed','calm','anxious','irritable','tired','fulfilled')
       or jsonb_typeof(payload->'note') is distinct from 'string'
       or char_length(payload->>'note')>160 then
      raise exception 'Invalid Daily Pulse record';
    end if;
    if new.craving_level<>1+round((payload->>'score')::numeric*4/10) then
      raise exception 'Inconsistent legacy craving value';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists nico_daily_validation on public.checkins;
create trigger nico_daily_validation before insert or update on public.checkins
for each row execute function public.validate_nico_daily_checkin();
commit;
-- Rollback (no data deletion):
-- drop trigger if exists nico_daily_validation on public.checkins;
-- drop function if exists public.validate_nico_daily_checkin();
