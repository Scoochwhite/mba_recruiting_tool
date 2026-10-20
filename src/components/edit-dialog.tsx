"use client";

import { useRef } from "react";
import { buttonQuiet } from "./ui";

// Modal wrapper around server-rendered children (the edit form). Closes when the form submits.
export function EditDialog({
  title,
  buttonLabel = "Edit",
  children,
}: {
  title: string;
  buttonLabel?: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonQuiet}>
        {buttonLabel}
      </button>
      <dialog
        ref={dialog}
        // Clicking the dimmed backdrop (the dialog element itself) dismisses it.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-black/15 bg-white p-6 text-black backdrop:bg-black/50 dark:border-white/20 dark:bg-neutral-900 dark:text-white"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} className="text-sm opacity-60 hover:opacity-100">
            Cancel
          </button>
        </div>
        <div onSubmit={() => dialog.current?.close()}>{children}</div>
      </dialog>
    </>
  );
}
