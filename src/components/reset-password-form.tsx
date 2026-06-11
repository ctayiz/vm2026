"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { resetPasswordWithTokenAction, type ActionState } from "@/server/auth-actions";
import { useT } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
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

export function ResetPasswordForm({ token, userName }: { token: string; userName: string }) {
  const t = useT();
  const [state, formAction] = useFormState<ActionState, FormData>(resetPasswordWithTokenAction, {
    ok: false,
  });

  if (state.ok) {
    return (
      <Card className="glass shadow-2xl shadow-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-primary" /> {t.reset.successTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.reset.successText}</p>
        </CardContent>
        <CardFooter>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">{t.reset.toLogin}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="glass shadow-2xl shadow-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{t.reset.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t.reset.subtitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.reset.forUser(userName)}</p>
          </div>
          <LanguageToggle variant="flags" />
        </div>
      </CardHeader>
      <form
        action={formAction}
        onSubmit={() => {
          if (typeof document !== "undefined") (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <CardContent className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.reset.newPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t.reset.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton label={t.reset.submit} pendingLabel={t.common.pleaseWait} />
        </CardFooter>
      </form>
    </Card>
  );
}
