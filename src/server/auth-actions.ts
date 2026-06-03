"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { registerSchema, loginSchema, profileSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { AVATAR_PRESETS, presetToken } from "@/lib/avatars";

export type ActionState = { ok: boolean; error?: string };

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const { email, displayName, password, inviteCode } = parsed.data;

  // Optionaler Einladungscode
  const required = process.env.INVITE_CODE?.trim();
  if (required && inviteCode?.trim() !== required) {
    return { ok: false, error: "Ungültiger Einladungscode." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Diese E-Mail ist bereits registriert." };
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
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  // Konstante Antwort, um keine Existenz preiszugeben.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "E-Mail oder Passwort ist falsch." };
  }
  if (user.blocked) {
    return { ok: false, error: "Dieser Account wurde gesperrt." };
  }

  await setSessionCookie(user.id);
  redirect("/spielplan");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
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
