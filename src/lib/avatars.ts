// Standard-Avatare: fußball-/WM-thematische Emoji-Avatare mit Farbverlauf.
// Werden offline gerendert (kein externes CDN). Gespeichert wird im Feld
// `avatarUrl` ein Token der Form "preset:<id>". Alternativ darf weiterhin eine
// eigene Bild-URL hinterlegt werden.

export interface AvatarPreset {
  id: string;
  emoji: string;
  /** Tailwind-Gradient-Klassen (from/to) für den Hintergrund. */
  gradient: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "ball", emoji: "⚽", gradient: "from-emerald-400 to-green-600" },
  { id: "trophy", emoji: "🏆", gradient: "from-amber-300 to-yellow-600" },
  { id: "fire", emoji: "🔥", gradient: "from-orange-400 to-red-600" },
  { id: "lion", emoji: "🦁", gradient: "from-amber-400 to-orange-600" },
  { id: "tiger", emoji: "🐯", gradient: "from-orange-400 to-amber-600" },
  { id: "eagle", emoji: "🦅", gradient: "from-slate-400 to-slate-700" },
  { id: "dragon", emoji: "🐉", gradient: "from-emerald-400 to-teal-700" },
  { id: "wolf", emoji: "🐺", gradient: "from-sky-400 to-indigo-700" },
  { id: "fox", emoji: "🦊", gradient: "from-orange-400 to-rose-600" },
  { id: "bear", emoji: "🐻", gradient: "from-amber-500 to-stone-700" },
  { id: "shark", emoji: "🦈", gradient: "from-cyan-400 to-blue-700" },
  { id: "rocket", emoji: "🚀", gradient: "from-indigo-400 to-purple-700" },
  { id: "alien", emoji: "👽", gradient: "from-teal-300 to-emerald-700" },
  { id: "robot", emoji: "🤖", gradient: "from-zinc-400 to-slate-700" },
  { id: "unicorn", emoji: "🦄", gradient: "from-fuchsia-400 to-purple-700" },
  { id: "ghost", emoji: "👻", gradient: "from-slate-300 to-indigo-600" },
];

export const PRESET_PREFIX = "preset:";

export function presetToken(id: string): string {
  return `${PRESET_PREFIX}${id}`;
}

/** Liefert das Preset zu einem gespeicherten Wert ("preset:lion") oder null. */
export function getPresetFromValue(value?: string | null): AvatarPreset | null {
  if (!value || !value.startsWith(PRESET_PREFIX)) return null;
  const id = value.slice(PRESET_PREFIX.length);
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}

/** Ist der Wert ein gültiger Avatar (leer, Preset oder http(s)-URL)? */
export function isValidAvatarValue(value: string): boolean {
  if (value === "") return true;
  if (value.startsWith(PRESET_PREFIX)) return getPresetFromValue(value) !== null;
  return /^https?:\/\/.+/i.test(value);
}
