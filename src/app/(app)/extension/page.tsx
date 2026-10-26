import Link from "next/link";
import manifest from "../../../../extension/manifest.json";
import { PageTip } from "@/components/tour";

export const metadata = { title: "Install the Chrome extension – MBA Recruiting Tool" };

const steps: { title: string; body: React.ReactNode }[] = [
  {
    title: "Download and unzip",
    body: (
      <>
        <p>
          <a
            href="/mba-recruiting-tool-extension.zip"
            download
            className="inline-block rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
          >
            Download the extension (v{manifest.version})
          </a>
        </p>
        <p className="opacity-70">
          Double-click the zip to unzip it. Move the <code>mba-recruiting-tool-extension</code> folder somewhere you
          won&apos;t delete it, such as Documents. Chrome runs the extension from that folder.
        </p>
      </>
    ),
  },
  {
    title: "Open Chrome's extensions page",
    body: (
      <p>
        Paste <code className="rounded bg-black/5 px-1 dark:bg-white/10">chrome://extensions</code> into a new tab&apos;s
        address bar. (Web pages can&apos;t link there, so it has to be typed or pasted.) Edge and Brave work too, using{" "}
        <code>edge://extensions</code> or <code>brave://extensions</code>.
      </p>
    ),
  },
  {
    title: "Turn on Developer mode",
    body: <p>Use the toggle in the top-right corner of that page.</p>,
  },
  {
    title: "Load the folder",
    body: (
      <p>
        Click <strong>Load unpacked</strong> and choose the unzipped <code>mba-recruiting-tool-extension</code> folder, the
        one that contains <code>manifest.json</code>. &quot;MBA Recruiting Tool – Save LinkedIn Contact&quot; should appear in
        your list.
      </p>
    ),
  },
  {
    title: "Pin it",
    body: <p>Click the puzzle-piece icon in Chrome&apos;s toolbar and pin the extension so its button is always visible.</p>,
  },
];

export default function ExtensionPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Chrome extension</h1>
        <p className="mt-1 text-sm opacity-70">
          Save someone from LinkedIn to your contacts in one click, with their title and company filled in.
        </p>
      </div>

      <PageTip id="extension">
        <strong>Tip:</strong> after installing, open any LinkedIn profile and click the extension. You can write your
        outreach message in Settings.
      </PageTip>

      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Install</h2>
        <ol className="flex flex-col gap-4 text-sm">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white dark:bg-white dark:text-black">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">{step.title}</h3>
                {step.body}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="message" className="flex scroll-mt-6 flex-col gap-2 text-sm">
        <h2 className="text-lg font-semibold">Outreach message</h2>
        <p className="opacity-70">
          When you open someone&apos;s LinkedIn profile, the extension drafts a message with their first name and
          company filled in, ready to copy and paste.{" "}
          <Link href="/settings#message" className="text-blue-600 underline">
            Edit your message in Settings
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-lg font-semibold">Use it</h2>
        <ol className="list-decimal pl-5">
          <li>Stay signed in to this app in the same Chrome profile.</li>
          <li>
            Open someone&apos;s LinkedIn profile (<code>linkedin.com/in/…</code>) and click the extension&apos;s button.
          </li>
          <li>Check the name, title, and company it filled in. Fix anything that looks off, since LinkedIn&apos;s layout changes.</li>
          <li>Optionally add how you met, a first note, and an action item, then click <strong>Save contact</strong>.</li>
          <li>Scroll to the message at the bottom of the popup, tweak it if you like, and click <strong>Copy message</strong>. Then paste it into LinkedIn.</li>
        </ol>
        <p className="opacity-70">
          If the popup says to sign in, open this app in another tab, sign in, and click the extension again. If you already
          saved that person, it tells you and links to their contact.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-lg font-semibold">Good to know</h2>
        <ul className="list-disc pl-5">
          <li>
            It reads only the LinkedIn profile you&apos;re viewing, and only when you click its button. It doesn&apos;t scrape
            in the background or in bulk, and it sends nothing anywhere except to your own contacts here.
          </li>
          <li>
            <strong>Updating:</strong> when a new version is posted, download it again, replace the old folder, then click
            the reload icon on the extension at <code>chrome://extensions</code>.
          </li>
          <li>Use LinkedIn the way its terms allow. Save people you actually plan to reach out to.</li>
        </ul>
      </section>
    </div>
  );
}
