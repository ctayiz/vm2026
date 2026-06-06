"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Erzeugt clientseitig ein teilbares Ergebnis-Bild (Canvas, keine Abhängigkeit)
 * und teilt es per Web-Share (Handy) bzw. Download + WhatsApp als Fallback.
 */
export function ShareResultButton({
  name,
  rank,
  totalPlayers,
  points,
  accuracyPct,
}: {
  name: string;
  rank: number | null;
  totalPlayers: number;
  points: number;
  accuracyPct: number;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function buildImage(): Promise<Blob | null> {
    const W = 1080;
    const H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Hintergrund
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a1020");
    bg.addColorStop(1, "#0e1628");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // grüner Glow oben
    const glow = ctx.createRadialGradient(W * 0.8, -100, 50, W * 0.8, -100, 700);
    glow.addColorStop(0, "rgba(34,197,94,0.35)");
    glow.addColorStop(1, "rgba(34,197,94,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";

    // Marke
    ctx.fillStyle = "#22c55e";
    ctx.font = "800 46px system-ui, -apple-system, sans-serif";
    ctx.fillText("⚽  WM 2026 TIPPSPIEL", W / 2, 140);

    // Krone/Emoji
    ctx.font = "120px system-ui, -apple-system, sans-serif";
    ctx.fillText(rank === 1 ? "👑" : "⚽", W / 2, 320);

    // Platz
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 150px system-ui, -apple-system, sans-serif";
    ctx.fillText(rank ? `Platz ${rank}` : "—", W / 2, 500);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "500 40px system-ui, -apple-system, sans-serif";
    ctx.fillText(`von ${totalPlayers} Mitspielern`, W / 2, 560);

    // Name
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "700 64px system-ui, -apple-system, sans-serif";
    ctx.fillText(name, W / 2, 670);

    // Punkte-Box (zwei Spalten: Punkte | Quote)
    rounded(ctx, W / 2 - 320, 730, 640, 160, 28);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    // Trennlinie
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 760);
    ctx.lineTo(W / 2, 860);
    ctx.stroke();
    // links: Punkte
    ctx.fillStyle = "#22c55e";
    ctx.font = "800 88px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${points}`, W / 2 - 160, 825);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 32px system-ui, -apple-system, sans-serif";
    ctx.fillText("Punkte", W / 2 - 160, 868);
    // rechts: Quote
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "800 88px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${accuracyPct}%`, W / 2 + 160, 825);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 32px system-ui, -apple-system, sans-serif";
    ctx.fillText("Trefferquote", W / 2 + 160, 868);

    // CTA
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 38px system-ui, -apple-system, sans-serif";
    ctx.fillText(t.shareResult.cta, W / 2, 1000);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function onClick() {
    setBusy(true);
    try {
      const url = typeof window !== "undefined" ? window.location.origin : "";
      const text = `${t.shareResult.text(rank ?? 0)} ${url}`.trim();
      const blob = await buildImage();

      if (blob) {
        const file = new File([blob], "wm2026-tippspiel.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
          try {
            await navigator.share({ files: [file], text });
            return;
          } catch {
            return; // Nutzer hat abgebrochen
          }
        }
        // Fallback: Bild herunterladen + WhatsApp-Text öffnen
        const dl = document.createElement("a");
        dl.href = URL.createObjectURL(blob);
        dl.download = "wm2026-tippspiel.png";
        dl.click();
        URL.revokeObjectURL(dl.href);
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy} className="gap-1.5">
      <Share2 className="size-4" />
      {busy ? t.common.pleaseWait : t.shareResult.button}
    </Button>
  );
}
