import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { ACTIVITY_KINDS } from "@/lib/constants";
import { addDays, formatDate, startOfWeek, today } from "@/lib/dates";

const WEEKS = 12;

type Snapshot = { week_start: string; goals: Record<string, number> };

async function History() {
  const supabase = await createClient(); // first: opts this render out of prerendering for today()
  const settings = await loadSettings(supabase);
  const thisWeek = startOfWeek(today(settings.timezone), settings.weekStart);
  const oldest = addDays(thisWeek, -7 * (WEEKS - 1));

  const [counts, snapshots] = await Promise.all([
    supabase.rpc("weekly_kpi_counts", { from_date: oldest, week_start_day: settings.weekStart }),
    supabase.from("weekly_goal_snapshots").select("week_start, goals").order("week_start"),
  ]);
  const error = counts.error ?? snapshots.error;
  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load history: {error.message}</p>;

  const totals = new Map<string, number>();
  for (const r of counts.data as { week_start: string; kind: string; total: number | string }[]) {
    totals.set(`${r.week_start}|${r.kind}`, Number(r.total));
  }

  // Goals in effect for a week = the latest snapshot taken on or before it (none = no goals then).
  const sorted = snapshots.data as Snapshot[];
  const goalsFor = (week: string): Record<string, number> =>
    sorted.filter((s) => s.week_start <= week).at(-1)?.goals ?? {};

  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -7 * i));

  // Completed weeks only: a week "hits" when every goal that was set that week was met.
  let judged = 0;
  let hit = 0;
  for (const week of weeks.slice(1)) {
    const goals = goalsFor(week);
    const entries = Object.entries(goals);
    if (!entries.length) continue;
    judged++;
    if (entries.every(([kind, goal]) => (totals.get(`${week}|${kind}`) ?? 0) >= goal)) hit++;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm opacity-70">
        {judged
          ? `You hit every goal in ${hit} of the last ${judged} completed week${judged === 1 ? "" : "s"} that had goals set.`
          : "Set weekly goals on the dashboard and completed weeks will be scored here."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/15">
              <th className="py-2 pr-4 font-medium">Week of</th>
              {ACTIVITY_KINDS.map(([kind, name]) => (
                <th key={kind} className="px-2 py-2 text-right font-medium">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => {
              const goals = goalsFor(week);
              return (
                <tr key={week} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4">
                    {formatDate(week)}
                    {i === 0 && <span className="ml-2 text-xs opacity-70">in progress</span>}
                  </td>
                  {ACTIVITY_KINDS.map(([kind]) => {
                    const total = totals.get(`${week}|${kind}`) ?? 0;
                    const goal = goals[kind];
                    const met = goal !== undefined && total >= goal;
                    return (
                      <td key={kind} className="px-2 py-2 text-right tabular-nums">
                        {total}
                        {goal !== undefined && <span className="opacity-50"> / {goal}</span>}
                        {goal !== undefined && i > 0 && (
                          <span className={met ? "ml-1 text-green-600" : "ml-1 text-red-600"}>{met ? "✓" : "✗"}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Weekly history</h1>
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <History />
      </Suspense>
    </div>
  );
}
