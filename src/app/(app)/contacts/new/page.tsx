import { Suspense } from "react";
import { createContact } from "@/lib/actions";
import { ContactForm } from "@/components/contact-form";

async function ErrorMessage({ searchParams }: { searchParams: PageProps<"/contacts/new">["searchParams"] }) {
  const { error } = await searchParams;
  return typeof error === "string" ? <p className="text-sm text-red-600">{error}</p> : null;
}

export default function NewContactPage(props: PageProps<"/contacts/new">) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Add contact</h1>
      <Suspense>
        <ErrorMessage searchParams={props.searchParams} />
      </Suspense>
      <ContactForm action={createContact} submitLabel="Save contact" />
    </div>
  );
}
