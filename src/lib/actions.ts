"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addRecurrence, isValidTimezone, nextBirthday, startOfWeek, today } from "@/lib/dates";
import { clearFollowUp, recordMilestone, type Milestone } from "@/lib/milestones";
import { loadSettings } from "@/lib/settings";
import {
  STAGES,
  RECURRENCES,
  APPLICATION_STATUSES,
  ACTIVITY_KINDS,
  type ActivityKind,
} from "@/lib/constants";

// Row-level security is the real guard; this makes failures explicit and early.
async function getDb() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Not signed in");
  return supabase;
}

// Today's date in the signed-in user's time zone (a Settings choice).
async function todayFor(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  return today((await loadSettings(db)).timezone);
}

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly (readonly [T, string])[], fallback: T): T {
  return allowed.some(([v]) => v === value) ? (value as T) : fallback;
}

function contactFields(formData: FormData) {
  return {
    full_name: text(formData, "full_name") ?? "Unnamed contact",
    company: text(formData, "company"),
    title: text(formData, "title"),
    linkedin_url: text(formData, "linkedin_url"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    how_met: text(formData, "how_met"),
    birthday: text(formData, "birthday"),
    stage: oneOf(text(formData, "stage"), STAGES, "identified"),
    tags: (text(formData, "tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

// Keeps a yearly "happy birthday" action item in step with a contact's birthday.
// Only acts when the birthday (or name) changed, so deleting the reminder yourself sticks.
async function syncBirthdayItem(
  db: Awaited<ReturnType<typeof getDb>>,
  contactId: string,
  fullName: string,
  birthday: string | null,
  before: { birthday: string | null; full_name: string } | null,
) {
  const settings = await loadSettings(db);
  if (!settings.birthdayReminders) return; // turned off in Settings
  const title = `Wish ${fullName} a happy birthday`;
  const { data: open } = await db
    .from("action_items")
    .select("id")
    .eq("contact_id", contactId)
    .eq("source", "birthday")
    .is("completed_at", null)
    .maybeSingle();

  if (before && before.birthday === birthday) {
    if (open && before.full_name !== fullName) await db.from("action_items").update({ title }).eq("id", open.id);
    return;
  }
  if (!birthday) {
    if (open) await db.from("action_items").delete().eq("id", open.id);
    return;
  }
  const due_date = nextBirthday(birthday, today(settings.timezone));
  if (open) {
    await db.from("action_items").update({ title, due_date }).eq("id", open.id);
  } else {
    await db
      .from("action_items")
      .insert({ contact_id: contactId, title, due_date, recurrence: "yearly", source: "birthday" });
  }
}

// Contacts -------------------------------------------------------------------

// Moving a contact to Requested or Completed counts as that milestone. Each is logged once per contact,
// so changing the stage back and forth can't inflate your numbers.
async function logMilestoneForStage(db: Awaited<ReturnType<typeof getDb>>, contactId: string, stage: string) {
  if (stage === "requested") await recordMilestone(db, contactId, "info_interview_request");
  else if (stage === "completed") await recordMilestone(db, contactId, "info_interview_completed");
  // Scheduled means they replied, so the "no reply yet" follow-up is no longer needed.
  if (stage === "scheduled") await clearFollowUp(db, contactId);
}

export async function createContact(formData: FormData) {
  const db = await getDb();
  const fields = contactFields(formData);
  const { data, error } = await db.from("contacts").insert(fields).select("id").single();
  if (error) {
    const msg = error.code === "23505" ? "You already saved a contact with that LinkedIn URL." : error.message;
    redirect(`/contacts/new?error=${encodeURIComponent(msg)}`);
  }
  if (fields.birthday) await syncBirthdayItem(db, data.id, fields.full_name, fields.birthday, null);
  await logMilestoneForStage(db, data.id, fields.stage);
  revalidatePath("/contacts");
  revalidatePath("/actions");
  revalidatePath("/");
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const db = await getDb();
  const fields = contactFields(formData);
  const { data: before } = await db.from("contacts").select("birthday, full_name, stage").eq("id", id).single();
  const { error } = await db.from("contacts").update(fields).eq("id", id);
  if (error) redirect(`/contacts/${id}?error=${encodeURIComponent(error.message)}`);
  await syncBirthdayItem(db, id, fields.full_name, fields.birthday, before);
  if (before?.stage !== fields.stage) await logMilestoneForStage(db, id, fields.stage);
  revalidatePath("/contacts");
  revalidatePath("/actions");
  revalidatePath("/");
  redirect(`/contacts/${id}`);
}

// Sets a contact's stage directly (the quick dropdown on the contact page and dashboard).
// Moving to Requested or Completed also logs that milestone (once per contact).
export async function setContactStage(id: string, formData: FormData) {
  const stage = text(formData, "stage");
  if (!STAGES.some(([value]) => value === stage)) return;
  const db = await getDb();
  await db.from("contacts").update({ stage }).eq("id", id);
  await logMilestoneForStage(db, id, stage as string);
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  revalidatePath("/actions");
  revalidatePath("/");
}

// Stars (or unstars) a contact who has said they're willing to refer you.
export async function setWillingToRefer(id: string, value: boolean) {
  const db = await getDb();
  await db.from("contacts").update({ willing_to_refer: value }).eq("id", id);
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function deleteContact(id: string) {
  const db = await getDb();
  await db.from("contacts").delete().eq("id", id);
  revalidatePath("/contacts");
  redirect("/contacts");
}

// Notes ----------------------------------------------------------------------

// Creates the note when noteId is null; returns the note id so the caller can keep updating it.
export async function saveNote(contactId: string, noteId: string | null, body: string): Promise<string> {
  const db = await getDb();
  if (noteId) {
    const { error } = await db.from("contact_notes").update({ body }).eq("id", noteId);
    if (error) throw new Error(error.message);
    return noteId;
  }
  const { data, error } = await db
    .from("contact_notes")
    .insert({ contact_id: contactId, body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function addNote(contactId: string, formData: FormData) {
  const body = text(formData, "body");
  if (!body) return;
  await saveNote(contactId, null, body);
  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteNote(contactId: string, noteId: string) {
  const db = await getDb();
  await db.from("contact_notes").delete().eq("id", noteId);
  revalidatePath(`/contacts/${contactId}`);
}

// Action items ---------------------------------------------------------------

export async function addActionItem(contactId: string | null, formData: FormData) {
  const title = text(formData, "title");
  if (!title) return;
  const db = await getDb();
  await db.from("action_items").insert({
    contact_id: contactId,
    title,
    due_date: text(formData, "due_date"),
    recurrence: oneOf(text(formData, "recurrence"), RECURRENCES, "none"),
  });
  revalidatePath("/actions");
  revalidatePath("/");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function updateActionItem(id: string, formData: FormData) {
  const title = text(formData, "title");
  if (!title) return;
  const db = await getDb();
  await db
    .from("action_items")
    .update({
      title,
      due_date: text(formData, "due_date"),
      recurrence: oneOf(text(formData, "recurrence"), RECURRENCES, "none"),
    })
    .eq("id", id);
  revalidatePath("/actions");
  revalidatePath("/");
  revalidatePath("/contacts", "layout");
}

export async function completeActionItem(id: string) {
  const db = await getDb();
  const { data: item } = await db
    .from("action_items")
    .select("contact_id, title, due_date, recurrence, completed_at, source")
    .eq("id", id)
    .single();
  if (!item || item.completed_at) return;

  await db.from("action_items").update({ completed_at: new Date().toISOString() }).eq("id", id);

  // Recurring items spawn their next occurrence.
  if (item.recurrence !== "none" && item.due_date) {
    await db.from("action_items").insert({
      contact_id: item.contact_id,
      title: item.title,
      recurrence: item.recurrence,
      source: item.source,
      due_date: addRecurrence(item.due_date, item.recurrence),
    });
  }
  revalidatePath("/actions");
  revalidatePath("/");
  if (item.contact_id) revalidatePath(`/contacts/${item.contact_id}`);
}

export async function reopenActionItem(id: string) {
  const db = await getDb();
  await db.from("action_items").update({ completed_at: null }).eq("id", id);
  revalidatePath("/actions");
  revalidatePath("/");
  revalidatePath("/contacts", "layout");
}

export async function deleteActionItem(id: string) {
  const db = await getDb();
  await db.from("action_items").delete().eq("id", id);
  revalidatePath("/actions");
  revalidatePath("/");
  revalidatePath("/contacts", "layout");
}

// Applications ---------------------------------------------------------------

function applicationFields(formData: FormData) {
  return {
    company: text(formData, "company") ?? "Unknown company",
    role: text(formData, "role") ?? "Unknown role",
    job_url: text(formData, "job_url"),
    status: oneOf(text(formData, "status"), APPLICATION_STATUSES, "wishlist"),
    applied_on: text(formData, "applied_on"),
    deadline: text(formData, "deadline"),
    referrer_contact_id: text(formData, "referrer_contact_id"),
    notes: text(formData, "notes"),
  };
}

type Db = Awaited<ReturnType<typeof getDb>>;

async function logActivity(
  db: Db,
  kind: ActivityKind,
  extra: { contact_id?: string | null; application_id?: string | null; occurred_on?: string; note?: string | null } = {},
) {
  await db.from("activities").insert({ kind, ...extra });
}

export async function createApplication(formData: FormData) {
  const db = await getDb();
  const fields = applicationFields(formData);
  if (fields.status !== "wishlist" && !fields.applied_on) fields.applied_on = await todayFor(db);
  const { data, error } = await db.from("applications").insert(fields).select("id").single();
  if (error) throw new Error(error.message);
  // Anything past the wishlist counts as a submitted application.
  if (fields.status !== "wishlist") {
    await logActivity(db, "application_submitted", { application_id: data.id, occurred_on: fields.applied_on! });
  }
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function updateApplication(id: string, formData: FormData) {
  const db = await getDb();
  await saveApplication(db, id, applicationFields(formData));
}

export async function setApplicationStatus(id: string, formData: FormData) {
  const db = await getDb();
  const status = oneOf(text(formData, "status"), APPLICATION_STATUSES, "wishlist");
  await saveApplication(db, id, { status });
}

// Moving an application off the wishlist for the first time logs a submission.
async function saveApplication(db: Db, id: string, fields: Record<string, unknown> & { status?: string; applied_on?: string | null }) {
  const { data: before } = await db.from("applications").select("status, applied_on").eq("id", id).single();
  if (!before) return;
  const submitting = before.status === "wishlist" && fields.status && fields.status !== "wishlist";
  const todayStr = await todayFor(db);
  if (submitting && !fields.applied_on && !before.applied_on) fields.applied_on = todayStr;

  const { error } = await db.from("applications").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  if (submitting) {
    await logActivity(db, "application_submitted", {
      application_id: id,
      occurred_on: fields.applied_on ?? before.applied_on ?? todayStr,
    });
  }
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function deleteApplication(id: string) {
  const db = await getDb();
  await db.from("applications").delete().eq("id", id);
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function logInterview(applicationId: string) {
  const db = await getDb();
  await logActivity(db, "interview", { application_id: applicationId });
  revalidatePath("/applications");
  revalidatePath("/");
}

// Activities and KPIs --------------------------------------------------------

export async function addActivity(formData: FormData) {
  const db = await getDb();
  await logActivity(db, oneOf(text(formData, "kind"), ACTIVITY_KINDS, "mock_interview"), {
    occurred_on: text(formData, "occurred_on") ?? (await todayFor(db)),
    note: text(formData, "note"),
  });
  revalidatePath("/");
}

// Changes when an activity happened (say, you logged Saturday's interview on Sunday) and its note.
// Its type and contact stay fixed, so each contact still has one request and one interview on record.
export async function updateActivity(id: string, formData: FormData) {
  const db = await getDb();
  const settings = await loadSettings(db);
  const date = text(formData, "occurred_on");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today(settings.timezone)) {
    throw new Error("Pick a date that isn't in the future.");
  }
  const { error } = await db.from("activities").update({ occurred_on: date, note: text(formData, "note") }).eq("id", id);
  if (error) throw new Error(error.message);
  // Weekly counts, History, and the "✓ Request sent …" dates on contact pages all read from this.
  revalidatePath("/", "layout");
}

export async function deleteActivity(id: string) {
  const db = await getDb();
  await db.from("activities").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// Logs an info-interview milestone for a contact and advances their stage (never backwards).
export async function logContactActivity(contactId: string, kind: Milestone) {
  const db = await getDb();
  await recordMilestone(db, contactId, kind);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  revalidatePath("/actions");
  revalidatePath("/");
}

export async function saveGoals(formData: FormData) {
  const db = await getDb();
  const { data } = await db.auth.getClaims();
  const settings = await loadSettings(db);
  const goals: Record<string, number> = {};
  for (const [kind] of ACTIVITY_KINDS) {
    const n = Number.parseInt(text(formData, kind) ?? "", 10);
    if (Number.isFinite(n) && n > 0) goals[kind] = n;
  }
  await db.from("profiles").update({ weekly_goals: goals }).eq("id", data!.claims.sub);
  // Goals apply from this week forward; earlier weeks keep the goals they were judged against.
  await db
    .from("weekly_goal_snapshots")
    .upsert(
      { week_start: startOfWeek(today(settings.timezone), settings.weekStart), goals },
      { onConflict: "user_id,week_start" },
    );
  revalidatePath("/");
  revalidatePath("/history");
}

export async function saveMessageSettings(formData: FormData) {
  const db = await getDb();
  const { data } = await db.auth.getClaims();
  const template = text(formData, "template");
  const myName = text(formData, "my_name");
  await db
    .from("profiles")
    .update({
      message_template: template ? template.slice(0, 2000) : null, // null = use the default
      display_name: myName ? myName.slice(0, 100) : null,
    })
    .eq("id", data!.claims.sub);
  revalidatePath("/extension");
}

// Settings page ----------------------------------------------------------------

// Saves one or more profile settings. Throws on failure so the switch or select can show it and revert.
async function updateProfile(patch: Record<string, unknown>) {
  const db = await getDb();
  const { data } = await db.auth.getClaims();
  const { error } = await db.from("profiles").update(patch).eq("id", data!.claims.sub);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout"); // time zone and week start affect every page
}

export async function setTimezone(timeZone: string) {
  if (!isValidTimezone(timeZone)) throw new Error("Unknown time zone");
  await updateProfile({ timezone: timeZone });
}

export async function setWeekStart(value: string) {
  const day = Number(value);
  if (day !== 0 && day !== 1) throw new Error("Week must start on Sunday or Monday");
  await updateProfile({ week_start: day });
}

export async function setAutoThankYou(value: boolean) {
  await updateProfile({ auto_thank_you: value });
}

export async function setThankYouDays(value: string) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 14) throw new Error("Out of range");
  await updateProfile({ thank_you_days: days });
}

export async function setFollowUpDays(value: string) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 30) throw new Error("Out of range");
  await updateProfile({ follow_up_days: days });
}

// Turning birthday reminders off removes the open ones; turning them on adds one for every contact
// with a birthday that doesn't have one yet.
export async function setBirthdayReminders(on: boolean) {
  await updateProfile({ birthday_reminders: on });
  const db = await getDb();
  if (!on) {
    await db.from("action_items").delete().eq("source", "birthday").is("completed_at", null);
    return;
  }
  const todayStr = await todayFor(db);
  const [{ data: contacts }, { data: open }] = await Promise.all([
    db.from("contacts").select("id, full_name, birthday").not("birthday", "is", null),
    db.from("action_items").select("contact_id").eq("source", "birthday").is("completed_at", null),
  ]);
  const have = new Set((open ?? []).map((item) => item.contact_id));
  const rows = (contacts ?? [])
    .filter((c) => !have.has(c.id))
    .map((c) => ({
      contact_id: c.id,
      title: `Wish ${c.full_name} a happy birthday`,
      due_date: nextBirthday(c.birthday, todayStr),
      recurrence: "yearly",
      source: "birthday",
    }));
  if (rows.length) await db.from("action_items").insert(rows);
}

// Permanently deletes the account and everything in it. Requires typing DELETE.
export async function deleteAccount(formData: FormData) {
  if (text(formData, "confirm") !== "DELETE") redirect("/settings?error=Type%20DELETE%20to%20confirm");
  const db = await getDb();
  const { error } = await db.rpc("delete_my_account");
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  try {
    await db.auth.signOut();
  } catch {
    // The account is already gone; the session cookie is cleared either way.
  }
  redirect("/login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
