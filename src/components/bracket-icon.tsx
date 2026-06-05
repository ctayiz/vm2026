import { cn } from "@/lib/utils";

/**
 * Turnierbaum-Icon: stilisiertes Bracket (4 → 2 → 1) im Lucide-Stil.
 * Farbe/Größe via className (stroke = currentColor).
 */
export function BracketIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      {/* obere Paarung -> Halbfinale oben */}
      <path d="M2 4 H7" />
      <path d="M2 8 H7" />
      <path d="M7 4 V8" />
      <path d="M7 6 H11" />
      {/* untere Paarung -> Halbfinale unten */}
      <path d="M2 16 H7" />
      <path d="M2 20 H7" />
      <path d="M7 16 V20" />
      <path d="M7 18 H11" />
      {/* Halbfinale -> Finale */}
      <path d="M11 6 V18" />
      <path d="M11 12 H16" />
      {/* Finale / Sieger */}
      <circle cx="20" cy="12" r="2" />
      <path d="M16 12 H18" />
    </svg>
  );
}
