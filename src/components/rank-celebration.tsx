"use client";

import { useEffect, useRef } from "react";
import { celebrate } from "@/lib/confetti";

/**
 * Feuert beim ersten Anzeigen einmal Konfetti ab, wenn der eingeloggte Nutzer
 * Platz 1 belegt (und mindestens etwas Punkte hat).
 */
export function RankCelebration({ active }: { active: boolean }) {
  const fired = useRef(false);
  useEffect(() => {
    if (active && !fired.current) {
      fired.current = true;
      const t = setTimeout(celebrate, 250);
      return () => clearTimeout(t);
    }
  }, [active]);
  return null;
}
