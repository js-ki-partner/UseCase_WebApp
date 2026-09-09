# UC-Radar — Use-Case-Erfassung

Web-Anwendung zur strukturierten Erfassung von KI-Anwendungsfällen in
Kundenorganisationen von KI&nbsp;Partner. Fachliches Konzept:
[konzept-use-case-erfassungg.md](konzept-use-case-erfassungg.md).
Umsetzungsplan und Fortschritt: [UMSETZUNGSPLAN.md](UMSETZUNGSPLAN.md).

**Stand der Umsetzung:** Ausbaustufe 1 (Abschnitt 10 des Konzepts) — Kurzerfassung,
Live-Potenzialrechnung, Adminbereich mit Eingangskorb, Mandantenverwaltung,
Magic-Link-Rückkehr, idempotenter OpenProject-Sync. Ohne externe KI-Verarbeitung.

## Technik

- Next.js 16 (App Router) + React 19, TypeScript
- Prisma 6 + PostgreSQL
- Tailwind CSS 4
- iron-session (Admin-Session), otplib (TOTP / zweiter Faktor)
- Vitest (Unit-Tests)

## Lokale Entwicklung

```bash
cp .env.example .env                 # Werte anpassen (Secrets!)
cp openproject-mapping.example.json openproject-mapping.json

docker compose up -d db              # PostgreSQL auf localhost:5433
npm install
npm run db:migrate                   # Schema anlegen
npm run db:seed                      # Demo-Tenant + Admin-User
npm run dev                          # http://localhost:3000
```

Der Seed-Lauf gibt den Einreicher-Link (mit Token) und die Admin-Zugangsdaten aus.

### Wichtige Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktions-Build / -Start |
| `npm test` | Unit-Tests (Vitest) |
| `npm run db:migrate` | Migration anwenden (dev) |
| `npm run db:seed` | Demo-Daten |
| `npm run db:reset` | DB zurücksetzen + neu seeden |

## Struktur

```
src/app/(public)/[tenant]/   Einreicher-Frontend (Token-geschützt)
src/app/r/[token]/           Magic-Link-Rückkehr zum eigenen Entwurf
src/app/admin/               Adminbereich (Login + TOTP)
src/app/admin/(dashboard)/   Geschützter Adminbereich (Eingangskorb, Kunden, Detail)
src/lib/                     Berechnung, Tenant-Auflösung, Auth, OpenProject-Sync
prisma/                      Schema, Migrationen, Seed
```

## Betrieb

SOPS-/age-Prinzip: [DEPLOYMENT.md](DEPLOYMENT.md). App-spezifisch (Komponenten,
Secrets, Cron, Restore): [BETRIEB.md](BETRIEB.md).
