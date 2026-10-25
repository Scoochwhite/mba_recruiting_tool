import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { addDays, today } from "@/lib/dates";
import { EditDialog } from "@/components/edit-dialog";
import { ActionRow, AddActionForm, type ActionItem } from "@/components/action-list";

async function Items() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_items")
    .select("id, title, due_date, recurrence, completed_at, contact_id, contacts(full_name)")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load action items: {error.message}</p>;

  const items = data as unknown as ActionItem[];
  const todayStr = today((await loadSettings(supabase)).timezone);
  const weekEnd = addDays(todayStr, 7);
  const open = items.filter((i) => !i.completed_at);
  const groups: [string, ActionItem[]][] = [
    ["Overdue", open.filter((i) => i.due_date && i.due_date < todayStr)],
    ["Today", open.filter((i) => i.due_date === todayStr)],
    ["Next 7 days", open.filter((i) => i.due_date && i.due_date > todayStr && i.due_date <= weekEnd)],
    ["Later", open.filter((i) => i.due_date && i.due_date > weekEnd)],
    ["No date", open.filter((i) => !i.due_date)],
  ];
  const done = items.filter((i) => i.completed_at).slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      {groups.map(
        ([name, list]) =>
          list.length > 0 && (
            <section key={name}>
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">{name}</h2>
              <ul className="divide-y divide-black/10 dark:divide-white/15">
                {list.map((item) => <ActionRow key={item.id} item={item} today={todayStr} />)}
              </ul>
            </section>
          ),
      )}
      {open.length === 0 && <p className="text-sm opacity-70">Nothing open. Nice.</p>}
      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Recently completed</h2>
          <ul className="divide-y divide-black/10 dark:divide-white/15">
            {done.map((item) => <ActionRow key={item.id} item={item} today={todayStr} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function ActionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Action items</h1>
        <EditDialog title="New action item" buttonLabel="Add action item">
          <AddActionForm contactId={null} />
        </EditDialog>
      </div>
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <Items />
      </Suspense>
    </div>
  );
}
