import { STAGES } from "@/lib/constants";
import { button, input, label } from "./ui";

type Contact = {
  full_name?: string;
  company?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  phone?: string | null;
  how_met?: string | null;
  birthday?: string | null;
  stage?: string;
  tags?: string[];
};

export function ContactForm({
  action,
  contact = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  contact?: Contact;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={label}>
        Name
        <input name="full_name" required defaultValue={contact.full_name} className={input} />
      </label>
      <label className={label}>
        Stage
        <select name="stage" defaultValue={contact.stage ?? "identified"} className={input}>
          {STAGES.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Company
        <input name="company" defaultValue={contact.company ?? ""} className={input} />
      </label>
      <label className={label}>
        Title
        <input name="title" defaultValue={contact.title ?? ""} className={input} />
      </label>
      <label className={label}>
        LinkedIn URL
        <input name="linkedin_url" type="url" defaultValue={contact.linkedin_url ?? ""} className={input} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" defaultValue={contact.email ?? ""} className={input} />
      </label>
      <label className={label}>
        Phone
        <input name="phone" defaultValue={contact.phone ?? ""} className={input} />
      </label>
      <label className={label}>
        Birthday
        <input name="birthday" type="date" defaultValue={contact.birthday ?? ""} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        How you met
        <input name="how_met" defaultValue={contact.how_met ?? ""} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Tags (comma-separated)
        <input name="tags" defaultValue={(contact.tags ?? []).join(", ")} className={input} />
      </label>
      <div className="sm:col-span-2">
        <button className={button}>{submitLabel}</button>
      </div>
    </form>
  );
}
