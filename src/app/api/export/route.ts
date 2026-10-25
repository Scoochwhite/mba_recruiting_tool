import { strToU8, zipSync } from "fflate";
import { today } from "@/lib/dates";
import { loadSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

// Downloads everything you've entered as a ZIP of CSV files (opens in Excel or Google Sheets).
// Row-level security means this can only ever contain the signed-in user's own data.

type Row = Record<string, unknown>;

// A spreadsheet treats cells starting with = + @ (or "-" glued to text) as formulas, which is a known
// way to smuggle in commands through imported text. Prefix those with an apostrophe. Phone-like values are left alone.
function cell(value: unknown): string {
  let text = value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  const phoneLike = /^\+?[\d\s().-]+$/.test(text);
  if (!phoneLike && (/^[=+@\t\r]/.test(text) || /^-(?!\s)/.test(text))) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns: string[], rows: unknown[][]): string {
  const lines = [columns.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`; // BOM so Excel reads accents and emoji correctly
}

const nameOf = (embed: unknown): string => (embed as { full_name?: string } | null)?.full_name ?? "";

export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return Response.json({ error: "unauthorized" }, { status: 401 });

  // The database returns at most 1000 rows per request, so read in pages.
  async function all(table: string, select: string, order: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .order(order, { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...((data ?? []) as unknown as Row[]));
      if (!data || data.length < 1000) return rows;
    }
  }

  try {
    const [contacts, notes, actions, applications, activities, settings] = await Promise.all([
      all(
        "contacts",
        "id, full_name, company, title, linkedin_url, email, phone, how_met, stage, tags, birthday, willing_to_refer, created_at",
        "full_name",
      ),
      all("contact_notes", "id, created_at, body, contacts(full_name)", "created_at"),
      all("action_items", "id, title, due_date, recurrence, completed_at, created_at, contacts(full_name)", "created_at"),
      all(
        "applications",
        "id, company, role, job_url, status, applied_on, deadline, notes, created_at, referrer:contacts(full_name)",
        "company",
      ),
      all("activities", "id, occurred_on, kind, note, contacts(full_name), applications(company, role)", "occurred_on"),
      loadSettings(supabase),
    ]);

    const csv = {
      "contacts.csv": toCsv(
        ["Name", "Company", "Title", "LinkedIn", "Email", "Phone", "How met", "Stage", "Tags", "Birthday", "Willing to refer", "Added"],
        contacts.map((c) => [c.full_name, c.company, c.title, c.linkedin_url, c.email, c.phone, c.how_met, c.stage, c.tags, c.birthday, c.willing_to_refer ? "yes" : "", c.created_at]),
      ),
      "notes.csv": toCsv(
        ["Contact", "Date", "Note"],
        notes.map((n) => [nameOf(n.contacts), n.created_at, n.body]),
      ),
      "action-items.csv": toCsv(
        ["Contact", "Title", "Due", "Repeats", "Completed", "Created"],
        actions.map((a) => [nameOf(a.contacts), a.title, a.due_date, a.recurrence, a.completed_at, a.created_at]),
      ),
      "applications.csv": toCsv(
        ["Company", "Role", "Status", "Applied", "Deadline", "Job link", "Referred by", "Notes", "Created"],
        applications.map((a) => [a.company, a.role, a.status, a.applied_on, a.deadline, a.job_url, nameOf(a.referrer), a.notes, a.created_at]),
      ),
      "activity-log.csv": toCsv(
        ["Date", "Type", "Contact", "Application", "Note"],
        activities.map((a) => {
          const app = a.applications as { company?: string; role?: string } | null;
          return [a.occurred_on, a.kind, nameOf(a.contacts), app ? `${app.company} - ${app.role}` : "", a.note];
        }),
      ),
    };

    const zip = zipSync(Object.fromEntries(Object.entries(csv).map(([name, text]) => [name, strToU8(text)])));
    const day = today(settings.timezone);
    return new Response(new Blob([zip as BlobPart], { type: "application/zip" }), {
      headers: {
        "Content-Disposition": `attachment; filename="mba-recruiting-tool-export-${day}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
