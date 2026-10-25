"use client";

import { useState, useSyncExternalStore } from "react";
import { setTimezone } from "@/lib/actions";
import { SelectSetting, type Option } from "./select-setting";

const COMMON: Option[] = [
  ["America/Los_Angeles", "Pacific Time (Los Angeles)"],
  ["America/Denver", "Mountain Time (Denver)"],
  ["America/Phoenix", "Arizona (Phoenix)"],
  ["America/Chicago", "Central Time (Chicago)"],
  ["America/New_York", "Eastern Time (New York)"],
  ["America/Anchorage", "Alaska (Anchorage)"],
  ["Pacific/Honolulu", "Hawaii (Honolulu)"],
  ["America/Vancouver", "Vancouver"],
  ["America/Toronto", "Toronto"],
  ["America/Mexico_City", "Mexico City"],
  ["America/Sao_Paulo", "São Paulo"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris, Berlin, Madrid"],
  ["Africa/Johannesburg", "Johannesburg"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Kolkata", "India (Kolkata)"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Hong_Kong", "Hong Kong"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"],
];

// Your zone is always selectable, even if it isn't in the short list above.
function withZone(options: Option[], zone: string): Option[] {
  return options.some(([value]) => value === zone) ? options : [...options, [zone, zone.replaceAll("_", " ")]];
}

export function TimezoneSetting({ value }: { value: string }) {
  const [saved, setSaved] = useState(value);
  const [failed, setFailed] = useState(false);
  // Your device's zone: known only in the browser, so it is null during the server render.
  const device = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  const options = withZone(device ? withZone(COMMON, device) : COMMON, saved);

  return (
    <SelectSetting
      key={saved}
      title="Time zone"
      description="Decides what counts as today, when your weeks start and end, and the times shown on notes."
      value={saved}
      options={options}
      action={async (zone) => {
        await setTimezone(zone);
        setSaved(zone);
      }}
    >
      {device && device !== saved && (
        <button
          type="button"
          onClick={async () => {
            try {
              await setTimezone(device);
              setSaved(device);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
          className="mt-1 text-sm text-blue-600 underline"
        >
          Use my device&apos;s time zone ({device.replaceAll("_", " ")})
        </button>
      )}
      {failed && <p className="text-sm text-red-600">Couldn&apos;t save that. Try again.</p>}
    </SelectSetting>
  );
}
