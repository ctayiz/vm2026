import { cn } from "@/lib/utils";

/** Schimmernder Platzhalter, während Inhalte serverseitig geladen werden. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-secondary/60", className)} />;
}
