import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist, Manrope } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--f-geist" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-manrope" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--f-dmsans" });

export const metadata: Metadata = {
  title: { default: "Domma Invoice", template: "%s · Domma Invoice" },
  description: "Invoice management & approval Domma",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1d2939" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geist.variable} ${manrope.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
