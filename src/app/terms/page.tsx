import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of Service – MBA Recruiting Tool" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        MBA Recruiting Tool is a free tool provided as-is by a fellow student. By using it you agree to the following.
      </p>
      <ul className="list-disc pl-5">
        <li>Use it only for your own job search and keep your account secure.</li>
        <li>Only store information you are entitled to keep, and follow the rules of any site you copy it from (including LinkedIn&apos;s).</li>
        <li>The service comes with no warranty. It may change, have bugs, or be shut down, so keep your own copies of anything important.</li>
        <li>We may remove access for misuse.</li>
      </ul>
      <p>See the <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> for how your data is handled.</p>
      <ContactLine />
    </LegalPage>
  );
}
