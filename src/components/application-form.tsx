import { APPLICATION_STATUSES } from "@/lib/constants";
import { button, input, label } from "./ui";

type Application = {
  company?: string;
  role?: string;
  job_url?: string | null;
  status?: string;
  applied_on?: string | null;
  deadline?: string | null;
  referrer_contact_id?: string | null;
  notes?: string | null;
};

export function ApplicationForm({
  action,
  contacts,
  application = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  contacts: { id: string; full_name: string }[];
  application?: Application;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={label}>
        Company
        <input name="company" required defaultValue={application.company} className={input} />
      </label>
      <label className={label}>
        Role
        <input name="role" required defaultValue={application.role} className={input} />
      </label>
      <label className={label}>
        Status
        <select name="status" defaultValue={application.status ?? "wishlist"} className={input}>
          {APPLICATION_STATUSES.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Job posting URL
        <input name="job_url" type="url" defaultValue={application.job_url ?? ""} className={input} />
      </label>
      <label className={label}>
        Date applied
        <input name="applied_on" type="date" defaultValue={application.applied_on ?? ""} className={input} />
      </label>
      <label className={label}>
        Deadline
        <input name="deadline" type="date" defaultValue={application.deadline ?? ""} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Referred by
        <select name="referrer_contact_id" defaultValue={application.referrer_contact_id ?? ""} className={input}>
          <option value="">No referral</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Notes
        <textarea name="notes" rows={3} defaultValue={application.notes ?? ""} className={input} />
      </label>
      <div className="sm:col-span-2">
        <button className={button}>{submitLabel}</button>
      </div>
    </form>
  );
}
