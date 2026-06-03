import { flagEmoji } from "@/lib/flags";

// kleine Auswahl quer durch das Teilnehmerfeld
const CODES = [
  "de", "br", "ar", "fr", "es", "gb", "pt", "nl", "be", "hr",
  "mx", "us", "ca", "jp", "kr", "ma", "ch", "uy", "co", "sn",
  "dk", "rs", "pl", "at", "se", "gh", "ng", "ec", "au", "ir",
];

/** Endlos durchlaufendes Flaggen-Band (für Hero-Hintergrund/Akzent). */
export function FlagTicker() {
  const row = [...CODES, ...CODES]; // verdoppeln für nahtlose Schleife
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-4 py-1 text-2xl">
        {row.map((c, i) => (
          <span key={i} className="opacity-80" aria-hidden>
            {flagEmoji(c)}
          </span>
        ))}
      </div>
    </div>
  );
}
