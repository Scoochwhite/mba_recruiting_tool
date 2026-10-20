-- Recruiting tracker: initial schema.
-- Every table is owned by a single user and protected by row-level security.

create extension if not exists pgcrypto;

-- Enums ---------------------------------------------------------------------

create type contact_stage as enum (
  'identified', 'requested', 'scheduled', 'completed', 'nurturing'
);

create type application_status as enum (
  'wishlist', 'applied', 'screen', 'interviewing', 'offer', 'rejected', 'withdrawn'
);

create type activity_kind as enum (
  'info_interview_request', 'info_interview_completed',
  'application_submitted', 'mock_interview', 'interview'
);

create type recurrence as enum ('none', 'weekly', 'monthly', 'yearly');

-- Shared trigger ------------------------------------------------------------

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles ------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  weekly_goals jsonb not null default '{}'::jsonb, -- e.g. {"info_interview_request": 5}
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Contacts ------------------------------------------------------------------

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null,
  company text,
  title text,
  linkedin_url text,
  email text,
  phone text,
  how_met text,
  stage contact_stage not null default 'identified',
  tags text[] not null default '{}',
  birthday date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Prevent saving the same LinkedIn profile twice (extension duplicate check).
create unique index contacts_user_linkedin_idx
  on contacts (user_id, lower(linkedin_url)) where linkedin_url is not null;
create index contacts_user_stage_idx on contacts (user_id, stage);

create trigger contacts_updated_at before update on contacts
  for each row execute function set_updated_at();

-- Notes ---------------------------------------------------------------------

create table contact_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (contact_id, user_id) references contacts (id, user_id) on delete cascade
);

create index contact_notes_contact_idx on contact_notes (contact_id, created_at desc);

create trigger contact_notes_updated_at before update on contact_notes
  for each row execute function set_updated_at();

-- Action items --------------------------------------------------------------

create table action_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid, -- null = general to-do not tied to a contact
  title text not null,
  due_date date,
  recurrence recurrence not null default 'none',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (contact_id, user_id) references contacts (id, user_id) on delete cascade
);

create index action_items_open_idx on action_items (user_id, due_date)
  where completed_at is null;

-- Applications --------------------------------------------------------------

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  status application_status not null default 'wishlist',
  applied_on date,
  deadline date,
  referrer_contact_id uuid, -- contact who referred you, if any
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (referrer_contact_id, user_id) references contacts (id, user_id) on delete set null (referrer_contact_id)
);

create index applications_user_status_idx on applications (user_id, status);

create trigger applications_updated_at before update on applications
  for each row execute function set_updated_at();

-- Activity log (source of truth for dashboard KPIs) ---------------------------

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind activity_kind not null,
  occurred_on date not null default current_date,
  contact_id uuid,
  application_id uuid,
  note text,
  created_at timestamptz not null default now(),
  foreign key (contact_id, user_id) references contacts (id, user_id) on delete set null (contact_id),
  foreign key (application_id, user_id) references applications (id, user_id) on delete set null (application_id)
);

create index activities_user_kind_date_idx on activities (user_id, kind, occurred_on);

-- KPI counts for a date range (RLS applies: security invoker) -----------------

create function kpi_counts(from_date date default null, to_date date default null)
returns table (kind activity_kind, total bigint)
language sql stable security invoker as $$
  select k.kind, count(a.id) as total
  from unnest(enum_range(null::activity_kind)) as k(kind)
  left join activities a
    on a.kind = k.kind
   and a.user_id = auth.uid()
   and (from_date is null or a.occurred_on >= from_date)
   and (to_date is null or a.occurred_on <= to_date)
  group by k.kind
$$;

-- Row-level security: users only ever see and change their own rows -----------

alter table profiles enable row level security;
create policy "own profile" on profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table contacts enable row level security;
alter table contact_notes enable row level security;
alter table action_items enable row level security;
alter table applications enable row level security;
alter table activities enable row level security;

create policy "own rows" on contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on contact_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on action_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on applications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
