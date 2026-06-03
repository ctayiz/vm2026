// CLI-Spielplan-Sync:  npm run sync
import "dotenv/config";
import { db } from "../src/lib/db";
import { syncSchedule } from "../src/lib/sync-service";
import { rescoreAll } from "../src/lib/scoring-service";

async function main() {
  const summary = await syncSchedule();
  console.log(`Quelle: ${summary.source}`);
  if (summary.note) console.log(`Hinweis: ${summary.note}`);
  console.log(`Teams: ${summary.teams} · Neu: ${summary.created} · Aktualisiert: ${summary.updated} · Gesamt: ${summary.total}`);

  // Falls die Quelle Ergebnisse mitbringt: direkt neu auswerten.
  const r = await rescoreAll();
  console.log(`Auswertung: ${r.scored} Tipps in ${r.matches} Spielen.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
