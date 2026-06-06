"use client";

import { useEffect, useState } from "react";

/**
 * Temporäre Diagnose-Einblendung: nur sichtbar mit ?debug=1 in der URL.
 * Zeigt Viewport-Breiten + die breitesten Elemente, die über den Rand ragen.
 * Hilft, iOS-spezifische Overflow-Ursachen zu finden, die in Chromium fehlen.
 */
export function ViewportDebug() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState("…");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    setOn(true);

    const measure = () => {
      const de = document.documentElement;
      const vv = window.visualViewport;
      const cw = de.clientWidth;
      const wide = [...document.querySelectorAll<HTMLElement>("body *")]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > 0 && x.r.right > cw + 0.5)
        .sort((a, b) => b.r.right - a.r.right)
        .slice(0, 5)
        .map((x) => {
          const cls = (x.el.className || "").toString().split(/\s+/).slice(0, 2).join(".");
          return `${x.el.tagName.toLowerCase()}.${cls} →${Math.round(x.r.right)} w${Math.round(x.r.width)}`;
        });

      setInfo(
        [
          `inner=${window.innerWidth} client=${cw} scrollW=${de.scrollWidth} bodyW=${document.body.scrollWidth}`,
          `visualVP=${vv ? Math.round(vv.width) : "?"} scale=${vv ? vv.scale.toFixed(2) : "?"}`,
          `WIDE(${wide.length}): ${wide.join(" | ") || "keine"}`,
        ].join("\n"),
      );
    };

    measure();
    const id = window.setInterval(measure, 1000);
    window.visualViewport?.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearInterval(id);
      window.visualViewport?.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  if (!on) return null;
  return (
    <pre
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        margin: 0,
        padding: "6px 8px",
        background: "rgba(0,0,0,0.88)",
        color: "#22ff88",
        font: "600 11px/1.35 ui-monospace, monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        pointerEvents: "none",
      }}
    >
      {info}
    </pre>
  );
}
