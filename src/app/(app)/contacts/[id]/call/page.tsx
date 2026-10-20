import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CALL_TEMPLATE } from "@/lib/constants";
import { NoteEditor } from "@/components/note-editor";

async function CallNotes({ params }: { params: PageProps<"/contacts/[id]/call">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("full_name, company, title")
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold">Call with {contact.full_name}</h1>
          <p className="text-sm opacity-60">{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
        </div>
        <Link href={`/contacts/${id}`} className="text-sm underline">
          Done
        </Link>
      </div>
      <NoteEditor contactId={id} initialBody={CALL_TEMPLATE} />
    </div>
  );
}

export default function CallPage(props: PageProps<"/contacts/[id]/call">) {
  return (
    <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
      <CallNotes params={props.params} />
    </Suspense>
  );
}
