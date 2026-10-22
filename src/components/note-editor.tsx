"use client";

import { useEffect, useRef, useState } from "react";
import { saveNote } from "@/lib/actions";

type Status = "idle" | "saving" | "saved" | "error";

// Autosaving textarea. The note row is created on the first edit, then updated in place.
export function NoteEditor({
  contactId,
  initialBody,
}: {
  contactId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<Status>("idle");
  const noteId = useRef<string | null>(null);
  const lastSaved = useRef(initialBody);
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (body === lastSaved.current) return;
    const timer = setTimeout(() => {
      // Serialize saves so the first insert finishes before later updates reference its id.
      inFlight.current = inFlight.current.then(async () => {
        setStatus("saving");
        try {
          noteId.current = await saveNote(contactId, noteId.current, body);
          lastSaved.current = body;
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [body, contactId]);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[60vh] w-full flex-1 rounded-md border border-black/15 bg-transparent p-4 font-mono text-sm dark:border-white/20"
      />
      <p className="text-xs opacity-70">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && "Couldn't save — check your connection; your text is still here."}
        {status === "idle" && "Notes save automatically."}
      </p>
    </div>
  );
}
