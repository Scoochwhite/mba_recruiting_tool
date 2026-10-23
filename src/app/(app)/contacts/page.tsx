import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { STAGES } from "@/lib/constants";
import { button, buttonQuiet, input, inputAuto } from "@/components/ui";

async function ContactList({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const { q, stage, referrers, sort } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const stageFilter = typeof stage === "string" ? stage : "";
  const referrersOnly = referrers === "1";

  const supabase = await createClient();
  let request = supabase
    .from("contacts")
    .select("id, full_name, company, title, stage, tags, willing_to_refer");
  // Alphabetical (by name as written) is the default.
  // "added" lists the newest contacts first; "edited" lists the most recently changed first.
  request =
    sort === "added"
      ? request.order("created_at", { ascending: false })
      : sort === "edited"
        ? request.order("updated_at", { ascending: false })
        : request.order("full_name", { ascending: true }).order("created_at", { ascending: true });
  if (stageFilter) request = request.eq("stage", stageFilter);
  if (referrersOnly) request = request.eq("willing_to_refer", true);
  if (query) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = query.replace(/[,()%*\\]/g, " ");
    request = request.or(`full_name.ilike.%${term}%,company.ilike.%${term}%,title.ilike.%${term}%`);
  }
  const { data: contacts, error } = await request;

  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load contacts: {error.message}</p>;
  if (!contacts.length)
    return <p className="text-sm opacity-70">{query || stageFilter || referrersOnly ? "No matches." : "No contacts yet — add your first one."}</p>;

  const stageName = Object.fromEntries(STAGES);
  return (
    <ul className="divide-y divide-black/10 dark:divide-white/15">
      {contacts.map((c) => (
        <li key={c.id}>
          <Link href={`/contacts/${c.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
            <div className="flex-1">
              <div className="font-medium">
                {c.willing_to_refer && (
                  <span className="mr-1 text-blue-600" title="Willing to refer you" aria-label="Willing to refer you">
                    ★
                  </span>
                )}
                {c.full_name}
              </div>
              <div className="text-sm opacity-70">{[c.title, c.company].filter(Boolean).join(" · ")}</div>
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

// The filter form keeps showing what you filtered by.
async function Filters({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const { q, stage, referrers, sort } = await searchParams;
  return (
    <form className="flex items-center gap-2">
      <input
        name="q"
        defaultValue={typeof q === "string" ? q : ""}
        placeholder="Search name, company, title…"
        className={`${input} min-w-0 flex-1`}
      />
      <select name="stage" defaultValue={typeof stage === "string" ? stage : ""} className={inputAuto}>
        <option value="">All stages</option>
        {STAGES.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <select
        name="sort"
        defaultValue={sort === "added" || sort === "edited" ? sort : "alpha"}
        aria-label="Sort by"
        title="Sort by"
        className={inputAuto}
      >
        <option value="alpha">A–Z</option>
        <option value="added">Newest</option>
        <option value="edited">Recently edited</option>
      </select>
      <label
        className="flex cursor-pointer items-center gap-1.5 text-lg"
        title="Only show contacts willing to refer you"
      >
        <input type="checkbox" name="referrers" value="1" defaultChecked={referrers === "1"} aria-label="Only show contacts willing to refer you" />
        <span aria-hidden className="text-blue-600">
          ★
        </span>
      </label>
      <button className={buttonQuiet}>Filter</button>
    </form>
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
      <Suspense fallback={null}>
        <Filters searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <ContactList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
