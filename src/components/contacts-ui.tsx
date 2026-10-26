import Link from "next/link";
import { STAGES } from "@/lib/constants";
import { buttonQuiet, input, inputAuto } from "./ui";

// The Contacts page's search and filter bar. On phones it wraps onto three rows (search; stage and sort;
// star and Filter). From tablet width up it is one row.
export function ContactFilterBar({
  q,
  stage,
  referrers,
  sort,
}: {
  q: string;
  stage: string;
  referrers: boolean;
  sort: string;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search name, company, title…"
        className={`${input} basis-full sm:min-w-0 sm:flex-1 sm:basis-0`}
      />
      <select name="stage" defaultValue={stage} className={`${inputAuto} min-w-[9rem] flex-1 sm:min-w-0 sm:flex-none`}>
        <option value="">All stages</option>
        {STAGES.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <select
        name="sort"
        defaultValue={sort === "added" || sort === "edited" ? sort : "alpha"}
        aria-label="Sort by"
        title="Sort by"
        className={`${inputAuto} min-w-[9rem] flex-1 sm:min-w-0 sm:flex-none`}
      >
        <option value="alpha">A–Z</option>
        <option value="added">Newest</option>
        <option value="edited">Recently edited</option>
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 text-lg" title="Only show contacts willing to refer you">
        <input
          type="checkbox"
          name="referrers"
          value="1"
          defaultChecked={referrers}
          aria-label="Only show contacts willing to refer you"
        />
        <span aria-hidden className="text-navy dark:text-white">
          ★
        </span>
      </label>
      <button className={`${buttonQuiet} flex-1 sm:flex-none`}>Filter</button>
    </form>
  );
}

// One row of the Contacts list. Tags and stage drop below the name when there isn't room beside it.
export function ContactRow({
  contact,
}: {
  contact: {
    id: string;
    full_name: string;
    title: string | null;
    company: string | null;
    stage: string;
    tags: string[];
    willing_to_refer: boolean;
  };
}) {
  const stageName = Object.fromEntries(STAGES)[contact.stage];
  return (
    <li>
      <Link
        href={`/contacts/${contact.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 hover:opacity-80"
      >
        <div className="min-w-0 flex-1 basis-48">
          <div className="break-words font-medium">
            {contact.full_name}
            {contact.willing_to_refer && (
              <span className="ml-1.5 text-navy dark:text-white" title="Willing to refer you" aria-label="Willing to refer you">
                ★
              </span>
            )}
          </div>
          <div className="break-words text-sm opacity-70">
            {[contact.title, contact.company].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contact.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {tag}
            </span>
          ))}
          <span className="text-xs opacity-70">{stageName}</span>
        </div>
      </Link>
    </li>
  );
}
