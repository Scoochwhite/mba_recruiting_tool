-- Each contact gets at most one "request sent" and one "interview done" milestone.

-- Remove duplicates already logged, keeping the earliest of each.
delete from activities a
using activities b
where a.kind in ('info_interview_request', 'info_interview_completed')
  and a.contact_id is not null
  and a.user_id = b.user_id
  and a.contact_id = b.contact_id
  and a.kind = b.kind
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index activities_one_milestone_per_contact_idx
  on activities (user_id, contact_id, kind)
  where contact_id is not null
    and kind in ('info_interview_request', 'info_interview_completed');
