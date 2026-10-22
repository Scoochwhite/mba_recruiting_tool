// Dates are plain "YYYY-MM-DD" strings (Postgres `date`). "Today" is computed in a
// fixed timezone so server-rendered pages agree with the user's calendar day.
// TODO: make the timezone a per-user profile setting.
const TIMEZONE = "America/Denver";

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addRecurrence(date: string, rule: "weekly" | "monthly" | "yearly"): string {
  if (rule === "weekly") return addDays(date, 7);
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + (rule === "monthly" ? 1 : 12));
  // Clamp (e.g. Jan 31 -> Feb 28, Feb 29 -> Feb 28).
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Sunday of the week containing `date` (weeks run Sunday through Saturday).
export function startOfWeek(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -day);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 8)}01`;
}

// Next occurrence of a birthday on or after `from` ("YYYY-MM-DD"); Feb 29 falls on Feb 28 in non-leap years.
export function nextBirthday(birthday: string, from: string): string {
  const [, month, day] = birthday.split("-").map(Number);
  const on = (year: number) => {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  };
  const year = Number(from.slice(0, 4));
  return on(year) >= from ? on(year) : on(year + 1);
}

// "Oct 21": compact form for tight spaces.
export function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// The calendar day ("YYYY-MM-DD") of a timestamp, in the app's timezone.
export function dateOf(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}
