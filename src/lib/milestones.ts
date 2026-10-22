import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES } from "@/lib/constants";
import { addDays, today } from "@/lib/dates";

export type Milestone = "info_interview_request" | "info_interview_completed";

// Logs an info-interview milestone for a contact, advances their stage (never backwards), and after a
// completed interview schedules a thank-you reminder. Once per contact and milestone.
// Returns false if it was already logged.
export async function recordMilestone(db: SupabaseClient, contactId: string, kind: Milestone): Promise<boolean> {
  const { data: existing } = await db
    .from("activities")
    .select("id")
    .eq("contact_id", contactId)
    .eq("kind", kind)
    .limit(1);
  if (existing?.length) return false;

  const { error } = await db.from("activities").insert({ kind, contact_id: contactId, occurred_on: today() });
  if (error?.code === "23505") return false; // a simultaneous request already logged it and did the follow-ups
  if (error) throw new Error(error.message);

  const target = kind === "info_interview_request" ? "requested" : "completed";
  const order = STAGES.map(([value]) => value as string);
  const { data: contact } = await db.from("contacts").select("stage, full_name").eq("id", contactId).single();
  if (contact && order.indexOf(contact.stage) < order.indexOf(target)) {
    await db.from("contacts").update({ stage: target }).eq("id", contactId);
  }

  // After an interview, remind yourself to send a thank-you note the next day.
  if (kind === "info_interview_completed" && contact) {
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
        due_date: addDays(today(), 1),
        source: "thank_you",
      });
    }
  }
  return true;
}
