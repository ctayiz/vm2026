import { cn } from "@/lib/utils";

/** Modernes Marken-Logo: „26"-Badge (Squircle, Emerald-Teal). Größe via className. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="WM 2026 Tippspiel"
    >
      <defs>
        <linearGradient id="wm-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="26" fill="url(#wm-logo-g)" />
      <rect x="0" y="0" width="100" height="50" rx="26" fill="#ffffff" opacity="0.1" />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif"
        fontSize="56"
        fontWeight="800"
        letterSpacing="-3"
        fill="#ffffff"
      >
        26
      </text>
    </svg>
  );
}
