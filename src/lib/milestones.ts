import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES } from "@/lib/constants";
import { addDays, today } from "@/lib/dates";
import { loadSettings } from "@/lib/settings";

export type Milestone = "info_interview_request" | "info_interview_completed";

// Removes a contact's open "follow up, no reply yet" reminder, for when they've replied or the interview is on.
export async function clearFollowUp(db: SupabaseClient, contactId: string) {
  await db
    .from("action_items")
    .delete()
    .eq("contact_id", contactId)
    .eq("source", "follow_up")
    .is("completed_at", null);
}

// Logs an info-interview milestone for a contact, advances their stage (never backwards), and adds the
// reminders you've turned on in Settings: a follow-up nudge after a request, a thank-you after an interview.
// Once per contact and milestone. Returns false if it was already logged.
export async function recordMilestone(db: SupabaseClient, contactId: string, kind: Milestone): Promise<boolean> {
  const settings = await loadSettings(db);
  const todayStr = today(settings.timezone);

  const { data: existing } = await db
    .from("activities")
    .select("id")
    .eq("contact_id", contactId)
    .eq("kind", kind)
    .limit(1);
  if (existing?.length) return false;

  const { error } = await db.from("activities").insert({ kind, contact_id: contactId, occurred_on: todayStr });
  if (error?.code === "23505") return false; // a simultaneous request already logged it and did the follow-ups
  if (error) throw new Error(error.message);

  const target = kind === "info_interview_request" ? "requested" : "completed";
  const order = STAGES.map(([value]) => value as string);
  const { data: contact } = await db.from("contacts").select("stage, full_name").eq("id", contactId).single();
  if (contact && order.indexOf(contact.stage) < order.indexOf(target)) {
    await db.from("contacts").update({ stage: target }).eq("id", contactId);
  }
  if (!contact) return true;

  // After sending a request, nudge yourself to follow up if you haven't heard back.
  if (kind === "info_interview_request" && settings.followUpDays > 0) {
    const { data: open } = await db
      .from("action_items")
      .select("id")
      .eq("contact_id", contactId)
      .eq("source", "follow_up")
      .is("completed_at", null)
      .limit(1);
    if (!open?.length) {
      await db.from("action_items").insert({
        contact_id: contactId,
        title: `Follow up with ${contact.full_name} (no reply yet)`,
        due_date: addDays(todayStr, settings.followUpDays),
        source: "follow_up",
      });
    }
  }

  if (kind === "info_interview_completed") {
    await clearFollowUp(db, contactId); // they obviously replied

    // After an interview, remind yourself to send a thank-you note (if turned on in Settings).
    if (settings.autoThankYou) {
      const { data: open } = await db
        .from("action_items")
        .select("id")
        .eq("contact_id", contactId)
        .eq("source", "thank_you")
        .is("completed_at", null)
        .limit(1);
      if (!open?.length) {
        await db.from("action_items").insert({
          contact_id: contactId,
          title: `Send ${contact.full_name} a thank-you message`,
          due_date: addDays(todayStr, settings.thankYouDays),
          source: "thank_you",
        });
      }
    }
  }
  return true;
}
