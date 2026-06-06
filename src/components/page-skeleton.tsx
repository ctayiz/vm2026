import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generischer Lade-Platzhalter für Seiten (Hero + Karten-Liste).
 * Wird über die jeweilige loading.tsx automatisch beim Navigieren gezeigt.
 */
export function PageSkeleton({ rows = 4, hero = true }: { rows?: number; hero?: boolean }) {
  return (
    <div className="space-y-5">
      {hero && <Skeleton className="h-28 w-full rounded-2xl" />}
      <Skeleton className="h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
