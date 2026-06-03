# ⚽ WM 2026 Tippspiel

Privates Tippspiel zur **FIFA WM 2026** für Freunde & Familie. Login, schöner
Spielplan mit Flaggen, 1X2-Tipps mit serverseitigem Tipp-Schluss, automatisches
Scoring, Leaderboard, Statistiken und ein Admin-Bereich.

Berücksichtigt das WM-2026-Format mit 48 Teams: **Gruppenphase → Runde der
letzten 32 → Achtelfinale → Viertelfinale → Halbfinale → Spiel um Platz 3 →
Finale**.

---

## Tech-Stack & Architekturentscheidung

| Bereich      | Wahl                                                            |
| ------------ | --------------------------------------------------------------- |
| Framework    | **Next.js 14** (App Router) + **TypeScript**                    |
| UI           | **Tailwind CSS** + **shadcn/ui**-Komponenten, Mobile-first, Dark |
| Datenbank    | **Prisma ORM** + **SQLite** (Dev) / **PostgreSQL** (Prod)        |
| Auth         | Eigene E-Mail/Passwort-Auth (bcrypt + signiertes JWT-Cookie via `jose`) |
| Validierung  | **Zod** (jede Schreiboperation serverseitig)                     |
| Tests        | **Vitest**                                                       |

**Warum nicht Supabase im MVP?** Die kritische Logik (Tipp-Lock 15 Min vor
Anpfiff, Scoring, Admin-Rechte) muss ohnehin **serverseitig** erzwungen werden –
reine RLS bildet die Zeit-Logik nicht ab. Mit Prisma + SQLite läuft die App
**ohne externe Dienste sofort**. Der Datenzugriff ist gekapselt
(`src/lib/db.ts`, `queries.ts`), ein Wechsel auf Postgres/Supabase ist damit
einfach (siehe unten). „RLS“ wird durch zentrale Guards (`requireUser`,
`requireAdmin`) + Zod-Validierung in allen Server Actions umgesetzt.

---

## Schnellstart

Voraussetzung: Node ≥ 18 und eine **PostgreSQL-Datenbank** (lokal & Prod gleich).
Am einfachsten ein kostenloses Cloud-Postgres bei **[Neon](https://neon.tech)** anlegen
und die Connection-URL kopieren.

```bash
# 1. Abhängigkeiten
npm install

# 2. Env vorbereiten
cp .env.example .env
#   DATABASE_URL = deine Postgres-URL (z. B. von Neon, mit ?sslmode=require)
#   AUTH_SECRET setzen:  openssl rand -base64 32
#   ADMIN_EMAIL auf deine E-Mail setzen (wird automatisch Admin)

# 3. Schema anwenden + echten WM-2026-Spielplan laden
npm run db:push
npm run db:seed

# 4. Starten
npm run dev
# → http://localhost:3000
```

### Login nach Seed

| Rolle | E-Mail                   | Passwort    |
| ----- | ------------------------ | ----------- |
| Admin | `ADMIN_EMAIL` aus `.env` | `admin1234` |

> Der Seed legt **nur** den Admin an und lädt die **echten 104 WM-2026-Spiele**
> (Gruppen A–L mit realen Teams, K.-o.-Runde mit Platzhaltern wie „Sieger
> Gruppe A"). Mitspieler registrieren sich selbst über `/register`. Ergebnisse
> trägt der Admin ein – das Scoring läuft dann automatisch.

---

## NPM-Skripte

| Befehl              | Wirkung                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Dev-Server                                         |
| `npm run build`     | Prod-Build (inkl. `prisma generate`)               |
| `npm run db:push`   | Schema in DB anwenden                              |
| `npm run db:seed`   | Admin + Spielplan (+ Demo) seeden                  |
| `npm run db:reset`  | DB zurücksetzen und neu seeden                     |
| `npm run db:studio` | Prisma Studio                                      |
| `npm run sync`      | Spielplan aus externer Quelle synchronisieren (CLI)|
| `npm run seed:stats`| Demo-Torschützen anlegen (Vorschau ohne API-Key)   |
| `npm test`          | Vitest                                             |

---

## Funktionen

- **Auth & Profil** – Registrierung (E-Mail/Passwort), optionaler Einladungscode
  (`INVITE_CODE`), Anzeigename + Avatar-URL, Admin-Rolle.
- **Spielplan** – Karten mit Flaggen, deutscher Zeit, Stadion, Live-Countdown bis
  Tipp-Schluss; Gruppierung nach Tag (Heute/Morgen/Datum); Filter: Alle / Meine
  offenen Tipps / Gruppenphase / K.-o.-Phase.
- **Tippsystem (1X2)** – ein Tipp je Spiel (Heimsieg / Unentschieden /
  Auswärtssieg), änderbar **bis 15 Min vor Anpfiff**, danach gesperrt.
  **Serverseitig erzwungen.** Bestätigungs-Animation nach dem Speichern.
- **Scoring** – 3 Punkte für richtigen Ausgang, sonst 0. Zentrale, getestete
  Funktion (`src/lib/scoring.ts`), erweiterbar (Joker-Multiplikator vorbereitet).
  Auswertung automatisch nach Ergebnis-Speicherung.
- **Turnier-Tipps (Bonuspunkte)** – zweites Punktesystem für Outright-Wetten:
  „Wer wird Weltmeister?" (20 P), **Torschützenkönig** (15), erreicht das Finale
  (10), Halbfinale (7), Achtelfinale (5), Runde der letzten 32 (3). Ein Team-
  bzw. Spieler-Tipp je Frage, änderbar **bis Anpfiff des ersten Spiels**. Punkte
  sind monoton (Champion erfüllt auch alle tieferen Fragen) und fließen ins
  Gesamt-Ranking ein. Logik: `src/lib/tournament.ts`, Fragen-Katalog zentral in
  `src/lib/constants.ts` (`TOURNAMENT_QUESTIONS`).
- **Torschützen & Live-Statistiken (via API-Football)** – Torschützenliste,
  Torschützen je Spiel (auf der Spielkarte) und der Torschützenkönig-Tipp werden
  aus **API-Football** geladen (Admin → „Live-Daten", oder per Cron). Aktiv,
  sobald `APIFOOTBALL_KEY` gesetzt ist – sonst bleibt der Bereich leer (bzw.
  Demo-Daten via `npm run seed:stats`). Client: `src/lib/api-football.ts`,
  Sync: `src/lib/stats-service.ts`.
- **Team-Tabelle** – Tore / Gegentore / Tordifferenz / Form pro Team, berechnet
  aus den eingetragenen Ergebnissen (keine externe Quelle nötig):
  `src/lib/team-stats.ts`. Beides unter **Statistiken** (Tabs Bilanz/Torschützen/Teams).
- **Joker** – pro Turnierphase 1 Joker, der die Punkte eines Spiel-Tipps
  **verdoppelt**. Setzen/Ändern bis Tipp-Schluss, serverseitig erzwungen
  (max. 1 pro Phase). Anzeige auf der Spielkarte (⚡), Auswertung automatisch.
- **Turnierbaum** – K.-o.-Baum von der Runde der letzten 32 bis zum Finale
  (Header-Icon ⌗ → `/turnierbaum`), horizontal scrollbar, mit Ergebnissen.
- **Auto-Sync (ohne Cron, Hobby-tauglich) + Tipp-Erinnerung** – beim Öffnen der
  App stößt der Browser 1×/Session einen Hintergrund-Sync an (`POST /api/sync/auto`).
  Die eigentliche Drosselung passiert serverseitig: Spielplan max. alle 15 Min,
  API-Football-Statistiken max. alle 60 Min (schont das Free-Tier-Limit). So
  bleibt alles aktuell, **ohne dass ein Cron-Job nötig ist**. Zusätzlich gibt es
  den Endpunkt `GET /api/cron/sync` (via `CRON_SECRET` abgesichert) – für alle,
  die doch einen externen Cron (z. B. cron-job.org) oder Vercel Pro nutzen.
  Dazu ein Hinweis-Banner im Spielplan „Tipp-Schluss bald", wenn ungetippte
  Spiele in der nächsten Stunde schließen.
- **Ranking** – Leaderboard mit Top-3-Hervorhebung, eigener Markierung,
  Punkten / richtigen Tipps / Quote / Formkurve. Tiebreaker: Punkte → richtige
  Tipps → Quote → Registrierungsdatum → alphabetisch.
- **Statistiken** – persönliche Bilanz, Tipp-Verteilung, Badges (Seriensieger,
  Unentschieden-König, Treffsicher).
- **Admin** – Spielplan synchronisieren, Ergebnisse eintragen/korrigieren,
  Punkte neu berechnen, Nutzer sperren/löschen.

---

## Datenmodell (`prisma/schema.prisma`)

- **User** – Login, `displayName`, `avatarUrl`, `role` (USER/ADMIN), `blocked`.
- **Team** – `code` (z. B. GER), `name`, `flagCode` (ISO alpha-2), `group`.
- **Match** – `externalId`, `phase`, `group`, `roundLabel`, `kickoff`, `venue`,
  `city`, Heim/Auswärts-Team oder Platzhalter, `status`, `homeGoals`/`awayGoals`.
- **Prediction** – `userId`, `matchId`, `prediction`, `points`, `scored`,
  `createdAt`/`updatedAt`. **Unique `(userId, matchId)`** → max. 1 Tipp je Spiel.
- **TournamentBet** – Turnier-Tipp: `userId`, `questionKey`, `teamId`, `points`,
  `scored`. **Unique `(userId, questionKey)`**. Team trägt `reachedPhase` +
  `isChampion` für die Auswertung.
- **AppSetting** – Key/Value für App-Einstellungen.

Sichtbarkeit: Tipps anderer Nutzer werden nie geladen (`queries.ts`); die
Tipp-Verteilung pro Spiel ist nur aggregiert und erst nach Tipp-Schluss gedacht.

---

## Spielplan-Datenquelle austauschen (`src/lib/datasource.ts`)

Reihenfolge mit Fallback:

1. **API-Football / API-Sports** – aktiviert sich, wenn `APIFOOTBALL_KEY`
   gesetzt ist (Client-Implementierung ist als Stub vorbereitet).
2. **OpenFootball JSON** – `WORLDCUP_JSON_URL`
   (`.../openfootball/worldcup.json/master/2026/worldcup.json`).
3. **Eingebauter Datensatz** – garantierter Offline-Spielplan (104 Spiele, alle
   Phasen), falls keine externe Quelle erreichbar ist.

Alle Quellen liefern denselben `NormalizedMatch`-Typ → neue Quelle = nur einen
Normalisierer ergänzen. Sync ist **idempotent** (Upsert via `externalId`) und
**überschreibt keine vom Admin eingetragenen Ergebnisse**, wenn die Quelle keine
liefert.

Sync auslösen: Admin-Button „Spielplan synchronisieren" oder `npm run sync`
(z. B. per Cron / Vercel Cron später automatisierbar).

---

## Tests

```bash
npm test
```

Abgedeckt: Tipp-Lock (15 Min, inkl. erstellen/ändern-vor-Lock/sperren-nach-Lock),
Punkteberechnung, Admin-Ergebnisupdate-Auswertung, Ranking-Sortierung inkl. aller
Tiebreaker, Spielplan-Generator (104 Spiele, alle Phasen).

---

## Deployment (Vercel + Postgres)

> SQLite funktioniert auf Vercel **nicht** (read-only/ephemeres Dateisystem).
> Deshalb läuft die App auf PostgreSQL.

1. **Postgres bereitstellen** – am einfachsten **Vercel Postgres** (im Projekt
   unter *Storage → Create Database*) oder **Neon**. Connection-URL kopieren.
2. **Env-Variablen in Vercel** setzen (Project → Settings → Environment Variables),
   für *Production* (und *Preview*):
   - `DATABASE_URL` = deine Postgres-URL
     *(bei Vercel Postgres: den Wert von `POSTGRES_PRISMA_URL` verwenden)*
   - `AUTH_SECRET` = langes Zufalls-Secret (`openssl rand -base64 32`)
   - `ADMIN_EMAIL` = deine E-Mail (wird automatisch Admin)
   - optional: `INVITE_CODE`, `APIFOOTBALL_KEY`, `CRON_SECRET`
3. **Schema + Daten in die DB schreiben** – einmalig lokal gegen die Prod-DB
   ausführen (DATABASE_URL temporär in der lokalen `.env` auf die Prod-URL setzen
   oder inline übergeben):
   ```bash
   DATABASE_URL="postgresql://…" npx prisma db push
   DATABASE_URL="postgresql://…" npm run db:seed
   ```
4. **Deployen** (Push auf GitHub → Vercel baut automatisch). Der Build führt
   `prisma generate` aus; die DB wird zur Laufzeit über `DATABASE_URL` erreicht.
5. Auto-Sync läuft nutzungsgesteuert (kein Cron nötig, Hobby-tauglich). Optional
   externer Cron auf `/api/cron/sync?secret=<CRON_SECRET>`.

> Tipp: Nach „Save" der Env-Variablen einmal **Redeploy** auslösen, damit sie
> greifen.

---

## Sicherheit

- Alle Schreibpfade laufen über Server Actions mit Zod-Validierung.
- Tippabgabe prüft: eingeloggt, Spiel existiert, nicht gesperrt, gültiger Wert.
- Ergebnis-/Nutzer-Aktionen nur über `requireAdmin`.
- Session als httpOnly-Cookie (signiertes JWT). Keine Secrets im Frontend.
- Gesperrte Nutzer werden behandelt wie ausgeloggt.

---

## Optionale Erweiterungsideen

- **Exakte-Ergebnis-Tipps** (z. B. 5 Pkt Tendenz + Differenz + exakt) – Scoring
  ist dafür vorbereitet.
- **Joker pro Phase** (doppelte Punkte) – `jokerMultiplier` existiert bereits.
- **Bonus** für richtigen Gruppensieger (Weltmeister-/Runden-Tipps sind als
  „Turnier-Tipps" bereits umgesetzt).
- **Automatischer Sync per Cron** (Vercel Cron Job → Route Handler).
- **Mini-Ligen / mehrere Tipprunden**, Einladungslinks.
- **Push-Benachrichtigung** „Tipp-Schluss in 1 Stunde".
- **Echte Flaggen-Bilder** via `flagcdn.com` (`flagCdnUrl` ist vorhanden).
- **Trend-Pfeile** (Auf-/Abstieg im Ranking) über `leaderboard_cache`-Snapshots.
