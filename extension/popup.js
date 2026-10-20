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
function readProfile() {
  const text = (el) => (el?.innerText || "").trim();
  const h1 = document.querySelector("main h1") || document.querySelector("h1");
  let name = text(h1) || document.title.replace(/^\(\d+\)\s*/, "").split("|")[0].trim();

  let headline = "";
  for (let el = h1, depth = 0; el && depth < 5 && !headline; el = el.parentElement, depth++) {
    const candidate = el.querySelector('[class*="text-body-medium"]');
    if (candidate && text(candidate) !== name) headline = text(candidate);
  }
  if (!headline) {
    const og = document.querySelector('meta[property="og:description"]');
    headline = (og?.content || "").split(" · ")[0].trim();
  }
  return { name, headline, url: location.href };
}

// "Replenishment Manager at Walmart" -> { title, company }
function splitHeadline(headline) {
  const match = /^(.*?)\s+(?:at|@)\s+(.+?)(?:\s*[|·].*)?$/i.exec(headline);
  return match ? { title: match[1], company: match[2] } : { title: headline, company: "" };
}

async function api(path, options = {}) {
  const response = await fetch(APP_URL + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
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

  let check;
  try {
    check = await api(`/api/capture?url=${encodeURIComponent(profileUrl)}`);
  } catch {
    say("Couldn't reach the app. Check your connection.", true);
    return;
  }
  if (check.status === 401) return needSignIn();
  if (check.body.existing) {
    say(`Already saved: ${check.body.existing.full_name}`);
    showLink("Open contact", `${APP_URL}/contacts/${check.body.existing.id}`);
    return;
  }

  const { title, company } = splitHeadline(profile.headline);
  $("full_name").value = profile.name;
  $("title").value = title;
  $("company").value = company;
  form.hidden = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    $("save").disabled = true;
    say("Saving…");
    const result = await api("/api/capture", {
      method: "POST",
      body: JSON.stringify({
        linkedin_url: profileUrl,
        full_name: $("full_name").value,
        title: $("title").value,
        company: $("company").value,
        how_met: $("how_met").value,
        note: $("note").value,
        action_title: $("action_title").value,
        action_due: $("action_due").value,
      }),
    });

    if (result.status === 401) return needSignIn();
    if (result.status === 201 || result.status === 409) {
      const id = result.body.id ?? result.body.existing?.id;
      form.hidden = true;
      say(result.status === 201 ? "Saved ✓" : "Already saved.");
      showLink("Open contact", `${APP_URL}/contacts/${id}`);
      return;
    }
    $("save").disabled = false;
    say(result.body.error || "Something went wrong.", true);
  });
}

main().catch((error) => say(`Error: ${error.message}`, true));
