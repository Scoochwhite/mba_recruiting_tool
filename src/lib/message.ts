// Outreach message template. Placeholders: {first_name}, {company}, {my_name}.
// The Chrome extension (extension/popup.js) has its own copy of these helpers; keep them in sync.

export const DEFAULT_TEMPLATE = `Hi {first_name},

I'm an MBA student at BYU and I'm really interested in the work you do at {company}. Would you be open to a quick 15-20 minute call so I can learn about your path and get your advice? I'd really appreciate it.

Thank you,
{my_name}`;

export const PLACEHOLDERS = [
  ["{first_name}", "Their first name"],
  ["{company}", "Where they work"],
  ["{my_name}", "Your name"],
] as const;

const HONORIFIC = /^(dr|mr|mrs|ms|miss|prof|professor)\.?$/i;

export function firstNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && HONORIFIC.test(parts[0])) parts.shift();
  return parts[0] ?? "";
}

// Missing values stay visible as [brackets] so you notice before sending.
export function renderMessage(
  template: string,
  { firstName, company, myName }: { firstName: string; company: string; myName: string },
): string {
  return template
    .replace(/\{first_?name\}/gi, firstName || "[first name]")
    // "Acme Inc." followed by the template's own period would otherwise print two periods.
    .replace(/\{company\}(\.?)/gi, (_, dot: string) => (company || "[company]") + (company.endsWith(".") ? "" : dot))
    .replace(/\{(?:my|your)_?name\}/gi, myName || "[your name]");
}
