import Link from "next/link";
import { signOut } from "@/lib/actions";

const links = [
  ["/", "Dashboard"],
  ["/contacts", "Contacts"],
  ["/applications", "Applications"],
  ["/actions", "Action items"],
  ["/history", "History"],
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center gap-6 border-b border-black/10 px-6 py-3 dark:border-white/15">
        <span className="font-semibold">MBA Recruiting Tool</span>
        <nav className="flex flex-1 gap-4 text-sm">
          {links.map(([href, name]) => (
            <Link key={href} href={href} className="opacity-70 hover:opacity-100">
              {name}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <button className="text-sm opacity-70 hover:opacity-100">Sign out</button>
        </form>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 p-6">{children}</div>
    </>
  );
}
