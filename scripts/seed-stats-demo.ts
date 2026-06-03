// Demo-Daten für Torschützen & Spiel-Tore (für Entwicklung/Vorschau OHNE API-Key).
// Echtbetrieb: stattdessen Admin → "Live-Daten (Torschützen)" mit APIFOOTBALL_KEY.
//
//   npm run seed:stats
import "dotenv/config";
import { db } from "../src/lib/db";
import { rescoreTournamentBets } from "../src/lib/scoring-service";

const DEMO = [
  { code: "FRA", name: "K. Mbappé", goals: 6 },
  { code: "ENG", name: "H. Kane", goals: 5 },
  { code: "BRA", name: "Vinícius Jr.", goals: 4 },
  { code: "ARG", name: "L. Messi", goals: 4 },
  { code: "POR", name: "C. Ronaldo", goals: 3 },
  { code: "GER", name: "F. Wirtz", goals: 3 },
  { code: "ESP", name: "L. Yamal", goals: 2 },
  { code: "NED", name: "C. Gakpo", goals: 2 },
];

async function main() {
  const teams = await db.team.findMany({ select: { id: true, code: true } });
  const byCode = new Map(teams.map((t) => [t.code, t.id]));

  let n = 0;
  for (const d of DEMO) {
    const teamId = byCode.get(d.code) ?? null;
    await db.player.upsert({
      where: { externalId: `demo-${d.name}` },
      update: { name: d.name, goals: d.goals, teamId },
      create: { externalId: `demo-${d.name}`, name: d.name, goals: d.goals, teamId },
    });
    n++;
  }

  // Torschützenkönig markieren (höchste Toranzahl)
  const max = Math.max(...DEMO.map((d) => d.goals));
  await db.player.updateMany({ data: { isTopScorer: false } });
  await db.player.updateMany({ where: { goals: max }, data: { isTopScorer: true } });

  await rescoreTournamentBets();
  console.log(`✓ ${n} Demo-Torschützen angelegt · Torschützenkönig: ${max} Tore`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
