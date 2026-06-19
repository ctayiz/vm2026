"use client";

import { useEffect, useState } from "react";
import { ChevronsDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function JumpToNow({ hasLive, label }: { hasLive: boolean; label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById("aktuell");
    if (!target) return;

    const check = () => {
      const rect = target.getBoundingClientRect();
      // Zeige Button wenn der Abschnitt noch unterhalb des Viewports liegt
      setShow(rect.top > window.innerHeight * 0.6);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <a
      href="#aktuell"
      aria-hidden={!show}
      className={cn(
        "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur-md transition-all duration-300",
        show ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none",
      )}
    >
      {hasLive ? (
        <Radio className="size-3.5 animate-pulse text-red-400" />
      ) : (
        <ChevronsDown className="size-4 animate-bounce text-primary" />
      )}
      {label}
    </a>
  );
}
