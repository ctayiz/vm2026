import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "WM 2026 Tippspiel",
  description: "Privates Tippspiel zur FIFA WM 2026 für Freunde & Familie.",
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
