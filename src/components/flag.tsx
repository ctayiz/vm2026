import { flagEmoji } from "@/lib/flags";
import { cn } from "@/lib/utils";

export function Flag({ code, className }: { code?: string | null; className?: string }) {
  return (
    <span className={cn("leading-none", className)} aria-hidden>
      {flagEmoji(code)}
    </span>
  );
}
