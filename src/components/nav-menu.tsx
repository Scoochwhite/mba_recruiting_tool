"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/actions";

// Top-right dropdown holding the less-used pages and Sign out.
export function NavMenu({ links }: { links: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-md border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10"
      >
        Menu ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-black/15 bg-white py-1 text-black shadow-lg dark:border-white/20 dark:bg-navy dark:text-white"
        >
          {links.map(([href, name]) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className={item}>
              {name}
            </Link>
          ))}
          <hr className="my-1 border-black/10 dark:border-white/15" />
          <form action={signOut}>
            <button role="menuitem" className={item}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
