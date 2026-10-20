import Link from "next/link";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6 text-sm leading-relaxed">
      <Link href="/login" className="text-blue-600 hover:underline">
        ← MBA Recruiting Tool
      </Link>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

// Optional: set NEXT_PUBLIC_CONTACT_EMAIL in the environment to show a contact address.
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return email ? (
    <p>
      Questions or deletion requests: <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
    </p>
  ) : (
    <p>Questions or deletion requests: contact the classmate who shared this app with you.</p>
  );
}
