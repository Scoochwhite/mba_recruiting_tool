import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeWatcher } from "@/components/theme";

// Brand primary typeface.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "MBA Recruiting Tool",
  description: "Track contacts, applications, and recruiting KPIs",
};

export const viewport: Viewport = {
  themeColor: "#002e5d",
};

// Runs before the page paints, so there is no flash of the wrong theme.
const setTheme = `try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above sets data-theme on <html> before React loads.
    <html lang="en" className={`${lato.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setTheme }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeWatcher />
        {children}
      </body>
    </html>
  );
}
