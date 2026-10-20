import Link from "next/link";
import { RECURRENCES } from "@/lib/constants";
import { addActionItem, completeActionItem, deleteActionItem, reopenActionItem } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { button, buttonQuiet, input } from "./ui";

export type ActionItem = {
  id: string;
  title: string;
  due_date: string | null;
  recurrence: string;
  completed_at: string | null;
  contact_id?: string | null;
  contacts?: { full_name: string } | null;
};

export function ActionRow({ item, today }: { item: ActionItem; today: string }) {
  const done = !!item.completed_at;
  const overdue = !done && item.due_date !== null && item.due_date < today;
  return (
    <li className="flex items-center gap-3 py-2">
      <form action={done ? reopenActionItem.bind(null, item.id) : completeActionItem.bind(null, item.id)}>
        <button
          aria-label={done ? "Mark not done" : "Mark done"}
          className="flex h-5 w-5 items-center justify-center rounded border border-black/30 text-xs dark:border-white/40"
        >
          {done ? "✓" : ""}
        </button>
      </form>
      <div className="flex-1">
        <span className={done ? "line-through opacity-50" : ""}>{item.title}</span>
        {item.contacts && (
          <Link href={`/contacts/${item.contact_id}`} className="ml-2 text-xs opacity-60 hover:underline">
            {item.contacts.full_name}
          </Link>
        )}
      </div>
      {item.recurrence !== "none" && <span className="text-xs opacity-60">↻ {item.recurrence}</span>}
      {item.due_date && (
        <span className={`text-xs ${overdue ? "text-red-600" : "opacity-60"}`}>{formatDate(item.due_date)}</span>
      )}
      <form action={deleteActionItem.bind(null, item.id)}>
        <button aria-label="Delete" className="text-xs opacity-40 hover:opacity-100">
          ✕
        </button>
      </form>
    </li>
  );
}

export function AddActionForm({ contactId }: { contactId: string | null }) {
  return (
    <form action={addActionItem.bind(null, contactId)} className="flex flex-wrap gap-2">
      <input name="title" required placeholder="New action item…" className={`${input} flex-1 min-w-48`} />
      <input name="due_date" type="date" className={`${input} w-auto`} />
      <select name="recurrence" className={`${input} w-auto`} defaultValue="none">
        {RECURRENCES.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <button className={button}>Add</button>
    </form>
  );
}

export { buttonQuiet };
