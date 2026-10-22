"use client";

import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const signIn = () =>
    createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-navy p-6 text-white">
      {/* Photo behind a translucent Admiral Blue layer, so the white text stays readable. */}
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        fetchPriority="high"
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy/80" />
      <h1 className="text-4xl font-black tracking-tight text-white">MBA Recruiting Tool</h1>
      <p className="text-xs uppercase tracking-[0.35em] text-white/70">Interviews · Applications · Networking</p>
      <button
        onClick={signIn}
        className="rounded-md bg-white px-5 py-2.5 font-bold text-navy hover:bg-lavender"
      >
        Continue with Google
      </button>
      <p className="max-w-sm text-center text-sm opacity-70">
        A private workspace for MBA students to track informational interviews, contacts, applications, and recruiting
        goals.
      </p>
      <p className="text-xs opacity-70">
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
