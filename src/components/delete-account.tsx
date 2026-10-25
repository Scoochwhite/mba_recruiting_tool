"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/actions";
import { EditDialog } from "./edit-dialog";
import { input } from "./ui";

// Asks you to type DELETE before enabling the button; the server checks it again.
export function DeleteAccount() {
  const [typed, setTyped] = useState("");
  return (
    <EditDialog title="Delete your account?" buttonLabel="Delete my account…" buttonClass="rounded-md border border-red-600 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-600/10">
      <form action={deleteAccount} className="flex flex-col gap-4">
        <p className="text-sm">
          This permanently deletes your account and everything in it: contacts, notes, action items, applications, and
          activity. It can&apos;t be undone. Download your data first if you want a copy.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span>
            Type <strong>DELETE</strong> to confirm
          </span>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className={input}
          />
        </label>
        <div>
          <button
            disabled={typed !== "DELETE"}
            className="rounded-md bg-[#c62828] px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Permanently delete everything
          </button>
        </div>
      </form>
    </EditDialog>
  );
}
