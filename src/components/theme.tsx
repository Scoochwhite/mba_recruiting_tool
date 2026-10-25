"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "theme"; // "light" or "dark"; absent means follow the device

export function readPref(): ThemePref {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyPref(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// Lets components re-read the saved choice when it changes (here, or in another tab).
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function savePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Private mode or blocked storage: the choice still applies until the page is reloaded.
  }
  applyPref(pref);
  listeners.forEach((callback) => callback());
}

// While you're on "System", follow the device if its light/dark setting changes.
export function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => readPref() === "system" && applyPref("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return null;
}

const OPTIONS: [ThemePref, string][] = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

export function ThemeChoice() {
  // The server render assumes "system"; in the browser this reads the real saved choice.
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex overflow-hidden rounded-md border border-black/15 dark:border-white/20">
      {OPTIONS.map(([value, name]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => savePref(value)}
          className={`px-4 py-2 text-sm font-bold ${
            pref === value ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
