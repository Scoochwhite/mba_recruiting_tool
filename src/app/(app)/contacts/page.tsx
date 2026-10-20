import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { STAGES } from "@/lib/constants";
import { button, buttonQuiet, input } from "@/components/ui";

async function ContactList({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const { q, stage } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const stageFilter = typeof stage === "string" ? stage : "";

  const supabase = await createClient();
  let request = supabase
    .from("contacts")
    .select("id, full_name, company, title, stage, tags")    .order("updated_at", { ascending: false });
  if (stageFilter) request = request.eq("stage", stageFilter);
  if (query) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = query.replace(/[,()%*\\]/g, " ");
    request = request.or(`full_name.ilike.%${term}%,company.ilike.%${term}%,title.ilike.%${term}%`);
  }
  const { data: contacts, error } = await request;

  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load contacts: {error.message}</p>;
  if (!contacts.length)
    return <p className="text-sm opacity-70">{query || stageFilter ? "No matches." : "No contacts yet — add your first one."}</p>;

  const stageName = Object.fromEntries(STAGES);
  return (
    <ul className="divide-y divide-black/10 dark:divide-white/15">
      {contacts.map((c) => (
        <li key={c.id}>
          <Link href={`/contacts/${c.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
            <div className="flex-1">
              <div className="font-medium">{c.full_name}</div>
              <div className="text-sm opacity-60">{[c.title, c.company].filter(Boolean).join(" · ")}</div>
            </div>
            {c.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {t}
              </span>
            ))}
            <span className="text-xs opacity-70">{stageName[c.stage]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ContactsPage(props: PageProps<"/contacts">) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Link href="/contacts/new" className={button}>
          Add contact
        </Link>
      </div>
      <form className="flex gap-2">
        <input name="q" placeholder="Search name, company, title…" className={input} />
        <select name="stage" className={`${input} w-auto`}>
          <option value="">All stages</option>
          {STAGES.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
        <button className={buttonQuiet}>Filter</button>
      </form>
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <ContactList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
