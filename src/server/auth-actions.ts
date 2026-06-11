"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { registerSchema, loginSchema, profileSchema, passwordChangeSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n-server";
import { AVATAR_PRESETS, presetToken } from "@/lib/avatars";

export type ActionState = { ok: boolean; error?: string };

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = getDictionary();
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.msg.invalidInput };
  }
  const { email, displayName, password, inviteCode } = parsed.data;

  // Optionaler Einladungscode
  const required = process.env.INVITE_CODE?.trim();
  if (required && inviteCode?.trim() !== required) {
    return { ok: false, error: t.msg.invalidInvite };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: t.msg.emailTaken };
  }
  // Anzeigename muss eindeutig sein (Login per Name möglich), case-insensitiv.
  const nameTaken = await db.user.findFirst({
    where: { displayName: { equals: displayName, mode: "insensitive" } },
    select: { id: true },
  });
  if (nameTaken) {
    return { ok: false, error: t.msg.nameTaken };
  }

  // Erster Nutzer oder ADMIN_EMAIL -> Admin
  const userCount = await db.user.count();
  const isAdmin = userCount === 0 || email === process.env.ADMIN_EMAIL?.toLowerCase();

  // zufälliger Standard-Avatar als Startwert (änderbar im Profil)
  const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];

  const user = await db.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: isAdmin ? "ADMIN" : "USER",
      avatarUrl: presetToken(randomPreset.id),
    },
  });

  await setSessionCookie(user.id);
  redirect("/spielplan");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = getDictionary();

  // Brute-Force-Bremse: max. 40 Login-Versuche / 5 Min pro IP. Bewusst großzügig,
  // weil bei Watch-Partys mehrere Leute hinter derselben IP (WLAN/Mobilfunk-NAT)
  // sitzen und sich sonst gegenseitig aussperren würden.
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, 40, 5 * 60 * 1000)) {
    return { ok: false, error: t.msg.tooManyAttempts };
  }

  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.msg.invalidInput };
  }
  const { identifier, password } = parsed.data;

  // Login per E-Mail (klein geschrieben) ODER Anzeigename (case-insensitiv).
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { displayName: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });
  // Konstante Antwort, um keine Existenz preiszugeben.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: t.msg.wrongCredentials };
  }
  if (user.blocked) {
    return { ok: false, error: t.msg.accountBlocked };
  }

  await setSessionCookie(user.id);
  redirect("/spielplan");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const sessionUser = await requireUser();
  const t = getDictionary();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.msg.invalidInput };
  }

  const user = await db.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, error: t.msg.wrongCurrentPassword };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { ok: true };
}

/**
 * Setzt das Passwort über einen Admin-Reset-Link (kein Login nötig).
 * Prüft Token (existiert, unbenutzt, nicht abgelaufen), speichert das neue
 * Passwort und entwertet den Link (Einmal-Nutzung).
 */
export async function resetPasswordWithTokenAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const t = getDictionary();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { ok: false, error: t.msg.passwordMin };
  if (password !== confirm) return { ok: false, error: t.msg.passwordMismatch };

  const reset = await db.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: t.msg.resetInvalid };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = getDictionary();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.msg.invalidInput };
  }

  // Anzeigename darf nicht von einem ANDEREN Nutzer belegt sein.
  const nameTaken = await db.user.findFirst({
    where: {
      displayName: { equals: parsed.data.displayName, mode: "insensitive" },
      NOT: { id: user.id },
    },
    select: { id: true },
  });
  if (nameTaken) {
    return { ok: false, error: t.msg.nameTaken };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      avatarUrl: parsed.data.avatarUrl ? parsed.data.avatarUrl : null,
    },
  });
  revalidatePath("/profil");
  revalidatePath("/ranking");
  return { ok: true };
}
