import { cn } from "@/lib/utils";

/** Marken-Logo (Fußball auf grünem Badge). Größe über className (z. B. size-6). */
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
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="22" fill="url(#wm-logo-g)" />
      <circle cx="50" cy="50" r="34" fill="#ffffff" />
      <g fill="none" stroke="#0b1220" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M50,38 L61.41,46.29 L57.06,59.71 L42.94,59.71 L38.59,46.29 Z" fill="#0b1220" />
        <path d="M50,38 L50,17" />
        <path d="M61.41,46.29 L81.38,39.8" />
        <path d="M57.06,59.71 L69.4,76.7" />
        <path d="M42.94,59.71 L30.6,76.7" />
        <path d="M38.59,46.29 L18.62,39.8" />
      </g>
    </svg>
  );
}
