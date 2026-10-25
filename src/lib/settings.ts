import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/dates";

export type UserSettings = {
  timezone: string;
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  autoThankYou: boolean;
  thankYouDays: number; // days after an interview
  birthdayReminders: boolean;
  followUpDays: number; // days after a request with no reply; 0 = off
};

export const DEFAULT_SETTINGS: UserSettings = {
  timezone: DEFAULT_TIMEZONE,
  weekStart: 0,
  autoThankYou: true,
  thankYouDays: 1,
  birthdayReminders: true,
  followUpDays: 0,
};

// Reads the signed-in user's settings. If the settings columns don't exist yet (a migration not run),
// the query fails and the defaults, which match how the app behaved before, are used instead.
export async function loadSettings(db: SupabaseClient): Promise<UserSettings> {
  const { data } = await db
    .from("profiles")
    .select("timezone, week_start, auto_thank_you, thank_you_days, birthday_reminders, follow_up_days")
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    timezone: data.timezone && isValidTimezone(data.timezone) ? data.timezone : DEFAULT_SETTINGS.timezone,
    weekStart: data.week_start === 1 ? 1 : 0,
    autoThankYou: data.auto_thank_you ?? DEFAULT_SETTINGS.autoThankYou,
    thankYouDays: data.thank_you_days ?? DEFAULT_SETTINGS.thankYouDays,
    birthdayReminders: data.birthday_reminders ?? DEFAULT_SETTINGS.birthdayReminders,
    followUpDays: data.follow_up_days ?? DEFAULT_SETTINGS.followUpDays,
  };
}
