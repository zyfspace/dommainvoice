import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--f-geist" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-manrope" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--f-dmsans" });

export const metadata: Metadata = {
  title: { default: "Domma Invoice", template: "%s · Domma Invoice" },
  description: "Invoice management & approval Domma",
  robots: { index: false, follow: false },
};

// iOS Safari men-zoom otomatis input < 16px. maximumScale hanya dikirim ke iOS (pinch-zoom tetap jalan
// di sana); browser lain tidak diberi batas agar zoom manual tetap bisa.
export async function generateViewport(): Promise<Viewport> {
  const ua = (await headers()).get("user-agent") ?? "";
  const ios = /iPhone|iPad|iPod/.test(ua);
  return { themeColor: "#1d2939", width: "device-width", initialScale: 1, viewportFit: "cover", ...(ios && { maximumScale: 1 }) };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geist.variable} ${manrope.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
