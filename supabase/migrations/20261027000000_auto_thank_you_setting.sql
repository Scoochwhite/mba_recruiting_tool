-- Settings page: whether finishing an info interview creates a next-day thank-you reminder.
-- On by default, which matches how the app already behaved.
alter table profiles add column auto_thank_you boolean not null default true;
