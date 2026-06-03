"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Stößt beim Öffnen der App (1× pro Browser-Session) einen Hintergrund-Sync an.
 * Ersetzt den Cron auf dem Vercel-Hobby-Plan – die eigentliche Drosselung
 * passiert serverseitig (/api/sync/auto). Blockiert die UI nicht.
 */
export function AutoSync() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("wm_autosync")) return;
    sessionStorage.setItem("wm_autosync", "1");

    fetch("/api/sync/auto", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.did?.length) router.refresh(); // nur aktualisieren, wenn etwas synct wurde
      })
      .catch(() => {});
  }, [router]);

  return null;
}
