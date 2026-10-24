"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type KpiItem = {
  id: string;
  date: string; // already formatted, e.g. "Oct 21"
  name: string;
  sub?: string;
  note?: string;
  href?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const DURATION = 380; // ms, grow and shrink
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const rectOf = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

// Where the open panel sits: centered, sized to its content but never taller than the screen.
const openRect = (itemCount: number): Rect => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(640, vw - 32);
  const height = Math.min(vh - 32, Math.max(300, 200 + 62 * itemCount));
  return { top: (vh - height) / 2, left: (vw - width) / 2, width, height };
};

function Summary({ label, total, goal }: { label: string; total: number; goal?: number }) {
  return (
    <>
      <div className="pr-6 text-sm opacity-70">{label}</div>
      <div className="mt-1 text-3xl font-black text-navy dark:text-white">
        {total}
        {goal ? <span className="text-base font-normal opacity-50"> / {goal}</span> : null}
      </div>
      {goal ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <div className="h-full bg-ocean" style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
        </div>
      ) : null}
    </>
  );
}

// A KPI card that grows into a panel listing who or what the number counts.
// Click outside the panel (or press Escape) and it shrinks back into the card.
export function KpiCard({
  label,
  total,
  goal,
  items,
  period,
}: {
  label: string;
  total: number;
  goal?: number;
  items: KpiItem[];
  period: string;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false); // panel exists
  const [expanded, setExpanded] = useState(false); // panel is at full size
  const [rect, setRect] = useState<Rect | null>(null);
  const [duration, setDuration] = useState(DURATION);

  const open = () => {
    if (!cardRef.current) return;
    setDuration(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION);
    setRect(rectOf(cardRef.current)); // start exactly on top of the card
    setMounted(true);
    // Two frames, so the panel paints at the card's size before it is told to grow.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setRect(openRect(items.length));
        setExpanded(true);
      }),
    );
  };

  const close = useCallback(() => {
    if (!expanded || !cardRef.current) return;
    setExpanded(false);
    setRect(rectOf(cardRef.current)); // shrink back onto the card
    closeTimer.current = window.setTimeout(() => {
      setMounted(false);
      cardRef.current?.focus();
    }, duration);
  }, [expanded, duration]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // While open: lock page scroll, close on Escape, keep the panel centered if the window resizes.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onResize = () => expanded && setRect(openRect(items.length));
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted, expanded, close, items.length]);

  useEffect(() => {
    if (mounted) panelRef.current?.focus();
  }, [mounted]);

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        onClick={open}
        title="See who's behind this number"
        // Hidden (but still taking up space) while its panel is open, so there is no double image.
        style={{ visibility: mounted ? "hidden" : "visible" }}
        className="relative w-full cursor-pointer rounded-lg border border-black/10 bg-lavender/40 p-4 text-left transition hover:border-ocean hover:shadow-sm dark:border-white/15 dark:bg-white/5"
      >
        <Summary label={label} total={total} goal={goal} />
        <span aria-hidden className="absolute right-3 top-3 text-lg leading-none opacity-40">
          ›
        </span>
      </button>

      {mounted && rect && (
        <>
          <div
            aria-hidden
            onMouseDown={close}
            className="fixed inset-0 z-40 bg-black/50"
            style={{ opacity: expanded ? 1 : 0, transition: `opacity ${duration}ms ease` }}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${label}, ${period}`}
            tabIndex={-1}
            className={`fixed z-50 flex flex-col overflow-hidden rounded-lg border border-black/10 outline-none dark:border-white/15 ${
              expanded ? "bg-white shadow-2xl dark:bg-navy" : "bg-[#f7f7f7] dark:bg-[#0d2b49]"
            }`}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              transition: `all ${duration}ms ${EASE}`,
            }}
          >
            <div className="relative shrink-0 p-4">
              <Summary label={label} total={total} goal={goal} />
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                tabIndex={expanded ? 0 : -1}
                className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm opacity-60 hover:opacity-100"
                style={{ opacity: expanded ? undefined : 0, transition: `opacity ${duration / 2}ms ease` }}
              >
                ✕
              </button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto border-t border-black/10 dark:border-white/15"
              style={{
                opacity: expanded ? 1 : 0,
                // Fade the details in once the panel has mostly grown; fade out immediately on close.
                transition: `opacity ${duration / 2}ms ease ${expanded ? duration * 0.4 : 0}ms`,
              }}
            >
              <p className="px-4 pt-3 text-xs uppercase tracking-wide opacity-70">{period}</p>
              {items.length ? (
                <ul className="divide-y divide-black/10 dark:divide-white/15">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-baseline gap-3 px-4 py-3">
                      <span className="w-14 shrink-0 text-xs opacity-70">{item.date}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {item.href ? (
                            <Link href={item.href} className="hover:underline">
                              {item.name}
                            </Link>
                          ) : (
                            item.name
                          )}
                        </div>
                        {item.sub && <div className="text-sm opacity-70">{item.sub}</div>}
                        {item.note && <div className="break-words text-sm opacity-70">{item.note}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm opacity-70">Nothing logged for this week.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
