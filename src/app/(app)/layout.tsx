import Link from "next/link";
import { Suspense } from "react";
import { CelebrationHost } from "@/components/celebration";
import { NavMenu } from "@/components/nav-menu";
import { TourLoader } from "@/components/tour-loader";

const mainLinks = [
  ["/", "Dashboard"],
  ["/contacts", "Contacts"],
  ["/applications", "Applications"],
] as const;

const menuLinks = [
  ["/actions", "Action items"],
  ["/history", "History"],
  ["/extension", "Extension"],
  ["/settings", "Settings"],
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Phones: title and Menu on the first row, links on a second row. From sm up: one row. */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-navy px-4 py-3 text-white shadow-sm sm:px-6">
        <Link href="/" className="whitespace-nowrap text-lg font-black tracking-tight hover:opacity-90">
          MBA Recruiting Tool
        </Link>
        <nav data-tour="nav" className="order-last flex w-full gap-4 text-sm sm:order-none sm:w-auto sm:flex-1">
          {mainLinks.map(([href, name]) => (
            <Link key={href} href={href} className="text-white/80 hover:text-white">
              {name}
            </Link>
          ))}
        </nav>
        <div data-tour="menu" className="ml-auto sm:ml-0">
          <NavMenu links={menuLinks} />
        </div>
      </header>
      <div className="mx-auto w-full min-w-0 max-w-4xl flex-1 p-4 sm:p-6">{children}</div>
      <CelebrationHost />
      <Suspense fallback={null}>
        <TourLoader />
      </Suspense>
    </>
  );
}
