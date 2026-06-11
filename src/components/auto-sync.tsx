"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Stößt beim Öffnen der App einen Hintergrund-Sync an und – wenn gerade ein
 * Spiel LÄUFT – pollt es alle 60 Sek weiter (Live-Modus). So aktualisiert sich
 * der Spielstand in der geöffneten App während des Spiels nahezu live.
 * Die eigentliche Drosselung passiert serverseitig (/api/sync/auto).
 */
export function AutoSync() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/sync/auto", { method: "POST" });
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        // Im Live-Fenster IMMER aktualisieren: der Spielstand kann auch durch den
        // Cron oder das Tab eines anderen Nutzers in die DB gekommen sein – nicht
        // nur durch den Sync dieses Tabs. Sonst nur, wenn dieser Tab etwas synct hat.
        if (data?.live || data?.did?.length) router.refresh();
        // Im Live-Fenster alle 60 Sek erneut, sonst nicht weiter pollen.
        if (data?.live) timer.current = setTimeout(tick, 60_000);
      } catch {
        /* ignorieren */
      }
    };

    // Erststart kurz verzögert, damit die Seite nicht beim Laden blockiert wird.
    timer.current = setTimeout(tick, 800);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return null;
}
