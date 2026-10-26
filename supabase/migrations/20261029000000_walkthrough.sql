-- Walkthrough: remembers what each person has already been shown.
alter table profiles
  add column if not exists tour_version smallint not null default 0,           -- latest tour version they've seen
  add column if not exists tips_seen text[] not null default '{}',             -- one-time page tips they've dismissed
  add column if not exists checklist_dismissed boolean not null default false, -- hid the Getting started checklist
  add column if not exists extension_used_at timestamptz;                      -- first time the Chrome extension talked to the app
