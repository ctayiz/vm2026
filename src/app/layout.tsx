import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n-server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const OG_TITLE = "WM 2026 Tippspiel ⚽";
const OG_DESC =
  "Tritt im WM 2026 Tippspiel gegen Freunde & Familie an – tippe alle Spiele, sammle Punkte und kämpfe um Platz 1. 🏆";

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: "WM 2026 Tippspiel",
  description: OG_DESC,
  applicationName: "WM 2026 Tippspiel",
  // sorgt für eine schöne WhatsApp-/Link-Vorschau (statt „undefined")
  openGraph: {
    type: "website",
    siteName: "WM 2026 Tippspiel",
    title: OG_TITLE,
    description: OG_DESC,
  },
  twitter: {
    card: "summary",
    title: OG_TITLE,
    description: OG_DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} className="dark">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
