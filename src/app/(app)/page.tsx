import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { addActivity, createContact, deleteActivity, saveGoals, setContactStage, updateActivity } from "@/lib/actions";
import { ACTIVITY_KINDS, STAGES } from "@/lib/constants";
import { addDays, dateOf, formatDate, formatShortDate, startOfWeek, today } from "@/lib/dates";
import { loadSettings } from "@/lib/settings";
import { GoalWatcher } from "@/components/celebration";
import { GettingStarted } from "@/components/getting-started";
import { ActionRow, AddActionForm, type ActionItem } from "@/components/action-list";
import { ContactForm } from "@/components/contact-form";
import { EditDialog } from "@/components/edit-dialog";
import { KpiCard, type KpiItem } from "@/components/kpi-card";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { button, input, label, stageSelectCompact } from "@/components/ui";
import { DateInput } from "@/components/date-input";

// "Oct 18 – Oct 24, 2026" for a Sunday-to-Saturday week.
function formatWeek(start: string): string {
  const short = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const end = addDays(start, 6);
  return `${short(start)} – ${short(end)}, ${end.slice(0, 4)}`;
}

// Singular labels for the activity log and the "Log activity" picker.
const SINGULAR: Record<string, string> = {
  info_interview_request: "Info interview request",
  info_interview_completed: "Info interview completed",
  application_submitted: "Application submitted",
  mock_interview: "Mock interview",
  interview: "Interview",
};

// The untyped Supabase client infers to-one embeds as arrays; at runtime they are objects (or null).
type Activity = {
  id: string;
  kind: string;
  occurred_on: string;
  note: string | null;
  contact_id: string | null;
  application_id: string | null;
  contacts: { full_name: string; title: string | null; company: string | null } | null;
  applications: { company: string; role: string } | null;
};

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { week: weekParam } = await searchParams;

  // Create the client first: it opts this render out of prerendering, which today() needs.
  const supabase = await createClient();
  const settings = await loadSettings(supabase);
  const todayStr = today(settings.timezone);
  const thisWeek = startOfWeek(todayStr, settings.weekStart);
  // ?week=YYYY-MM-DD picks a past week; anything invalid or in the future falls back to this week.
  const requested = typeof weekParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? startOfWeek(weekParam, settings.weekStart) : thisWeek;
  const weekStart = requested > thisWeek ? thisWeek : requested;
  const weekEnd = addDays(weekStart, 6);
  const isCurrent = weekStart === thisWeek;
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const weekAhead = addDays(todayStr, 7);
  const [counts, profile, snapshots, recent, due, newest, contactCount, requestCount, onboarding] = await Promise.all([
    supabase.rpc("kpi_counts", { from_date: weekStart, to_date: weekEnd }),
    supabase.from("profiles").select("weekly_goals").maybeSingle(),
    supabase.from("weekly_goal_snapshots").select("week_start, goals").order("week_start"),
    supabase
      .from("activities")
      .select(
        "id, kind, occurred_on, note, contact_id, application_id, contacts(full_name, title, company), applications(company, role)",
      )
      .gte("occurred_on", weekStart)
      .lte("occurred_on", weekEnd)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    // Open items that are overdue or due within the next 7 days.
    supabase
      .from("action_items")
      .select("id, title, due_date, recurrence, completed_at, contact_id, contacts(full_name)")
      .is("completed_at", null)
      .lte("due_date", weekAhead)
      .order("due_date", { ascending: true })
      .limit(100),
    // The three most recently added contacts.
    supabase
      .from("contacts")
      .select("id, full_name, title, company, stage, created_at, willing_to_refer")
      .order("created_at", { ascending: false })
      .limit(3),
    // For the Getting started checklist.
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("kind", "info_interview_request"),
    supabase.from("profiles").select("checklist_dismissed, extension_used_at").maybeSingle(),
  ]);
  if (counts.error) return <p className="text-sm text-red-600">Couldn&apos;t load KPIs: {counts.error.message}</p>;

  const totals = new Map<string, number>(
    (counts.data as { kind: string; total: number | string }[]).map((r) => [r.kind, Number(r.total)]),
  );
  // Goals in effect for the viewed week: the latest snapshot on or before it. The current week
  // falls back to your saved goals if no snapshot exists yet.
  const currentGoals: Record<string, number> = profile.data?.weekly_goals ?? {};
  const snapshot = ((snapshots.data ?? []) as { week_start: string; goals: Record<string, number> }[])
    .filter((snap) => snap.week_start <= weekStart)
    .at(-1);
  const goals = snapshot?.goals ?? (isCurrent ? currentGoals : {});

  const newContacts = (newest.data ?? []) as {
    id: string;
    full_name: string;
    title: string | null;
    company: string | null;
    stage: string;
    created_at: string;
    willing_to_refer: boolean;
  }[];

  // Who or what is behind each KPI number this week, newest first (the query is already ordered).
  const activityRows = (recent.data ?? []) as unknown as Activity[];
  const detailsByKind = new Map<string, KpiItem[]>();
  for (const a of activityRows) {
    const item: KpiItem = a.contacts
      ? {
          id: a.id,
          date: formatShortDate(a.occurred_on),
          name: a.contacts.full_name,
          sub: [a.contacts.title, a.contacts.company].filter(Boolean).join(" · ") || undefined,
          note: a.note ?? undefined,
          href: `/contacts/${a.contact_id}`,
        }
      : a.applications
        ? {
            id: a.id,
            date: formatShortDate(a.occurred_on),
            name: a.applications.company,
            sub: a.applications.role,
            note: a.note ?? undefined,
            href: "/applications",
          }
        : { id: a.id, date: formatShortDate(a.occurred_on), name: "Logged manually", note: a.note ?? undefined };
    detailsByKind.set(a.kind, [...(detailsByKind.get(a.kind) ?? []), item]);
  }

  // The Getting started checklist: hidden once dismissed or finished (and if the columns don't exist yet).
  const checklist = [
    { label: "Add your first contact", hint: "Add someone you'd like to talk to, or save a LinkedIn profile.", done: (contactCount.count ?? 0) > 0, href: "/contacts/new" },
    { label: "Install the Chrome extension", hint: "Save LinkedIn profiles in one click. It checks off once you've used it.", done: !!onboarding.data?.extension_used_at, href: "/extension" },
    { label: "Set weekly goals", hint: "Use “Set weekly goals” on this page to pick your targets.", done: Object.keys(currentGoals).length > 0 },
    { label: "Log your first request", hint: "Open a contact and click “Log request sent”.", done: (requestCount.count ?? 0) > 0, href: "/contacts" },
  ];
  const showChecklist =
    !!onboarding.data && !onboarding.data.checklist_dismissed && checklist.some((item) => !item.done);

  const dueItems = (due.data ?? []) as unknown as ActionItem[];
  const overdue = dueItems.filter((i) => i.due_date! < todayStr);
  const dueToday = dueItems.filter((i) => i.due_date === todayStr);
  const dueSoon = dueItems.filter((i) => i.due_date! > todayStr);
  const summary = [
    ["Overdue", overdue.length, overdue.length > 0 ? "text-red-600" : ""],
    ["Due today", dueToday.length, ""],
    ["Next 7 days", dueSoon.length, ""],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <GoalWatcher
        weekStart={weekStart}
        isCurrentWeek={isCurrent}
        progress={ACTIVITY_KINDS.map(([kind, name]) => ({
          kind,
          label: name,
          goal: goals[kind] ?? 0,
          total: totals.get(kind) ?? 0,
        }))}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div data-tour="week" className="flex items-center gap-2">
          <nav
            aria-label="Week"
            className="flex items-center overflow-hidden rounded-md border border-black/15 text-sm dark:border-white/20"
          >
            <Link
              href={`/?week=${prevWeek}`}
              aria-label="Previous week"
              className="px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              ‹
            </Link>
            <span className="min-w-44 px-2 text-center">
              <span className="block text-xs opacity-70">{isCurrent ? "This week" : "Week of"}</span>
              {formatWeek(weekStart)}
            </span>
            {isCurrent ? (
              <span aria-hidden className="px-3 py-2 opacity-30">
                ›
              </span>
            ) : (
              <Link
                href={nextWeek >= thisWeek ? "/" : `/?week=${nextWeek}`}
                aria-label="Next week"
                className="px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                ›
              </Link>
            )}
          </nav>
          {!isCurrent && (
            <Link href="/" className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20">
              This week
            </Link>
          )}
          <EditDialog title="Log activity" buttonLabel="Log activity">
            <form action={addActivity} className="grid gap-4">
              <label className={label}>
                What happened?
                <select name="kind" defaultValue="mock_interview" className={input}>
                  {ACTIVITY_KINDS.map(([value]) => (
                    <option key={value} value={value}>
                      {SINGULAR[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Date
                <DateInput name="occurred_on" defaultValue={isCurrent ? todayStr : weekEnd} className={input} />
              </label>
              <label className={label}>
                Note (optional)
                <input name="note" className={input} />
              </label>
              <div>
                <button className={button}>Log it</button>
              </div>
            </form>
          </EditDialog>
        </div>
      </div>

      {showChecklist && <GettingStarted items={checklist} />}

      <section data-tour="kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITY_KINDS.map(([kind, name]) => {
          const total = totals.get(kind) ?? 0;
          const goal = goals[kind];
          return (
            <KpiCard
              key={kind}
              label={name}
              total={total}
              goal={goal}
              items={detailsByKind.get(kind) ?? []}
              period={formatWeek(weekStart)}
            />
          );
        })}
        <div data-tour="goals" className="flex items-center justify-center rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
          <EditDialog title="Weekly goals" buttonLabel="Set weekly goals">
            <form action={saveGoals} className="grid gap-4 sm:grid-cols-2">
              <p className="text-xs opacity-70 sm:col-span-2">
                Applies from this week onward. Past weeks keep the goals they had.
              </p>
              {ACTIVITY_KINDS.map(([kind, name]) => (
                <label key={kind} className={label}>
                  {name}
                  <input name={kind} type="number" min={0} defaultValue={currentGoals[kind] ?? ""} className={input} />
                </label>
              ))}
              <div className="sm:col-span-2">
                <button className={button}>Save goals</button>
              </div>
            </form>
          </EditDialog>
        </div>
      </section>

      <hr className="border-black/10 dark:border-white/15" />

      <section data-tour="action-items" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Action items</h2>
          <div className="flex items-center gap-3">
            <EditDialog title="New action item" buttonLabel="Add action item">
              <AddActionForm contactId={null} />
            </EditDialog>
            <Link href="/actions" className="text-sm underline">
              View all
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {summary.map(([name, count, color]) => (
            <div key={name} className="rounded-lg border border-black/10 bg-lavender/40 p-3 dark:border-white/15 dark:bg-white/5">
              <div className="text-sm opacity-70">{name}</div>
              <div className={`text-2xl font-semibold ${color}`}>{count}</div>
            </div>
          ))}
        </div>
        {/* Room for 3 items and the "more" link, so the sections below stay put whether there are 0 or 3. */}
        <div className="min-h-[9.75rem]">
          {dueItems.length ? (
            <>
              <ul className="divide-y divide-black/10 dark:divide-white/15">
                {dueItems.slice(0, 3).map((item) => (
                  <ActionRow key={item.id} item={item} today={todayStr} />
                ))}
              </ul>
              {dueItems.length > 3 && (
                <Link href="/actions" className="text-sm opacity-70 hover:underline">
                  + {dueItems.length - 3} more
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm opacity-70">Nothing overdue or due in the next 7 days.</p>
          )}
        </div>
      </section>

      <hr className="border-black/10 dark:border-white/15" />

      {/* Two columns with a line between them. The activity list is held to the height of the contacts
          column (h-0 + min-h-full) and scrolls inside it, so a busy week doesn't stretch the page. */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-0">
        <section data-tour="contacts" className="flex min-w-0 flex-col gap-3 md:min-h-[14rem] md:pr-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recently added contacts</h2>
            <div className="flex items-center gap-3">
              <EditDialog title="Add contact" buttonLabel="Add contact">
                <ContactForm action={createContact} submitLabel="Save contact" />
              </EditDialog>
              <Link href="/contacts" className="text-sm underline">
                View all
              </Link>
            </div>
          </div>
          {newContacts.length ? (
            <ul className="divide-y divide-black/10 dark:divide-white/15">
              {newContacts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <Link href={`/contacts/${c.id}`} className="min-w-0 flex-1 hover:opacity-80">
                    <div className="font-medium">
                      {c.full_name}
                      {c.willing_to_refer && (
                        <span className="ml-1.5 text-navy dark:text-white" title="Willing to refer you" aria-label="Willing to refer you">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-70">{[c.title, c.company].filter(Boolean).join(" · ")}</div>
                  </Link>
                  {/* A form, not part of the link, so the dropdown is clickable on its own. */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <form action={setContactStage.bind(null, c.id)}>
                      <AutoSubmitSelect
                        key={c.stage}
                        name="stage"
                        defaultValue={c.stage}
                        options={STAGES}
                        className={stageSelectCompact}
                      />
                    </form>
                    <span className="text-xs opacity-70">Added {formatShortDate(dateOf(c.created_at, settings.timezone))}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">No contacts yet. Add one from the Contacts page or the Chrome extension.</p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3 border-black/10 dark:border-white/15 max-md:border-t max-md:pt-4 md:h-0 md:min-h-full md:border-l md:pl-6">
          <div className="flex min-h-[3.125rem] items-center">
            <h2 className="text-lg font-semibold">{isCurrent ? "Activity this week" : `Activity, week of ${formatDate(weekStart)}`}</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto max-md:max-h-80">
            {recent.data?.length ? (
              <ul className="divide-y divide-black/10 dark:divide-white/15">
                {(recent.data as unknown as Activity[]).map((a) => {
                  const who =
                    a.contacts?.full_name ?? (a.applications && `${a.applications.company} — ${a.applications.role}`);
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-14 shrink-0 text-xs opacity-70">{formatShortDate(a.occurred_on)}</span>
                      <span className="min-w-0 flex-1 break-words">
                        {SINGULAR[a.kind]}
                        {who && <span className="opacity-70"> · {who}</span>}
                        {a.note && <span className="opacity-70"> · {a.note}</span>}
                      </span>
                      <EditDialog title="Edit activity" buttonLabel="Edit" buttonClass="text-xs opacity-40 hover:opacity-100">
                        <form action={updateActivity.bind(null, a.id)} className="grid gap-4">
                          <p className="text-sm">
                            <strong>{SINGULAR[a.kind]}</strong>
                            {who && <span className="opacity-70"> · {who}</span>}
                          </p>
                          <label className={label}>
                            Date
                            <DateInput name="occurred_on" required max={todayStr} defaultValue={a.occurred_on} className={input} />
                          </label>
                          <label className={label}>
                            Note (optional)
                            <input name="note" defaultValue={a.note ?? ""} className={input} />
                          </label>
                          <div>
                            <button className={button}>Save changes</button>
                          </div>
                        </form>
                      </EditDialog>
                      <form action={deleteActivity.bind(null, a.id)}>
                        <button aria-label="Delete" className="text-xs opacity-40 hover:opacity-100">
                          ✕
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm opacity-70">
                {isCurrent
                  ? "Nothing logged yet this week. Activity is logged when you use the buttons on a contact, move an application off the wishlist, or click Log activity."
                  : "Nothing was logged this week."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}
