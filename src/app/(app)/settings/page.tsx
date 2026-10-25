import { Suspense } from "react";
import { DeleteAccount } from "@/components/delete-account";
import { MessageTemplateEditor } from "@/components/message-template-editor";
import { SelectSetting, type Option } from "@/components/select-setting";
import { SwitchSetting } from "@/components/switch-setting";
import { ThemeChoice } from "@/components/theme";
import { TimezoneSetting } from "@/components/timezone-setting";
import {
  setAutoThankYou,
  setBirthdayReminders,
  setFollowUpDays,
  setThankYouDays,
  setWeekStart,
} from "@/lib/actions";
import { DEFAULT_TEMPLATE } from "@/lib/message";
import { loadSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings – MBA Recruiting Tool" };

const WEEK_START: Option[] = [
  ["0", "Sunday"],
  ["1", "Monday"],
];

const THANK_YOU_TIMING: Option[] = [
  ["0", "The same day"],
  ["1", "The next day"],
  ["2", "2 days later"],
  ["3", "3 days later"],
  ["7", "A week later"],
];

const FOLLOW_UP_TIMING: Option[] = [
  ["0", "Off"],
  ["3", "After 3 days"],
  ["5", "After 5 days"],
  ["7", "After a week"],
  ["10", "After 10 days"],
  ["14", "After 2 weeks"],
];

// If a saved value isn't one of the presets, still show it.
const withValue = (options: Option[], value: number, label: string): Option[] =>
  options.some(([v]) => v === String(value)) ? options : [...options, [String(value), label]];

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-5">
      <h2 className="border-b border-black/10 pb-2 text-lg font-semibold dark:border-white/15">{title}</h2>
      {children}
    </section>
  );
}

async function SettingsForm({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const [settings, { data: profile }] = await Promise.all([
    loadSettings(supabase),
    supabase.from("profiles").select("display_name, message_template").maybeSingle(),
  ]);
  const name = profile?.display_name ?? "";

  return (
    <div className="flex flex-col gap-10">
      {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}

      <Section title="Appearance">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold">Theme</div>
            <p className="text-sm opacity-70">
              System follows your device. This is saved in this browser, so set it again on your phone if you like.
            </p>
          </div>
          <ThemeChoice />
        </div>
      </Section>

      <Section title="Dates and time">
        <TimezoneSetting value={settings.timezone} />
        <SelectSetting
          title="Week starts on"
          description="Used for the dashboard's weekly numbers, weekly goals, and the History page."
          value={String(settings.weekStart)}
          options={WEEK_START}
          action={(day) => setWeekStart(Number(day))}
        />
      </Section>

      <Section title="Reminders">
        <SwitchSetting
          title="Thank-you reminders"
          description="When you mark an info interview as done, automatically add an action item to send a thank-you message."
          checked={settings.autoThankYou}
          action={setAutoThankYou}
        />
        <SelectSetting
          title="Thank-you reminder is due"
          description="How long after the interview. Only used when thank-you reminders are on."
          value={String(settings.thankYouDays)}
          options={withValue(THANK_YOU_TIMING, settings.thankYouDays, `${settings.thankYouDays} days later`)}
          action={(days) => setThankYouDays(Number(days))}
        />
        <SelectSetting
          title="Follow-up reminders"
          description="After you log a request, add an action item to follow up if you haven't heard back. It goes away on its own once the interview is scheduled or done."
          value={String(settings.followUpDays)}
          options={withValue(FOLLOW_UP_TIMING, settings.followUpDays, `After ${settings.followUpDays} days`)}
          action={(days) => setFollowUpDays(Number(days))}
        />
        <SwitchSetting
          title="Birthday reminders"
          description="Add a yearly action item to wish contacts a happy birthday. Turning this off removes the open ones; turning it on adds them back."
          checked={settings.birthdayReminders}
          action={setBirthdayReminders}
        />
      </Section>

      <Section title="Outreach message" id="message">
        <p className="-mt-2 text-sm opacity-70">
          The Chrome extension drafts this message with each person&apos;s first name and company filled in, ready to
          copy and paste.
        </p>
        <MessageTemplateEditor template={profile?.message_template || DEFAULT_TEMPLATE} myName={name.includes("@") ? "" : name} />
      </Section>

      <Section title="Your data">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <div className="font-bold">Export everything</div>
            <p className="text-sm opacity-70">
              Download your contacts, notes, action items, applications, and activity log as spreadsheet files (CSV in a
              ZIP).
            </p>
          </div>
          <a
            href="/api/export"
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-bold dark:border-white/20"
          >
            Download my data
          </a>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <div className="font-bold">Delete my account</div>
            <p className="text-sm opacity-70">Permanently removes your account and all of your data.</p>
          </div>
          <DeleteAccount />
        </div>
      </Section>
    </div>
  );
}

export default function SettingsPage(props: PageProps<"/settings">) {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <SettingsForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
