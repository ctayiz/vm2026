"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { updateProfileAction, type ActionState } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { AVATAR_PRESETS, presetToken, getPresetFromValue } from "@/lib/avatars";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Speichern …" : "Speichern"}
    </Button>
  );
}

export function ProfileForm({
  displayName: initialName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(updateProfileAction, { ok: false });

  const [name, setName] = useState(initialName);
  // Ausgangswert: bestehendes Preset bzw. eigene URL
  const startPreset = getPresetFromValue(avatarUrl);
  const [selected, setSelected] = useState<string>(startPreset ? presetToken(startPreset.id) : "");
  const [customUrl, setCustomUrl] = useState<string>(startPreset || !avatarUrl ? "" : avatarUrl);

  // Eigene URL hat Vorrang, sonst gewähltes Preset.
  const finalValue = customUrl.trim() ? customUrl.trim() : selected;

  return (
    <form action={formAction} className="space-y-5">
      {/* Vorschau */}
      <div className="flex items-center gap-3">
        <UserAvatar value={finalValue} name={name || "?"} size="lg" />
        <div>
          <div className="font-semibold">{name || "Dein Name"}</div>
          <div className="text-xs text-muted-foreground">So sehen dich andere im Ranking.</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">Anzeigename</Label>
        <Input
          id="displayName"
          name="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Standard-Avatare */}
      <div className="space-y-2">
        <Label>Avatar auswählen</Label>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {AVATAR_PRESETS.map((p) => {
            const token = presetToken(p.id);
            const active = !customUrl.trim() && selected === token;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(token);
                  setCustomUrl("");
                }}
                aria-pressed={active}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-full bg-gradient-to-br text-lg transition-transform hover:scale-110",
                  p.gradient,
                  active && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                )}
              >
                <span className="leading-none">{p.emoji}</span>
                {active && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected("")}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Auswahl entfernen (Initialen anzeigen)
          </button>
        )}
      </div>

      {/* Optional: eigene Bild-URL (hat Vorrang) */}
      <div className="space-y-1.5">
        <Label htmlFor="customUrl">Eigene Bild-URL (optional)</Label>
        <Input
          id="customUrl"
          type="url"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="https://…"
        />
        <p className="text-[11px] text-muted-foreground">
          Wenn ausgefüllt, wird die URL statt des Standard-Avatars verwendet.
        </p>
      </div>

      {/* an die Server Action übergebener Wert */}
      <input type="hidden" name="avatarUrl" value={finalValue} />

      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">Profil gespeichert.</p>}
      <SubmitButton />
    </form>
  );
}
