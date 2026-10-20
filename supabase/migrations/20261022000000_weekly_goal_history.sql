-- Weekly goal history: a snapshot of the goals in effect from a given week onward,
-- so changing goals later never rewrites how past weeks are judged.

create table weekly_goal_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null, -- Monday of the week the goals took effect
  goals jsonb not null default '{}'::jsonb,
  primary key (user_id, week_start)
);

alter table weekly_goal_snapshots enable row level security;
create policy "own rows" on weekly_goal_snapshots for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Backfill: goals already set are treated as taking effect this week (Mountain time, Monday start).
insert into weekly_goal_snapshots (user_id, week_start, goals)
select id, date_trunc('week', now() at time zone 'America/Denver')::date, weekly_goals
from profiles
where weekly_goals <> '{}'::jsonb;

-- Activity counts per week and kind since `from_date` (RLS applies: security invoker).
create function weekly_kpi_counts(from_date date)
returns table (week_start date, kind activity_kind, total bigint)
language sql stable security invoker as $$
  select date_trunc('week', occurred_on)::date, kind, count(*)
  from activities
  where user_id = auth.uid() and occurred_on >= from_date
  group by 1, 2
$$;
