// What the walkthrough says. To announce a new feature: add a step (or a tip) here with `since` set to the
// next version number, and raise TOUR_VERSION to match. People who've seen the tour then get a short
// "What's new" showing only the steps newer than the version they last saw; new people get everything.

export type TourStep = {
  id: string;
  since: number; // the tour version this step was introduced in
  target: string; // CSS selector; steps whose target isn't on screen are skipped
  title: string;
  body: string;
};

export const TOUR_VERSION = 1;

export const TOUR_STEPS: TourStep[] = [
  {
    id: "checklist",
    since: 1,
    target: '[data-tour="checklist"]',
    title: "Getting started",
    body: "Four quick things to set up. They check themselves off as you go, and you can hide the list any time.",
  },
  {
    id: "week",
    since: 1,
    target: '[data-tour="week"]',
    title: "Your week at a glance",
    body: "Everything below is for the week shown here. Use the arrows to look back at earlier weeks, or Log activity to record something by hand.",
  },
  {
    id: "kpis",
    since: 1,
    target: '[data-tour="kpis"]',
    title: "Your weekly numbers",
    body: "Requests sent, interviews, applications, and more. Click any card to see exactly who or what is behind the number.",
  },
  {
    id: "goals",
    since: 1,
    target: '[data-tour="goals"]',
    title: "Set weekly goals",
    body: "Pick a target for each number. You'll get a progress bar, and a little celebration when you hit one.",
  },
  {
    id: "action-items",
    since: 1,
    target: '[data-tour="action-items"]',
    title: "Action items",
    body: "Follow-ups, thank-yous, and birthdays land here. The app adds some for you, like a thank-you reminder after an interview.",
  },
  {
    id: "contacts",
    since: 1,
    target: '[data-tour="contacts"]',
    title: "Your contacts",
    body: "Add people here, or save them straight from LinkedIn with the Chrome extension. You can change someone's stage right from this list.",
  },
  {
    id: "nav",
    since: 1,
    target: '[data-tour="nav"]',
    title: "Contacts and Applications",
    body: "Open a contact to take call notes, log that you sent a request, or mark an interview done. Track jobs and referrals under Applications.",
  },
  {
    id: "menu",
    since: 1,
    target: '[data-tour="menu"]',
    title: "The Menu",
    body: "Install the Chrome extension, change your theme and time zone, tune your reminders, and export your data. You can replay this tour from here any time.",
  },
];

// One-time tips shown the first time someone opens a page.
export const TIP_IDS = ["contacts", "applications", "extension", "settings"] as const;
export type TipId = (typeof TIP_IDS)[number];
