import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy – MBA Recruiting Tool" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        MBA Recruiting Tool is a free tool for MBA students to organize their job search: contacts, notes, action
        items, applications, and progress goals. This page explains what it stores and how it is handled.
      </p>

      <h2 className="mt-2 text-lg font-semibold">What we collect</h2>
      <ul className="list-disc pl-5">
        <li>Your name and email address, from your Google account when you sign in.</li>
        <li>
          Everything you enter: contacts (names, companies, LinkedIn links, emails, phone numbers, birthdays), notes,
          action items, applications, and activity logs.
        </li>
      </ul>
      <p>We do not access your Gmail, Google Drive, calendar, or any other Google data. Sign-in uses only your basic profile and email.</p>

      <h2 className="mt-2 text-lg font-semibold">Who can see it</h2>
      <p>
        Your data is private to your account. Other users of the app cannot see it. The app&apos;s administrator can
        technically access the underlying database, and will not read, share, or use your data except to keep the
        service running or to help you with a request.
      </p>

      <h2 className="mt-2 text-lg font-semibold">How it is stored</h2>
      <p>
        Data is stored with Supabase (database and sign-in) and the app is hosted on Vercel. We do not sell your data,
        show ads, or share it with anyone else.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Information about other people</h2>
      <p>
        When you save a contact, you are storing information about someone else. Please only save details you have a
        reasonable basis to keep, and treat them respectfully.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Deleting your data</h2>
      <p>You can delete any contact, note, action item, or application inside the app. To delete your whole account and all its data, ask below.</p>
      <ContactLine />
    </LegalPage>
  );
}
