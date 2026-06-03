"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, registerAction, type ActionState } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Bitte warten …" : label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, { ok: false });

  return (
    <Card className="glass shadow-2xl shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-lg">{mode === "login" ? "Anmelden" : "Registrieren"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? "Willkommen zurück – weiter geht's." : "In 30 Sekunden dabei."}
        </p>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Anzeigename</Label>
              <Input id="displayName" name="displayName" placeholder="z. B. Max" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" placeholder="du@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={mode === "register" ? 8 : undefined}
            />
          </div>
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Einladungscode (optional)</Label>
              <Input id="inviteCode" name="inviteCode" placeholder="nur falls vorhanden" />
            </div>
          )}

          {state.error && (
            <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <SubmitButton label={mode === "login" ? "Anmelden" : "Konto erstellen"} />
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Noch kein Konto?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Registrieren
                </Link>
              </>
            ) : (
              <>
                Schon registriert?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Anmelden
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
