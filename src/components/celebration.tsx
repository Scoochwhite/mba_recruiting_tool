"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type GoalProgress = { kind: string; label: string; goal: number; total: number };

const OFF_KEY = "celebrations"; // "off" turns the pop-up off in this browser

// ---- on/off switch, saved in this browser ------------------------------------------------------

const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, "off");
  } catch {
    // Blocked storage: the switch still works until the page reloads.
  }
  listeners.forEach((callback) => callback());
}

// ---- showing the celebration (from anywhere) ---------------------------------------------------

export function celebrate(items: GoalProgress[], options: { force?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent("celebrate", { detail: { items, force: options.force === true } }));
}

// Watches your weekly totals. It remembers the totals the dashboard last showed in this browser, and
// celebrates when a goal goes from unmet to met. The first visit only records a starting point.
export function GoalWatcher({
  weekStart,
  isCurrentWeek,
  progress,
}: {
  weekStart: string;
  isCurrentWeek: boolean;
  progress: GoalProgress[];
}) {
  useEffect(() => {
    const key = `goalProgress:${weekStart}`;
    let previous: Record<string, number> = {};
    try {
      previous = JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      // Unreadable or blocked storage: treat as a first visit.
    }
    const reached = progress.filter(
      (p) => p.goal > 0 && p.total >= p.goal && typeof previous[p.kind] === "number" && previous[p.kind] < p.goal,
    );
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(progress.map((p) => [p.kind, p.total]))));
    } catch {
      // Nothing to do.
    }
    // Only for the current week, and after a beat so you see the dashboard update first.
    if (isCurrentWeek && reached.length) window.setTimeout(() => celebrate(reached), 500);
  }, [weekStart, isCurrentWeek, progress]);
  return null;
}

// Confetti pieces are fixed numbers (not random at render time), spread across the width.
const COLORS = ["#0077c8", "#ffffff", "#5db4f0", "#eaeaea", "#002e5d"];
const PIECES = Array.from({ length: 56 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 100) / 100 * 1.1,
  duration: 2.6 + ((i * 17) % 10) / 10 * 1.4,
  size: 7 + ((i * 11) % 6),
  drift: ((i * 29) % 21) - 10,
  spin: 360 + ((i * 47) % 540),
  color: COLORS[i % COLORS.length],
  round: i % 3 === 0,
}));

export function CelebrationHost() {
  const [items, setItems] = useState<GoalProgress[] | null>(null);

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const detail = (event as CustomEvent<{ items: GoalProgress[]; force: boolean }>).detail;
      if (detail.force || readEnabled()) setItems(detail.items);
    };
    window.addEventListener("celebrate", onCelebrate);
    return () => window.removeEventListener("celebrate", onCelebrate);
  }, []);

  // Closes on Escape, or by itself after a few seconds.
  useEffect(() => {
    if (!items) return;
    const timer = window.setTimeout(() => setItems(null), 9000);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setItems(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [items]);

  if (!items) return null;

  return (
    <>
      <div aria-hidden onMouseDown={() => setItems(null)} className="fixed inset-0 z-[58] bg-black/40" />

      <div aria-hidden className="pointer-events-none fixed inset-0 z-[59] overflow-hidden">
        {PIECES.map((piece, i) => (
          <span
            key={i}
            className="celebrate-piece absolute top-0 block"
            style={
              {
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 0.55,
                borderRadius: piece.round ? "9999px" : 2,
                backgroundColor: piece.color,
                boxShadow: "0 0 0 1px rgba(0,46,93,0.25)",
                "--delay": `${piece.delay}s`,
                "--duration": `${piece.duration}s`,
                "--drift": `${piece.drift}vw`,
                "--spin": `${piece.spin}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Goal reached"
        className="celebrate-card fixed left-1/2 top-1/2 z-[60] w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-6 text-center shadow-2xl dark:border-white/20 dark:bg-navy"
      >
        <div aria-hidden className="text-5xl">
          🎉
        </div>
        <h2 className="mt-2 text-2xl font-black">{items.length > 1 ? "Goals reached!" : "Goal reached!"}</h2>
        <p className="mt-1 text-sm opacity-70">Nice work. That&apos;s this week&apos;s target.</p>
        <ul className="mt-4 divide-y divide-black/10 text-left dark:divide-white/15">
          {items.map((item) => (
            <li key={item.kind} className="flex items-baseline justify-between gap-4 py-2">
              <span className="font-bold">{item.label}</span>
              <span className="text-sm opacity-70">
                {item.total} / {item.goal}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          autoFocus
          onClick={() => setItems(null)}
          className="mt-5 rounded-md bg-black px-5 py-2 text-sm font-bold text-white dark:bg-white dark:text-black"
        >
          Thanks!
        </button>
      </div>
    </>
  );
}

// Settings row: turn the pop-up on or off in this browser, and preview it.
export function CelebrationSetting() {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true);

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1 basis-64">
        <div className="font-bold" id="celebrations-label">
          Goal celebrations
        </div>
        <p className="text-sm opacity-70">
          Show a congratulations pop-up with confetti when you reach a weekly goal. Saved in this browser.
        </p>
        <button
          type="button"
          onClick={() =>
            celebrate([{ kind: "preview", label: "Info interview requests", goal: 10, total: 10 }], { force: true })
          }
          className="mt-2 text-sm text-blue-600 underline"
        >
          Preview it
        </button>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="celebrations-label"
        onClick={() => saveEnabled(!enabled)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-ocean" : "bg-black/25 dark:bg-white/30"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
