import { cn } from "@/lib/utils";

/**
 * Modernes Marken-Logo als Lockup: minimalistischer Ball (Kreis + Pentagon)
 * + Schriftzug „WM 2026". Höhe über className (z. B. h-7 w-auto). Der Text
 * nutzt currentColor, passt sich also der Textfarbe an.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 84"
      className={cn("w-auto shrink-0", className)}
      role="img"
      aria-label="WM 2026"
    >
      <defs>
        <linearGradient id="wm-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>

      {/* Ball: grüner Kreis mit weißem Pentagon */}
      <circle cx="42" cy="42" r="34" fill="url(#wm-logo-g)" />
      <path
        d="M42,26 L57.22,37.06 L51.41,54.94 L32.59,54.94 L26.78,37.06 Z"
        fill="#ffffff"
      />

      {/* Schriftzug */}
      <text
        x="88"
        y="46"
        dominantBaseline="central"
        fontFamily="'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif"
        fontSize="46"
        fontWeight="800"
        letterSpacing="-1"
        fill="currentColor"
      >
        WM 2026
      </text>
    </svg>
  );
}
