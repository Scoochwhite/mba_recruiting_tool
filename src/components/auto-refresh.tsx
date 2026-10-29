"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

const MIN_GAP_MS = 10_000; // never refresh more often than this
const RETRY_MS = 3_000; // if something is open, look again shortly
const MAX_RETRIES = 10;

// Quietly re-fetches the current page's data when you come back to the window or tab (or the connection
// returns), so things done elsewhere, like saving a contact from the Chrome extension, show up on their own.
// It waits if a dialog, the tour, or a pop-up is open, and keeps whatever you've typed.
export function AutoRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const lastRefresh = useRef(0);
  const retryTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    lastRefresh.current = Date.now(); // the page was just loaded, so it is already fresh
    const somethingIsOpen = () => !!document.querySelector("dialog[open], [role=dialog]");

    const attempt = (tries = 0) => {
      window.clearTimeout(retryTimer.current);
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < MIN_GAP_MS) return;
      if (somethingIsOpen()) {
        if (tries < MAX_RETRIES) retryTimer.current = window.setTimeout(() => attempt(tries + 1), RETRY_MS);
        return;
      }
      lastRefresh.current = Date.now();
      startTransition(() => router.refresh());
    };

    const onReturn = () => attempt();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);
    window.addEventListener("pageshow", onReturn);
    return () => {
      window.clearTimeout(retryTimer.current);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [router]);

  return null;
}
