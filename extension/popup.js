const $ = (id) => document.getElementById(id);
const message = $("message");
const form = $("form");
const link = $("link");

function say(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "error" : "";
  message.hidden = !text;
}

function showLink(text, href) {
  link.textContent = text;
  link.href = href;
  link.hidden = false;
}

// Runs inside the LinkedIn tab. Best-effort: LinkedIn changes its markup, so every field is editable in the popup.
async function readProfile() {
  // Every element on the page, including ones inside open shadow roots.
  const deepAll = () => {
    const out = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        out.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    return out;
  };
  // Parent that also steps out of a shadow root to its host.
  const up = (el) => el.parentElement || el.getRootNode()?.host || null;

  // Visible text under `el`, one entry per text node, with consecutive duplicates (screen-reader copies) removed.
  const linesOf = (el) => {
    const lines = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        const parent = node.parentElement;
        const visible = !parent || typeof parent.checkVisibility !== "function" || parent.checkVisibility();
        if (t && visible && t !== lines[lines.length - 1]) lines.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (/^(script|style|noscript|svg)$/i.test(node.nodeName)) return;
      if (node.shadowRoot) walk(node.shadowRoot);
      node.childNodes.forEach(walk);
    };
    walk(el);
    return lines;
  };

  const all = deepAll();
  // Re-scan each time: content that loads while we scroll must be visible to later searches.
  const leafWithText = (t) => deepAll().filter((el) => el.children.length === 0 && (el.textContent || "").trim() === t);

  const h1 = all.find((el) => el.tagName === "H1");
  const name = (h1?.textContent || "").trim() || document.title.replace(/^\(\d+\)\s*/, "").split("|")[0].trim();
  // The name isn't always an <h1>, so fall back to the first element that is exactly the name.
  const anchor = h1 || leafWithText(name)[0] || null;

  const debug = {
    h1: !!h1,
    anchor: !!anchor,
    shadowRoots: all.filter((el) => el.shadowRoot).length,
    experienceHeadings: leafWithText("Experience").length,
  };

  // Most recent job from the Experience section (listed first). Returns { title, company } or null.
  // LinkedIn uses scrambled class names and no reliable <section>, so find the "Experience" heading by its text,
  // then climb until the surrounding block also contains the job entries.
  const findExperience = () => {
    for (const heading of leafWithText("Experience")) {
      for (let el = heading, depth = 0; el && depth < 10; el = up(el), depth++) {
        const lines = linesOf(el);
        if (lines[0] !== "Experience" || lines.length < 4) continue;
        const entry = lines.slice(1);
        // Job entries have dates; this rejects look-alike "Experience" labels elsewhere on the page.
        if (!entry.slice(0, 6).some((l) => /\b(19|20)\d{2}\b|present/i.test(l))) continue;
        // Several roles at one company: "Company", "Full-time · 6 yrs" (a duration, no date range), then "Title", ...
        const hasDuration = /\d+\s*(yrs?|mos?|years?|months?)\b/i.test(entry[1]);
        const hasDateRange = /\b(19|20)\d{2}\b|present/i.test(entry[1]);
        if (hasDuration && !hasDateRange && entry[2]) return { company: entry[0], title: entry[2] };
        // Single role: "Title", "Company · Full-time", "Jan 2025 - Present", ...
        return { title: entry[0], company: entry[1].split(" · ")[0] };
      }
    }
    return null;
  };

  // The Experience section loads lazily, so scroll down to trigger it, then restore the scroll positions.
  // The page may scroll inside a container rather than the window, so scroll every large scrollable area.
  let experience = findExperience();
  if (!experience) {
    const scrollers = [document.scrollingElement, ...all.filter(
      (el) => el.scrollHeight > el.clientHeight + 200 && /(auto|scroll)/.test(getComputedStyle(el).overflowY),
    )].filter(Boolean);
    const saved = scrollers.map((el) => el.scrollTop);
    for (const fraction of [0.4, 0.7, 1]) {
      scrollers.forEach((el) => { el.scrollTop = el.scrollHeight * fraction; });
      await new Promise((resolve) => setTimeout(resolve, 500));
      experience = findExperience();
      if (experience) break;
    }
    scrollers.forEach((el, i) => { el.scrollTop = saved[i]; });
    debug.scrollers = scrollers.length;
    debug.experienceHeadings = leafWithText("Experience").length;
  }

  // Fallback: the headline under the name, read as text lines from the block around the name.
  const badge = /\s*[·•]\s*(1st|2nd|3rd\+?)\b/gi;
  const clean = (line) => line.split(name).join("").replace(badge, "").replace(/^[\s·•|]+|[\s·•|]+$/g, "");
  const skip = /^(1st|2nd|3rd\+?|\(?(he|she|they)\/[a-z]+\)?|contact info)$/i;
  let headline = "";
  for (let el = anchor, depth = 0; el && depth < 12 && !headline; el = up(el), depth++) {
    headline = linesOf(el).map(clean).find((l) => l && !skip.test(l)) || "";
  }
  if (!headline) {
    const og = document.querySelector('meta[property="og:description"]');
    headline = (og?.content || "").split(" · ")[0].trim();
  }
  return { name, headline, experience, debug, url: location.href };
}

// "Replenishment Manager at Walmart" -> { title, company }
function splitHeadline(headline) {
  const match = /^(.*?)\s+(?:at|@)\s+(.+?)(?:\s*[|·].*)?$/i.exec(headline);
  return match ? { title: match[1], company: match[2] } : { title: headline, company: "" };
}

// Outreach message helpers. Keep in sync with src/lib/message.ts in the web app.
const DEFAULT_TEMPLATE = `Hi {first_name},

I'm an MBA student at BYU and I'm really interested in the work you do at {company}. Would you be open to a quick 15-20 minute call so I can learn about your path and get your advice? I'd really appreciate it.

Thank you,
{my_name}`;

function firstNameOf(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && /^(dr|mr|mrs|ms|miss|prof|professor)\.?$/i.test(parts[0])) parts.shift();
  return parts[0] ?? "";
}

// Missing values stay visible as [brackets] so you notice before sending.
function renderMessage(template, { firstName, company, myName }) {
  return template
    .replace(/\{first_?name\}/gi, firstName || "[first name]")
    // "Acme Inc." followed by the template's own period would otherwise print two periods.
    .replace(/\{company\}(\.?)/gi, (_, dot) => (company || "[company]") + (company.endsWith(".") ? "" : dot))
    .replace(/\{(?:my|your)_?name\}/gi, myName || "[your name]");
}

// Shows a ready-to-copy message that follows the Name and Company fields until you edit it by hand.
function setupMessage(settings) {
  const box = $("message-text");
  let edited = false;
  const refresh = () => {
    if (!edited) {
      box.value = renderMessage(settings.template, {
        firstName: firstNameOf($("full_name").value),
        company: $("company").value.trim(),
        myName: settings.my_name,
      });
    }
    $("count").textContent = `${box.value.length} characters`;
  };
  box.addEventListener("input", () => {
    edited = true;
    refresh();
  });
  $("full_name").addEventListener("input", refresh);
  $("company").addEventListener("input", refresh);

  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(box.value);
    } catch {
      box.select();
      document.execCommand("copy");
    }
    $("copy").textContent = "Copied ✓";
    setTimeout(() => ($("copy").textContent = "Copy message"), 1500);
  });

  $("edit-template").href = APP_URL + "/settings#message";
  $("name-hint").hidden = !!settings.my_name;
  $("message-section").hidden = false;
  refresh();
}

async function api(path, options = {}) {
  const response = await fetch(APP_URL + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  // A redirect to /login means "signed out"; anything that isn't JSON means the app doesn't have this endpoint yet.
  if (response.redirected && new URL(response.url).pathname.startsWith("/login")) return { status: 401, body: {} };
  const body = await response.json().catch(() => null);
  if (body === null) return { status: 0, body: { error: "The app didn't respond as expected. Is the latest version deployed?" } };
  return { status: response.status, body };
}

const shortDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// "Log request sent": records the outreach, and saves the contact first if they're new.
function setupLogRequest({ existing, payload, onSaved }) {
  const button = $("log-request");
  const markLogged = (on) => {
    button.hidden = false;
    button.disabled = true;
    button.textContent = on ? `✓ Request logged ${shortDate(on)}` : "✓ Request logged";
    $("log-hint").hidden = true;
  };
  if (existing?.request_logged) return markLogged(existing.request_logged);

  button.hidden = false;
  $("log-hint").hidden = !!existing; // the "saves them first" note only matters for new contacts
  button.addEventListener("click", async () => {
    if (!existing && !$("full_name").value.trim()) {
      say("Add their name first.", true);
      return;
    }
    button.disabled = true;
    const result = await api("/api/capture", {
      method: "POST",
      body: JSON.stringify({ ...payload(), log_request: true }),
    });
    if (result.status === 401) return needSignIn();
    if (result.status === 200 || result.status === 201) {
      markLogged(new Date().toLocaleDateString("en-CA")); // today, in your local time
      onSaved(result.body.id ?? result.body.existing?.id, result.status === 201);
      return;
    }
    button.disabled = false;
    say(result.body.error || "Something went wrong.", true);
  });
}

function needSignIn() {
  form.hidden = true;
  say("Sign in to MBA Recruiting Tool first, then reopen this popup.", true);
  showLink("Open sign-in page", APP_URL + "/login");
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https:\/\/([a-z0-9-]+\.)?linkedin\.com\/in\//i.test(tab.url)) {
    say("Open a LinkedIn profile (linkedin.com/in/…) and click the icon again.");
    return;
  }

  const [{ result: profile }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readProfile });
  const profileUrl = profile.url.split(/[?#]/)[0];

  // Prefer the most recent job from Experience; fall back to parsing the headline.
  const { title, company } = profile.experience ?? splitHeadline(profile.headline);
  $("full_name").value = profile.name;
  $("title").value = title;
  $("company").value = company;

  // Everything the form would save for this contact.
  const payload = () => ({
    linkedin_url: profileUrl,
    full_name: $("full_name").value,
    title: $("title").value,
    company: $("company").value,
    how_met: $("how_met").value,
    note: $("note").value,
    action_title: $("action_title").value,
    action_due: $("action_due").value,
  });

  let check;
  try {
    check = await api(`/api/capture?url=${encodeURIComponent(profileUrl)}`);
  } catch {
    say("Couldn't reach the app. Check your connection.", true);
    return;
  }
  if (check.status === 401) return needSignIn();
  if (check.status !== 200) {
    say(check.body.error || `Unexpected response (${check.status}).`, true);
    return;
  }
  setupMessage(check.body.settings ?? { template: DEFAULT_TEMPLATE, my_name: "" });
  setupLogRequest({
    existing: check.body.existing,
    payload,
    // Logging a request for a new contact also saves them, so the form is done.
    onSaved: (id, created) => {
      if (created) form.hidden = true;
      say(created ? "Saved ✓ Request logged ✓" : "Request logged ✓");
      showLink("Open contact", `${APP_URL}/contacts/${id}`);
    },
  });
  if (check.body.existing) {
    say(`Already saved: ${check.body.existing.full_name}`);
    showLink("Open contact", `${APP_URL}/contacts/${check.body.existing.id}`);
    return;
  }

  if (!title && !company) {
    say("Couldn't read their job from the page. Fill in title and company if you want them.");
    $("debug").textContent = "Debug: " + JSON.stringify(profile.debug);
    $("debug").hidden = false;
  }
  form.hidden = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    $("save").disabled = true;
    say("Saving…");
    const result = await api("/api/capture", { method: "POST", body: JSON.stringify(payload()) });

    if (result.status === 401) return needSignIn();
    if (result.status === 201 || result.status === 409) {
      const id = result.body.id ?? result.body.existing?.id;
      form.hidden = true;
      $("log-hint").hidden = true;
      say(result.status === 201 ? "Saved ✓" : "Already saved.");
      showLink("Open contact", `${APP_URL}/contacts/${id}`);
      return;
    }
    $("save").disabled = false;
    say(result.body.error || "Something went wrong.", true);
  });
}

main().catch((error) => say(`Error: ${error.message}`, true));
