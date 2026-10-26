"use client";

import Link from "next/link";
import { useState } from "react";
import { dismissChecklist } from "@/lib/actions";

export type ChecklistItem = { label: string; hint: string; done: boolean; href?: string };

// A short list of first steps that checks itself off. Hide it any time; it also goes away once all four are done.
export function GettingStarted({ items }: { items: ChecklistItem[] }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const done = items.filter((item) => item.done).length;

  return (
    <section
      data-tour="checklist"
      className="rounded-lg border border-ocean/40 bg-ocean/10 p-4"
      aria-label="Getting started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Getting started</h2>
          <p className="text-sm opacity-70">
            {done} of {items.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            dismissChecklist().catch(() => {});
          }}
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          Hide
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div className="h-full bg-ocean transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                item.done ? "border-ocean bg-ocean text-white" : "border-black/30 dark:border-white/40"
              }`}
            >
              {item.done ? "✓" : ""}
            </span>
            <div className="min-w-0">
              <div className={item.done ? "line-through opacity-60" : "font-bold"}>
                {item.href && !item.done ? (
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </div>
              {!item.done && <div className="opacity-70">{item.hint}</div>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
