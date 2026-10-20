-- Birthday reminders are created automatically from a contact's birthday.
-- `source` marks action items the app created itself, so it can update or remove them later.

alter table action_items add column source text;

-- At most one open birthday reminder per contact.
create unique index action_items_one_open_birthday_idx
  on action_items (contact_id)
  where source = 'birthday' and completed_at is null;

-- Backfill: contacts that already have a birthday get a yearly reminder on the next one
-- (Mountain time; Feb 29 birthdays land on Feb 28).
with today as (
  select (now() at time zone 'America/Denver')::date as d
),
next as (
  select c.id as contact_id, c.user_id, c.full_name,
    case
      when this_year >= (select d from today) then this_year
      else (this_year + interval '1 year')::date
    end as due
  from contacts c
  cross join lateral (
    select make_date(
      extract(year from (select d from today))::int,
      extract(month from c.birthday)::int,
      least(
        extract(day from c.birthday)::int,
        extract(day from (date_trunc('month', make_date(
          extract(year from (select d from today))::int,
          extract(month from c.birthday)::int, 1)) + interval '1 month - 1 day'))::int
      )
    ) as this_year
  ) y
  where c.birthday is not null
    and not exists (
      select 1 from action_items a
      where a.contact_id = c.id and a.source = 'birthday' and a.completed_at is null
    )
)
insert into action_items (user_id, contact_id, title, due_date, recurrence, source)
select user_id, contact_id, 'Wish ' || full_name || ' a happy birthday', due, 'yearly', 'birthday'
from next;
