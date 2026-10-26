import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULT_TEMPLATE } from "@/lib/message";
import { recordMilestone } from "@/lib/milestones";

// Endpoint used by the Chrome extension to save the LinkedIn profile you're viewing.
// Auth is the app's normal session cookie, so row-level security still scopes everything to you.

const SLUG = /^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\/in\/([^/?#]+)/i;

function slugOf(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = SLUG.exec(url.trim());
  return match ? decodeURIComponent(match[2]).toLowerCase() : null;
}

// Only extension pages carry a chrome-extension:// Origin; web pages can't forge it.
function extensionOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin?.startsWith("chrome-extension://") ? origin : null;
}

function reply(request: Request, body: unknown, status = 200) {
  const origin = extensionOrigin(request);
  return Response.json(body, {
    status,
    headers: origin
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" }
      : undefined,
  });
}

export async function OPTIONS(request: Request) {
  const origin = extensionOrigin(request);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });
}

// Is this profile already saved? ?url=<linkedin profile url>
export async function GET(request: Request) {
  const slug = slugOf(new URL(request.url).searchParams.get("url"));
  if (!slug) return reply(request, { error: "Not a LinkedIn profile URL" }, 400);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return reply(request, { error: "unauthorized" }, 401);

  // Remember the first time the extension talks to the app (this feeds the Getting started checklist).
  await supabase
    .from("profiles")
    .update({ extension_used_at: new Date().toISOString() })
    .eq("id", claims.claims.sub)
    .is("extension_used_at", null);

  const escaped = slug.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await supabase
    .from("contacts")
    .select("id, full_name")
    .ilike("linkedin_url", `%/in/${escaped}%`)
    .limit(1);

  // Outreach message settings, so the extension can draft a message in the same round trip.
  const { data: profile } = await supabase.from("profiles").select("display_name, message_template").maybeSingle();
  const name = profile?.display_name ?? "";
  const settings = {
    template: profile?.message_template || DEFAULT_TEMPLATE,
    my_name: name.includes("@") ? "" : name, // sign-up falls back to the email address when Google gives no name
  };

  // For a saved contact, whether (and when) the outreach request was already logged.
  let existing: { id: string; full_name: string; request_logged: string | null } | null = null;
  if (data?.[0]) {
    const { data: logged } = await supabase
      .from("activities")
      .select("occurred_on")
      .eq("contact_id", data[0].id)
      .eq("kind", "info_interview_request")
      .limit(1);
    existing = { ...data[0], request_logged: logged?.[0]?.occurred_on ?? null };
  }
  return reply(request, { existing, settings });
}

function revalidateAfterLog(contactId: string) {
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  revalidatePath("/");
}

const clean = (v: unknown, max = 300): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(request: Request) {
  if (!extensionOrigin(request)) return reply(request, { error: "forbidden" }, 403);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return reply(request, { error: "unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const slug = slugOf(body?.linkedin_url);
  if (!body || !slug) return reply(request, { error: "Not a LinkedIn profile URL" }, 400);

  const { data: dupe } = await supabase
    .from("contacts")
    .select("id, full_name")
    .ilike("linkedin_url", `%/in/${slug.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .limit(1);
  const logRequest = body.log_request === true;
  if (dupe?.length) {
    // Already saved: "Log request sent" still applies to the existing contact.
    if (logRequest) {
      await recordMilestone(supabase, dupe[0].id, "info_interview_request");
      revalidateAfterLog(dupe[0].id);
      return reply(request, { existing: dupe[0], requestLogged: true });
    }
    return reply(request, { existing: dupe[0] }, 409);
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      full_name: clean(body.full_name) ?? "Unnamed contact",
      company: clean(body.company),
      title: clean(body.title),
      linkedin_url: `https://www.linkedin.com/in/${slug}/`,
      how_met: clean(body.how_met),
    })
    .select("id")
    .single();
  if (error) return reply(request, { error: error.message }, 500);

  // Optional extras saved alongside the contact.
  const note = clean(body.note, 10000);
  if (note) await supabase.from("contact_notes").insert({ contact_id: contact.id, body: note });
  const actionTitle = clean(body.action_title);
  if (actionTitle) {
    const due = typeof body.action_due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.action_due) ? body.action_due : null;
    await supabase.from("action_items").insert({ contact_id: contact.id, title: actionTitle, due_date: due });
  }

  if (logRequest) {
    await recordMilestone(supabase, contact.id, "info_interview_request");
    revalidateAfterLog(contact.id);
  }
  return reply(request, { id: contact.id, requestLogged: logRequest }, 201);
}
