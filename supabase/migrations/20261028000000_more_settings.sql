-- Settings page: time zone, week start, reminder timing and toggles, plus account deletion.
-- Safe to run even if 20261027000000 (auto_thank_you) was already applied.

alter table profiles
  add column if not exists auto_thank_you boolean not null default true,
  add column if not exists timezone text not null default 'America/Denver',
  add column if not exists week_start smallint not null default 0 check (week_start in (0, 1)), -- 0 = Sunday, 1 = Monday
  add column if not exists thank_you_days smallint not null default 1 check (thank_you_days between 0 and 14),
  add column if not exists birthday_reminders boolean not null default true,
  add column if not exists follow_up_days smallint not null default 0 check (follow_up_days between 0 and 30); -- 0 = off

-- Weekly counts, bucketed by the week-start day you chose (0 = Sunday, 1 = Monday).
drop function if exists weekly_kpi_counts(date);
create function weekly_kpi_counts(from_date date, week_start_day int default 0)
returns table (week_start date, kind activity_kind, total bigint)
language sql stable security invoker as $$
  select
    date_trunc('week', occurred_on + (1 - week_start_day))::date - (1 - week_start_day),
    kind,
    count(*)
  from activities
  where user_id = auth.uid() and occurred_on >= from_date
  group by 1, 2
$$;

-- Lets a signed-in user delete their own account. Every table cascades from the auth user,
-- so this removes all of their contacts, notes, action items, applications, and activity too.
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
