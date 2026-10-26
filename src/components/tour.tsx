"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { markTipSeen, markTourSeen } from "@/lib/actions";
import { TOUR_STEPS, TOUR_VERSION, type TipId, type TourStep } from "@/lib/tour";

// ---- what this person has already been shown (set once by TourHost, read by PageTip) -----------------

type Seen = { loaded: boolean; version: number; tips: string[] };
let seen: Seen = { loaded: false, version: TOUR_VERSION, tips: [] };
const listeners = new Set<() => void>();

function update(next: Partial<Seen>) {
  seen = { ...seen, ...next };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const snapshot = () => seen;

// ---- starting the tour again (from the Menu) ------------------------------------------------------

export type TourMode = "all" | "new";

export function startTour(mode: TourMode) {
  try {
    sessionStorage.setItem("tour:replay", mode);
  } catch {
    // Blocked storage: replay from another page won't carry over, but the tour still works from the dashboard.
  }
  window.dispatchEvent(new Event("tour:start"));
}

function takeReplayRequest(): TourMode | null {
  try {
    const mode = sessionStorage.getItem("tour:replay");
    sessionStorage.removeItem("tour:replay");
    return mode === "all" || mode === "new" ? mode : null;
  } catch {
    return null;
  }
}

// ---- helpers ------------------------------------------------------------------------------------------

type Rect = { top: number; left: number; width: number; height: number };
type Layout = { hole: Rect; cardHeight: number; vw: number; vh: number };
type Session = { steps: TourStep[]; index: number; intro: "welcome" | "whats-new" | null; auto: boolean };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isVisible = (selector: string) => {
  const el = document.querySelector(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

// The page renders in pieces, so wait (briefly) for the main content before choosing which steps can run.
async function waitForPage() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && !isVisible('[data-tour="contacts"]')) await sleep(250);
  await sleep(250);
}

function cardStyle(layout: Layout | null, centered: boolean): React.CSSProperties {
  const vw = layout?.vw ?? window.innerWidth;
  const vh = layout?.vh ?? window.innerHeight;
  const width = Math.min(340, vw - 24);
  if (centered || !layout) return { left: "50%", top: "50%", width, transform: "translate(-50%, -50%)" };
  const { hole, cardHeight } = layout;
  const gap = 14;
  let top = hole.top + hole.height + gap; // below the highlighted thing
  if (top + cardHeight > vh - 12) top = hole.top - cardHeight - gap; // otherwise above it
  if (top < 12) top = Math.max(12, vh - cardHeight - 12); // no room either way: dock at the bottom
  const left = Math.min(Math.max(hole.left + hole.width / 2 - width / 2, 12), vw - width - 12);
  return { top, left, width };
}

// ---- the tour ------------------------------------------------------------------------------------------

export function TourHost({ enabled, version, tips }: { enabled: boolean; version: number; tips: string[] }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const launching = useRef(false);
  const autoDone = useRef(false);
  const tipsKey = tips.join("|");

  useEffect(() => {
    update({ loaded: enabled, version, tips: tipsKey ? tipsKey.split("|") : [] });
  }, [enabled, version, tipsKey]);

  const launch = useCallback(async (mode: "auto" | "all" | "new") => {
    if (launching.current) return;
    launching.current = true;
    try {
      await waitForPage();
      const steps = TOUR_STEPS.filter((step) =>
        mode === "all" ? true : mode === "new" ? step.since === TOUR_VERSION : step.since > seen.version,
      ).filter((step) => isVisible(step.target));
      if (!steps.length) return;
      const intro = mode === "all" ? null : mode === "auto" && seen.version === 0 ? "welcome" : "whats-new";
      setSession({ steps, index: intro ? -1 : 0, intro, auto: mode === "auto" });
    } finally {
      launching.current = false;
    }
  }, []);

  // Start by itself on the dashboard for someone who hasn't seen the latest tour, or when replay was requested.
  useEffect(() => {
    if (pathname !== "/") return;
    const timer = setTimeout(() => {
      const replay = takeReplayRequest();
      if (replay) void launch(replay);
      else if (enabled && !autoDone.current && seen.version < TOUR_VERSION) {
        autoDone.current = true;
        void launch("auto");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname, enabled, launch]);

  // "Take the tour" pressed while already on the dashboard.
  useEffect(() => {
    const onStart = () => {
      if (window.location.pathname !== "/") return; // the page change will pick the request up
      const replay = takeReplayRequest();
      if (replay) void launch(replay);
    };
    window.addEventListener("tour:start", onStart);
    return () => window.removeEventListener("tour:start", onStart);
  }, [launch]);

  const finish = useCallback(() => {
    const wasAutomatic = session?.auto;
    setSession(null);
    setLayout(null);
    if (wasAutomatic) {
      update({ version: TOUR_VERSION });
      markTourSeen().catch(() => {});
    }
  }, [session]);

  const step = session && session.index >= 0 ? session.steps[session.index] : null;
  const showing = !!session && pathname === "/";

  // Follow the highlighted thing: scroll it into view, then track its position every frame
  // (it moves while scrolling, resizing, or when the page above it changes).
  useEffect(() => {
    if (!step || !showing) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    let frame = 0;
    let last = "";
    const tick = () => {
      const r = el.getBoundingClientRect();
      const cardHeight = cardRef.current?.offsetHeight ?? 0;
      const key = [r.top, r.left, r.width, r.height, cardHeight, innerWidth, innerHeight].map(Math.round).join(",");
      if (key !== last) {
        last = key;
        setLayout({
          hole: { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 },
          cardHeight,
          vw: innerWidth,
          vh: innerHeight,
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, showing]);

  // Keyboard: Escape skips, arrows move, and focus follows the main button.
  useEffect(() => {
    if (!session || !showing) return;
    const move = (delta: number) =>
      setSession((s) => (s ? { ...s, index: Math.min(Math.max(s.index + delta, s.intro ? -1 : 0), s.steps.length - 1) } : s));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, showing, finish]);

  useEffect(() => {
    if (showing) primaryRef.current?.focus();
  }, [showing, session?.index, session?.intro]);

  if (!session || !showing) return null;

  const total = session.steps.length;
  const last = session.index === total - 1;
  const centered = session.index === -1;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transition = reduced ? undefined : "all 260ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  const go = (delta: number) => setSession({ ...session, index: session.index + delta });

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Catches clicks so the page behind can't be used mid-tour. */}
      <div className="absolute inset-0" />
      {centered || !layout ? (
        <div className="absolute inset-0 bg-[rgba(0,16,40,0.62)]" />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl"
          style={{
            ...layout.hole,
            boxShadow: "0 0 0 9999px rgba(0,16,40,0.62), 0 0 0 3px #0077c8",
            transition,
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="absolute rounded-xl border border-black/10 bg-white p-5 text-black shadow-2xl dark:border-white/20 dark:bg-navy dark:text-white"
        style={{ ...cardStyle(layout, centered), transition }}
      >
        {session.intro && centered ? (
          <>
            <div aria-hidden className="text-4xl">
              {session.intro === "welcome" ? "👋" : "✨"}
            </div>
            <h2 id="tour-title" className="mt-2 text-xl font-black">
              {session.intro === "welcome" ? "Welcome to MBA Recruiting Tool" : "What's new"}
            </h2>
            {session.intro === "welcome" ? (
              <p className="mt-1 text-sm opacity-80">
                Want a quick tour (about 30 seconds) of where everything is? You can replay it any time from the Menu.
              </p>
            ) : (
              <ul className="mt-2 list-disc pl-5 text-sm opacity-90">
                {session.steps.map((s) => (
                  <li key={s.id}>{s.title}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={finish} className="text-sm underline opacity-80">
                Not now
              </button>
              <button
                ref={primaryRef}
                type="button"
                onClick={() => go(1)}
                className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-black"
              >
                {session.intro === "welcome" ? "Start the tour" : "Show me"}
              </button>
            </div>
          </>
        ) : (
          step && (
            <>
              <p className="text-xs uppercase tracking-wide opacity-70">
                Step {session.index + 1} of {total}
              </p>
              <h2 id="tour-title" className="mt-1 text-lg font-black">
                {step.title}
              </h2>
              <p className="mt-1 text-sm opacity-80">{step.body}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button type="button" onClick={finish} className="text-sm underline opacity-80">
                  Skip tour
                </button>
                <div className="flex gap-2">
                  {session.index > 0 && (
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/25"
                    >
                      Back
                    </button>
                  )}
                  <button
                    ref={primaryRef}
                    type="button"
                    onClick={() => (last ? finish() : go(1))}
                    className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-black"
                  >
                    {last ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

// ---- one-time tip at the top of a page ------------------------------------------------------------------

export function PageTip({ id, children }: { id: TipId; children: React.ReactNode }) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!current.loaded || current.tips.includes(id)) return null;
  return (
    <aside role="note" className="flex items-start gap-3 rounded-lg border border-ocean/40 bg-ocean/10 p-3 text-sm">
      <span aria-hidden>💡</span>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={() => {
          update({ tips: [...current.tips, id] });
          markTipSeen(id).catch(() => {});
        }}
        className="shrink-0 font-bold underline"
      >
        Got it
      </button>
    </aside>
  );
}
