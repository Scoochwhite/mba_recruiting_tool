-- Each user's editable outreach message for the Chrome extension.
-- Null means "use the default template". The user's name lives in the existing display_name column.
alter table profiles add column message_template text;
