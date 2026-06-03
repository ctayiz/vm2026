import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  return (
    <html lang="de" className="dark">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
