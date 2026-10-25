"use client";

import { useState, useTransition } from "react";

// An on/off switch that saves as soon as you flip it, and flips back if saving fails.
export function SwitchSetting({
  title,
  description,
  checked,
  action,
}: {
  title: string;
  description: string;
  checked: boolean;
  action: (value: boolean) => Promise<void>;
}) {
  const [on, setOn] = useState(checked);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(false);
    startTransition(async () => {
      try {
        await action(next);
      } catch {
        setOn(!next);
        setError(true);
      }
    });
  };

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="font-bold" id={`${title}-label`}>
          {title}
        </div>
        <p className="text-sm opacity-70">{description}</p>
        {error && <p className="text-sm text-red-600">Couldn&apos;t save that. Try again.</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${title}-label`}
        disabled={pending}
        onClick={toggle}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-ocean" : "bg-black/25 dark:bg-white/30"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
