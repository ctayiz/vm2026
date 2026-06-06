import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSessionUserId } from "./session";

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  blocked: boolean;
  onboardedAt: Date | null;
  createdAt: Date;
};

/**
 * Aktuell eingeloggten Nutzer laden (oder null). Pro Request gecached.
 * Gesperrte Nutzer werden wie ausgeloggt behandelt.
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      blocked: true,
      onboardedAt: true,
      createdAt: true,
    },
  });
  if (!user || user.blocked) return null;
  return user;
});

export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === "ADMIN";
}

/** Erzwingt Login (Server Components / Actions). Leitet sonst auf /login. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Erzwingt Admin-Rechte. Leitet sonst auf /spielplan. */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/spielplan");
  return user;
}
