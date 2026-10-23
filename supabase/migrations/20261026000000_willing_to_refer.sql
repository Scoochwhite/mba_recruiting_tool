-- Star contacts who have said they're willing to refer you.
alter table contacts add column willing_to_refer boolean not null default false;
