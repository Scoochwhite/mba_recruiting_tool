import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ContactFilterBar, ContactRow } from "@/components/contacts-ui";
import { button } from "@/components/ui";

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

  return (
    <ul className="divide-y divide-black/10 dark:divide-white/15">
      {contacts.map((c) => (
        <ContactRow key={c.id} contact={c} />
      ))}
    </ul>
  );
}

// The filter form keeps showing what you filtered by.
async function Filters({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const { q, stage, referrers, sort } = await searchParams;
  return (
    <ContactFilterBar
      q={typeof q === "string" ? q : ""}
      stage={typeof stage === "string" ? stage : ""}
      referrers={referrers === "1"}
      sort={typeof sort === "string" ? sort : ""}
    />
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
