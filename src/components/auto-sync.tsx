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
        if (data?.did?.length) router.refresh(); // nur aktualisieren, wenn etwas synct wurde
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
