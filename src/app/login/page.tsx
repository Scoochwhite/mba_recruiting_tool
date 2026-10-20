"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const signIn = () =>
    createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Recruiting Tracker</h1>
      <button
        onClick={signIn}
        className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        Continue with Google
      </button>
      <p className="max-w-sm text-center text-sm opacity-70">
        A private workspace for MBA students to track informational interviews, contacts, applications, and recruiting
        goals.
      </p>
      <p className="text-xs opacity-60">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </p>
    </main>
  );
}
