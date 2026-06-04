"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction, type ActionState } from "@/server/auth-actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t.common.saving : t.profile.pwTitle}
    </Button>
  );
}

export function ChangePasswordForm() {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ActionState, FormData>(async (prev, fd) => {
    const res = await changePasswordAction(prev, fd);
    if (res.ok) formRef.current?.reset();
    return res;
  }, { ok: false });

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{t.profile.pwCurrent}</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t.profile.pwNew}</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">{t.profile.pwSaved}</p>}
      <SubmitButton />
    </form>
  );
}
