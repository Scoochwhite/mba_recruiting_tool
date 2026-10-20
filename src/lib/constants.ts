export const STAGES = [
  ["identified", "Identified"],
  ["requested", "Requested"],
  ["scheduled", "Scheduled"],
  ["completed", "Completed"],
  ["nurturing", "Nurturing"],
] as const;

export type Stage = (typeof STAGES)[number][0];

export const RECURRENCES = [
  ["none", "Doesn't repeat"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["yearly", "Yearly"],
] as const;

export type Recurrence = (typeof RECURRENCES)[number][0];

export const CALL_TEMPLATE = `Questions to ask
- 

Key takeaways
- 

Advice / referrals offered
- 

Follow-ups
- 
`;

export const APPLICATION_STATUSES = [
  ["wishlist", "Wishlist"],
  ["applied", "Applied"],
  ["screen", "Screen"],
  ["interviewing", "Interviewing"],
  ["offer", "Offer"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number][0];

export const ACTIVITY_KINDS = [
  ["info_interview_request", "Info interview requests"],
  ["info_interview_completed", "Info interviews completed"],
  ["application_submitted", "Applications submitted"],
  ["mock_interview", "Mock interviews"],
  ["interview", "Interviews"],
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number][0];
