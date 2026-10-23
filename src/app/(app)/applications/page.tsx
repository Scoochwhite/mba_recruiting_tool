import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  createApplication,
  deleteApplication,
  logInterview,
  setApplicationStatus,
  updateApplication,
} from "@/lib/actions";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { formatDate, today } from "@/lib/dates";
import { ApplicationForm } from "@/components/application-form";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EditDialog } from "@/components/edit-dialog";
import { buttonQuiet, input } from "@/components/ui";

async function Applications() {
  const supabase = await createClient();
  const [{ data: apps, error }, { data: contacts }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, referrer:contacts(full_name)")
      .order("updated_at", { ascending: false }),
    // People willing to refer you come first in the "Referred by" list.
    supabase
      .from("contacts")
      .select("id, full_name, willing_to_refer")
      .order("willing_to_refer", { ascending: false })
      .order("full_name"),
  ]);
  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load applications: {error.message}</p>;

  const todayStr = today();
  const people = contacts ?? [];
  const byStatus = new Map<string, typeof apps>();
  for (const app of apps) byStatus.set(app.status, [...(byStatus.get(app.status) ?? []), app]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <EditDialog title="New application" buttonLabel="Add application">
          <ApplicationForm action={createApplication} contacts={people} submitLabel="Save application" />
        </EditDialog>
      </div>
      {apps.length === 0 && <p className="text-sm opacity-70">No applications yet.</p>}
      {APPLICATION_STATUSES.map(([status, name]) => {
        const list = byStatus.get(status) ?? [];
        if (!list.length) return null;
        return (
          <section key={status}>
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
              {name} · {list.length}
            </h2>
            <ul className="divide-y divide-black/10 dark:divide-white/15">
              {list.map((app) => {
                const overdue = app.deadline && app.deadline < todayStr && app.status === "wishlist";
                return (
                  <li key={app.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-48 flex-1">
                      <div className="font-medium">
                        {app.job_url && /^https?:\/\//i.test(app.job_url) ? (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {app.company} ↗
                          </a>
                        ) : (
                          app.company
                        )}
                      </div>
                      <div className="text-sm opacity-70">
                        {app.role}
                        {app.referrer && ` · referred by ${app.referrer.full_name}`}
                      </div>
                    </div>
                    <div className="text-xs opacity-70">
                      {app.applied_on && <div>Applied {formatDate(app.applied_on)}</div>}
                      {app.deadline && (
                        <div className={overdue ? "text-red-600" : ""}>Due {formatDate(app.deadline)}</div>
                      )}
                    </div>
                    <form action={setApplicationStatus.bind(null, app.id)}>
                      <AutoSubmitSelect
                        name="status"
                        defaultValue={app.status}
                        options={APPLICATION_STATUSES}
                        className={`${input} w-auto`}
                      />
                    </form>
                    <form action={logInterview.bind(null, app.id)}>
                      <button className={buttonQuiet} title="Counts toward your interview total">
                        Log interview
                      </button>
                    </form>
                    <EditDialog title="Edit application">
                      <ApplicationForm
                        action={updateApplication.bind(null, app.id)}
                        contacts={people}
                        application={app}
                        submitLabel="Save changes"
                      />
                      <form action={deleteApplication.bind(null, app.id)} className="mt-4">
                        <button className="text-sm text-red-600 hover:underline">Delete application</button>
                      </form>
                    </EditDialog>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
      <Applications />
    </Suspense>
  );
}
