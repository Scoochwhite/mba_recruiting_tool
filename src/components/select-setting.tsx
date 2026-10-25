"use client";

import { useState, useTransition } from "react";
import { inputAuto } from "./ui";

export type Option = readonly [value: string, label: string];

// A labeled dropdown that saves as soon as you pick, and goes back to the old value if saving fails.
export function SelectSetting({
  title,
  description,
  value,
  options,
  action,
  children,
}: {
  title: string;
  description: string;
  value: string;
  options: readonly Option[];
  action: (value: string) => Promise<void>;
  children?: React.ReactNode; // extra controls under the description
}) {
  const [current, setCurrent] = useState(value);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const id = `setting-${title.replace(/\W+/g, "-").toLowerCase()}`;

  const choose = (next: string) => {
    const previous = current;
    setCurrent(next);
    setStatus("idle");
    startTransition(async () => {
      try {
        await action(next);
        setStatus("saved");
      } catch {
        setCurrent(previous);
        setStatus("error");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 flex-1 basis-64">
        <label htmlFor={id} className="font-bold">
          {title}
        </label>
        <p className="text-sm opacity-70">{description}</p>
        {children}
      </div>
      <div className="flex items-center gap-2">
        {status === "saved" && <span className="text-sm opacity-70">Saved ✓</span>}
        {status === "error" && <span className="text-sm text-red-600">Couldn&apos;t save</span>}
        <select
          id={id}
          value={current}
          disabled={pending}
          onChange={(e) => choose(e.target.value)}
          className={inputAuto}
        >
          {options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
