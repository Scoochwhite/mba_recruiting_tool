import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
