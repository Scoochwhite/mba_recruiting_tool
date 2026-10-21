import Link from "next/link";
import { NavMenu } from "@/components/nav-menu";

const mainLinks = [
  ["/", "Dashboard"],
  ["/contacts", "Contacts"],
  ["/applications", "Applications"],
] as const;

const menuLinks = [
  ["/actions", "Action items"],
  ["/history", "History"],
  ["/extension", "Extension"],
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center gap-6 border-b border-black/10 px-6 py-3 dark:border-white/15">
        <span className="font-semibold">MBA Recruiting Tool</span>
        <nav className="flex flex-1 gap-4 text-sm">
          {mainLinks.map(([href, name]) => (
            <Link key={href} href={href} className="opacity-70 hover:opacity-100">
              {name}
            </Link>
          ))}
        </nav>
        <NavMenu links={menuLinks} />
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 p-6">{children}</div>
    </>
  );
}
