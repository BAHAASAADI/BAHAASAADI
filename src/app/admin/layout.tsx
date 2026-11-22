import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "../globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk", weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "iZone Dashboard", template: "%s · iZone Dashboard" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
