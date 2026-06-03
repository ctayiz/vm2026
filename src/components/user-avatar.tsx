import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPresetFromValue } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-8 w-8", text: "text-base" },
  md: { box: "h-9 w-9", text: "text-lg" },
  lg: { box: "h-16 w-16", text: "text-3xl" },
} as const;

/**
 * Einheitliche Avatar-Darstellung:
 *  - "preset:<id>"  -> Emoji-Avatar mit Farbverlauf
 *  - http(s)-URL    -> Bild
 *  - sonst          -> Initialen
 */
export function UserAvatar({
  value,
  name,
  size = "md",
  className,
}: {
  value?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const preset = getPresetFromValue(value);
  const initials = name.slice(0, 2).toUpperCase();

  if (preset) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
          preset.gradient,
          s.box,
          s.text,
          className,
        )}
        aria-label={name}
      >
        <span className="leading-none">{preset.emoji}</span>
      </div>
    );
  }

  return (
    <Avatar className={cn(s.box, className)}>
      {value ? <AvatarImage src={value} alt={name} /> : null}
      <AvatarFallback className={s.text}>{initials}</AvatarFallback>
    </Avatar>
  );
}
