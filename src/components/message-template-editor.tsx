"use client";

import { useRef, useState } from "react";
import { saveMessageSettings } from "@/lib/actions";
import { DEFAULT_TEMPLATE, PLACEHOLDERS, renderMessage } from "@/lib/message";
import { button, buttonQuiet, input, label } from "./ui";

export function MessageTemplateEditor({ template, myName }: { template: string; myName: string }) {
  const [text, setText] = useState(template);
  const [name, setName] = useState(myName);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const area = useRef<HTMLTextAreaElement>(null);

  // Insert a placeholder where the cursor is.
  const insert = (token: string) => {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    setStatus("idle");
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const preview = renderMessage(text, { firstName: "Alex", company: "Walmart", myName: name });

  return (
    <form
      action={async (formData) => {
        await saveMessageSettings(formData);
        setStatus("saved");
      }}
      className="flex flex-col gap-4"
    >
      <label className={label}>
        Your name (used for {"{my_name}"})
        <input
          name="my_name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setStatus("idle");
          }}
          placeholder="e.g. Alex White"
          className={input}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="template" className="text-sm">
          Message template
        </label>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map(([token, hint]) => (
            <button key={token} type="button" onClick={() => insert(token)} title={hint} className={`${buttonQuiet} !py-1 text-xs`}>
              + {token}
            </button>
          ))}
        </div>
        <textarea
          id="template"
          name="template"
          ref={area}
          rows={9}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus("idle");
          }}
          className={input}
        />
        <p className="text-xs opacity-70">
          {text.length} characters. LinkedIn limits the note on a connection request to a few hundred characters, so keep
          it short if you plan to send it that way.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm opacity-70">Preview (with an example name and company)</span>
        <pre className="whitespace-pre-wrap break-words rounded-md border border-black/10 p-3 font-sans text-sm dark:border-white/15">
          {preview}
        </pre>
      </div>

      <div className="flex items-center gap-3">
        <button className={button}>Save template</button>
        <button
          type="button"
          className={buttonQuiet}
          onClick={() => {
            setText(DEFAULT_TEMPLATE);
            setStatus("idle");
          }}
        >
          Reset to default
        </button>
        {status === "saved" && <span className="text-sm opacity-70">Saved ✓</span>}
      </div>
    </form>
  );
}
