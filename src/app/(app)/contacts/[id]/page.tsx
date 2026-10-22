import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { addNote, deleteContact, deleteNote, logContactActivity, updateContact } from "@/lib/actions";
import { formatShortDate, today } from "@/lib/dates";
import { ContactDetails } from "@/components/contact-details";
import { ContactForm } from "@/components/contact-form";
import { EditDialog } from "@/components/edit-dialog";
import { ActionRow, AddActionForm } from "@/components/action-list";
import { button, input } from "@/components/ui";

async function ContactDetail({ params, searchParams }: {
  params: PageProps<"/contacts/[id]">["params"];
  searchParams: PageProps<"/contacts/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: contact }, { data: notes }, { data: items }, { data: milestones }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    supabase.from("contact_notes").select("id, body, created_at").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase
      .from("action_items")
      .select("id, title, due_date, recurrence, completed_at")
      .eq("contact_id", id)
      .order("completed_at", { ascending: false, nullsFirst: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("activities")
      .select("kind, occurred_on")
      .eq("contact_id", id)
      .in("kind", ["info_interview_request", "info_interview_completed"]),
  ]);
  if (!contact) notFound();
  const todayStr = today();
  const logged = new Map((milestones ?? []).map((m) => [m.kind as string, m.occurred_on as string]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{contact.full_name}</h1>
          <p className="text-sm opacity-70">{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
        </div>
        {/* Buttons stay on one row from tablet width up; the title and company wrap instead. */}
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap">
          {(
            [
              ["info_interview_request", "Log request sent", "Request sent"],
              ["info_interview_completed", "Log interview done", "Interview done"],
            ] as const
          ).map(([kind, label, doneLabel]) => {
            const on = logged.get(kind);
            return on ? (
              <button
                key={kind}
                disabled
                title="Already logged. Remove it from Recent activity on the dashboard to undo."
                className="cursor-not-allowed whitespace-nowrap rounded-md bg-black/10 px-3 py-2 text-sm text-black/50 dark:bg-white/15 dark:text-white/50"
              >
                ✓ {doneLabel} {formatShortDate(on)}
              </button>
            ) : (
              <form key={kind} action={logContactActivity.bind(null, id, kind)}>
                <button className={`${button} whitespace-nowrap`}>{label}</button>
              </form>
            );
          })}
          <Link href={`/contacts/${id}/call`} className={`${button} whitespace-nowrap`}>
            Start call notes
          </Link>
        </div>
      </div>
      {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Action items</h2>
          <EditDialog title="New action item" buttonLabel="Add action item">
            <AddActionForm contactId={id} />
          </EditDialog>
        </div>
        <ul className="divide-y divide-black/10 dark:divide-white/15">
          {items?.map((item) => <ActionRow key={item.id} item={item} today={todayStr} />)}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          <EditDialog title="New note" buttonLabel="Add note">
            <form action={addNote.bind(null, id)} className="flex flex-col gap-3">
              <textarea name="body" rows={6} required placeholder="Add a note…" className={input} />
              <div>
                <button className={button}>Save note</button>
              </div>
            </form>
          </EditDialog>
        </div>
        {notes?.map((note) => (
          <article key={note.id} className="rounded-md border border-black/10 p-3 dark:border-white/15">
            <div className="mb-1 flex items-center justify-between text-xs opacity-70">
              <time>{new Date(note.created_at).toLocaleString("en-US", { timeZone: "America/Denver" })}</time>
              <form action={deleteNote.bind(null, id, note.id)}>
                <button className="hover:opacity-100">Delete</button>
              </form>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{note.body}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Details</h2>
          <EditDialog title="Edit contact">
            <ContactForm action={updateContact.bind(null, id)} contact={contact} submitLabel="Save changes" />
          </EditDialog>
        </div>
        <ContactDetails contact={contact} />
        <form action={deleteContact.bind(null, id)}>
          <button className="text-sm text-red-600 hover:underline">Delete contact</button>
        </form>
      </section>
    </div>
  );
}

export default function ContactPage(props: PageProps<"/contacts/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
      <ContactDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
