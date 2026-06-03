import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { syncSchedule } from "../src/lib/sync-service";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();

async function ensureAdmin() {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
    return;
  }
  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      displayName: "Admin",
      passwordHash: await hashPassword("admin1234"),
      role: "ADMIN",
    },
  });
}

async function main() {
  console.log("→ Admin-Benutzer anlegen …");
  await ensureAdmin();
  console.log(`   Admin: ${ADMIN_EMAIL} / admin1234`);

  console.log("→ Spielplan synchronisieren (echte WM-2026-Spiele) …");
  const summary = await syncSchedule();
  console.log(`   Quelle: ${summary.source} · ${summary.total} Spiele · ${summary.teams} Teams`);
  if (summary.note) console.log(`   Hinweis: ${summary.note}`);

  console.log("✓ Seed abgeschlossen.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
