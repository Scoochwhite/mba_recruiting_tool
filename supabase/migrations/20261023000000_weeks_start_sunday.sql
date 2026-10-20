-- Weeks now run Sunday through Saturday (previously Monday through Sunday).

-- Weekly counts bucketed by the Sunday that starts each week.
create or replace function weekly_kpi_counts(from_date date)
returns table (week_start date, kind activity_kind, total bigint)
language sql stable security invoker as $$
  select (date_trunc('week', occurred_on + 1))::date - 1, kind, count(*)
  from activities
  where user_id = auth.uid() and occurred_on >= from_date
  group by 1, 2
$$;

-- Goal snapshots saved under the old scheme start on a Monday; move them back to that week's Sunday.
update weekly_goal_snapshots
set week_start = week_start - 1
where extract(dow from week_start) = 1
  and not exists (
    select 1 from weekly_goal_snapshots s
    where s.user_id = weekly_goal_snapshots.user_id and s.week_start = weekly_goal_snapshots.week_start - 1
  );
