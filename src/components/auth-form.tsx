"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, registerAction, type ActionState } from "@/server/auth-actions";
import { useT } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ShareButtons } from "@/components/share-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  inviteRequired = false,
}: {
  mode: "login" | "register";
  inviteRequired?: boolean;
}) {
  const t = useT();
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, { ok: false });

  return (
    <Card className="glass shadow-2xl shadow-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">
              {mode === "login" ? t.auth.signInTitle : t.auth.signUpTitle}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? t.auth.welcomeBack : t.auth.quickStart}
            </p>
          </div>
          <LanguageToggle variant="flags" />
        </div>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t.auth.displayName}</Label>
              <Input id="displayName" name="displayName" placeholder={t.auth.displayNamePh} required />
            </div>
          )}
          {mode === "login" ? (
            <div className="space-y-1.5">
              <Label htmlFor="identifier">{t.auth.identifier}</Label>
              <Input id="identifier" name="identifier" type="text" placeholder={t.auth.identifierPh} required />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" name="email" type="email" placeholder="du@example.com" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.auth.password}</Label>
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
              <Label htmlFor="inviteCode">{t.auth.inviteCode}</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                placeholder={t.auth.inviteCodePh}
                required={inviteRequired}
              />
              {inviteRequired && (
                <p className="text-[11px] text-muted-foreground">{t.auth.inviteRequiredHint}</p>
              )}
            </div>
          )}

          {state.error && (
            <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <SubmitButton
            label={mode === "login" ? t.auth.doLogin : t.auth.doRegister}
            pendingLabel={t.common.pleaseWait}
          />
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t.auth.noAccount}{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  {t.auth.toRegister}
                </Link>
              </>
            ) : (
              <>
                {t.auth.haveAccount}{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  {t.auth.toLogin}
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
      <div className="border-t border-border/60 px-5 py-3">
        <ShareButtons />
      </div>
    </Card>
  );
}
