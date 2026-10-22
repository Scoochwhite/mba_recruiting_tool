import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { addActivity, deleteActivity, saveGoals } from "@/lib/actions";
import { ACTIVITY_KINDS, STAGES } from "@/lib/constants";
import { addDays, dateOf, formatDate, formatShortDate, startOfWeek, today } from "@/lib/dates";
import { ActionRow, AddActionForm, type ActionItem } from "@/components/action-list";
import { EditDialog } from "@/components/edit-dialog";
import { button, input, label } from "@/components/ui";
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
  contacts: { full_name: string } | null;
  applications: { company: string; role: string } | null;
};

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { week: weekParam } = await searchParams;

  // Create the client first: it opts this render out of prerendering, which today() needs.
  const supabase = await createClient();
  const todayStr = today();
  const thisWeek = startOfWeek(todayStr);
  // ?week=YYYY-MM-DD picks a past week; anything invalid or in the future falls back to this week.
  const requested = typeof weekParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? startOfWeek(weekParam) : thisWeek;
  const weekStart = requested > thisWeek ? thisWeek : requested;
  const weekEnd = addDays(weekStart, 6);
  const isCurrent = weekStart === thisWeek;
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const weekAhead = addDays(todayStr, 7);
  const [counts, profile, snapshots, recent, due, newest] = await Promise.all([
    supabase.rpc("kpi_counts", { from_date: weekStart, to_date: weekEnd }),
    supabase.from("profiles").select("weekly_goals").maybeSingle(),
    supabase.from("weekly_goal_snapshots").select("week_start, goals").order("week_start"),
    supabase
      .from("activities")
      .select("id, kind, occurred_on, note, contacts(full_name), applications(company, role)")
      .gte("occurred_on", weekStart)
      .lte("occurred_on", weekEnd)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
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
      .select("id, full_name, title, company, stage, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
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
  }[];
  const stageName = Object.fromEntries(STAGES);

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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITY_KINDS.map(([kind, name]) => {
          const total = totals.get(kind) ?? 0;
          const goal = goals[kind];
          return (
            <div key={kind} className="rounded-lg border border-black/10 bg-lavender/40 p-4 dark:border-white/15 dark:bg-white/5">
              <div className="text-sm opacity-70">{name}</div>
              <div className="mt-1 text-3xl font-black text-navy dark:text-white">
                {total}
                {goal ? <span className="text-base font-normal opacity-50"> / {goal}</span> : null}
              </div>
              {goal ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                  <div
                    className="h-full bg-ocean"
                    style={{ width: `${Math.min(100, (total / goal) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="flex items-center justify-center rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Action items</h2>
          <div className="flex items-center gap-3">
            <Link href="/actions" className="text-sm underline">
              View all
            </Link>
            <EditDialog title="New action item" buttonLabel="Add action item">
              <AddActionForm contactId={null} />
            </EditDialog>
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
        {dueItems.length ? (
          <>
            <ul className="divide-y divide-black/10 dark:divide-white/15">
              {dueItems.slice(0, 6).map((item) => (
                <ActionRow key={item.id} item={item} today={todayStr} />
              ))}
            </ul>
            {dueItems.length > 6 && (
              <Link href="/actions" className="text-sm opacity-70 hover:underline">
                + {dueItems.length - 6} more
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm opacity-70">Nothing overdue or due in the next 7 days.</p>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recently added contacts</h2>
            <Link href="/contacts" className="text-sm underline">
              View all
            </Link>
          </div>
          {newContacts.length ? (
            <ul className="divide-y divide-black/10 dark:divide-white/15">
              {newContacts.map((c) => (
                <li key={c.id}>
                  <Link href={`/contacts/${c.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.full_name}</div>
                      <div className="text-sm opacity-70">{[c.title, c.company].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs opacity-70">
                      <div>{stageName[c.stage]}</div>
                      <div>Added {formatShortDate(dateOf(c.created_at))}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">No contacts yet. Add one from the Contacts page or the Chrome extension.</p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-semibold">{isCurrent ? "Activity this week" : `Activity, week of ${formatDate(weekStart)}`}</h2>
          {recent.data?.length ? (
            <ul className="divide-y divide-black/10 dark:divide-white/15">
              {(recent.data as unknown as Activity[]).map((a) => {
                const who =
                  a.contacts?.full_name ?? (a.applications && `${a.applications.company} — ${a.applications.role}`);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-14 shrink-0 text-xs opacity-70">{formatShortDate(a.occurred_on)}</span>
                    <span className="flex-1">
                      {SINGULAR[a.kind]}
                      {who && <span className="opacity-70"> · {who}</span>}
                      {a.note && <span className="opacity-70"> · {a.note}</span>}
                    </span>
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
