import { STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";

type Contact = {
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  how_met: string | null;
  birthday: string | null;
  stage: string;
  tags: string[];
};

const linkClass = "text-blue-600 hover:underline";

export function ContactDetails({ contact }: { contact: Contact }) {
  const stage = STAGES.find(([value]) => value === contact.stage)?.[1];
  const rows: [string, React.ReactNode][] = [
    ["Stage", stage],
    ["Company", contact.company],
    ["Title", contact.title],
    [
      "LinkedIn",
      // Only http(s) URLs become links; anything else stays plain text.
      contact.linkedin_url &&
        (/^https?:\/\//i.test(contact.linkedin_url) ? (
          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {contact.linkedin_url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")} ↗
          </a>
        ) : (
          contact.linkedin_url
        )),
    ],
    ["Email", contact.email && <a href={`mailto:${contact.email}`} className={linkClass}>{contact.email}</a>],
    ["Phone", contact.phone && <a href={`tel:${contact.phone}`} className={linkClass}>{contact.phone}</a>],
    ["Birthday", contact.birthday && formatDate(contact.birthday)],
    ["How you met", contact.how_met],
    [
      "Tags",
      contact.tags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {contact.tags.map((t) => (
            <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {t}
            </span>
          ))}
        </span>
      ),
    ],
  ];

  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
      {rows.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="opacity-70">{name}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value || <span className="opacity-40">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
