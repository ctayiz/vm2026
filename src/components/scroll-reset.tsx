"use client";

import { useEffect } from "react";

/**
 * Setzt die Scroll-Position beim vollständigen Laden auf 0.
 * iOS-Safari behält nach dem Login-Redirect (Tastatur war offen) manchmal einen
 * verschobenen Scroll-Zustand -> der Inhalt rutscht unter den fixierten Header
 * ("Hallo" hinter der Leiste), bis man aktualisiert. Das verhindert das.
 * Läuft nur bei echten Seitenladungen, nicht bei client-seitiger Navigation.
 */
export function ScrollReset() {
  useEffect(() => {
    const reset = () => window.scrollTo(0, 0);
    reset();
    const t1 = window.setTimeout(reset, 60);
    const t2 = window.setTimeout(reset, 250);
    window.addEventListener("pageshow", reset);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("pageshow", reset);
    };
  }, []);
  return null;
}
