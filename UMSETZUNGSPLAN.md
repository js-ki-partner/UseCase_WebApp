# Umsetzungsplan: UC-Radar (Use-Case-Erfassung)

Bezug: [konzept-use-case-erfassungg.md](konzept-use-case-erfassungg.md)
Stack-Entscheidung: **Next.js (App Router) + Prisma + PostgreSQL**, ein Container, betreibbar durch eine Person.
Umfang dieses Plans: **Ausbaustufe 1** aus Abschnitt 10 des Konzepts, mit Vorbereitung auf Stufe 2.

Legende: `[ ]` offen · `[~]` in Arbeit · `[x]` fertig

---

## Umsetzungsstand (Stand: 8. September 2026)

**Lauffähig und getestet (Ende-zu-Ende gegen lokale Postgres):**

- Projektgerüst, Datenmodell, 2 Migrationen, Seed, Berechnungslogik (13 Unit-Tests grün).
- Einreicher-Flow: Token-Link → Session → Kurzerfassung mit Live-Potenzial → Absenden → Danke-Seite.
  Verifiziert: Potenzial serverseitig neu berechnet, Persistenz, Magic-Link-Erzeugung, Rate-Limit, Audit-Eintrag.
- Branding je Kunde (Logo/Name/Akzentfarbe) plus „bereitgestellt von KI Partner" auf allen Einreicher-Seiten.
- Magic-Link-Rückkehr: `/r/<token>` → vorbelegtes Bearbeiten-Formular.
- Adminbereich: Middleware-Vorfilter + Login → 2FA-Einrichtung (TOTP) → Eingangskorb → Detailansicht → Audit-Protokoll.
- OpenProject-Sync-Client (idempotent über UUID-Custom-Field), Markdown-Renderer, Systemaggregation, Einwilligungs-Mapping — Funktionen unit-getestet; realer API-Aufruf noch nicht gegen eine Instanz geprüft.
- Mandantenverwaltung: Kunde anlegen/bearbeiten, Zugangstoken erzeugen/rotieren/widerrufen (Klartext einmalig).
- Sicherheits-Header inkl. enger CSP; `next build` grün, Dockerfile + Prod-Compose + `deploy.sh`/`rollback.sh`/`backup.sh` + [DEPLOYMENT.md](DEPLOYMENT.md).
- Abnahme-Checkliste: [ABNAHME-STUFE1.md](ABNAHME-STUFE1.md).

**Noch offen für den Produktivgang:** echter OpenProject-Sync-Test gegen eine Instanz (S6.3–S6.7),
Status-Rücklesen (S6.8), RLS (S7.2), zusätzliche CSRF-Härtung (S7.4),
E2E-Tests mit Playwright (S9.3), SOPS-Secret-Datei anlegen (S8.3), erster Admin-User auf dem VPS.

---

## Zielbild Ausbaustufe 1

- Kundenspezifische URL mit Zugangstoken → Einreicher öffnet Formular ohne Konto.
- Stufe-1-Kurzerfassung (5 Felder) mit Live-Hochrechnung des Jahrespotenzials.
- Magic Link zur Rückkehr an einen eigenen Entwurf.
- Adminbereich (echte Anmeldung, 2. Faktor) mit Eingangskorb: sichten, zusammenführen, per Klick nach OpenProject übertragen.
- Mandantenverwaltung im Adminbereich (Tenant anlegen, Token rotieren, Stundensatz, Branding).
- Einseitiger, idempotenter Sync nach OpenProject (Work Package mit Markdown-Beschreibung, UUID-Custom-Field, Systemliste).
- **Keine** externe KI-Verarbeitung.

Nicht in Stufe 1: Prozessschritte (Stufe 2), Bewertungsblock, KI-Anreicherung, Kunden-Dashboard, Priorisierungsmodus.

---

## Architektur-Überblick

```
apps/                     (Monorepo-frei: eine Next.js-App)
  app/
    (public)/[tenant]/    Einreicher-Frontend (Token-geschützt)
    admin/                Adminbereich (Session + TOTP)
    api/                  Route Handler (REST-artig)
  lib/
    potential.ts          Berechnungslogik (Frequenz-Faktoren)
    tenant.ts             Token-Auflösung + Mandantenkontext
    auth.ts               Admin-Session, TOTP
    openproject.ts        Sync-Client (idempotent)
    magic-link.ts         Signierte Rückkehr-Links
  prisma/
    schema.prisma
    seed.ts
```

Zentrale Zugriffsschicht: **jede** DB-Abfrage im Einreicher-Kontext geht durch einen Helper, der `tenant_id` erzwingt (Konzept Abschnitt 6). Optional zusätzlich Postgres Row Level Security.

---

## Schritte

### Phase 0 — Projektgerüst

- [x] S0.1 Next.js-App initialisieren (TypeScript, App Router, ESLint), Tailwind. → Next 16, React 19, Tailwind 4.
- [x] S0.2 Prisma + `@prisma/client` einrichten, `DATABASE_URL` über `.env`. → Prisma 6, `.env` / `.env.example`.
- [x] S0.3 `docker-compose.yml` mit Postgres für lokale Entwicklung. → Postgres 16 auf `127.0.0.1:5433`.
- [x] S0.4 Basis-Layout, deutschsprachige UI, `lang="de"`, Akzentfarbe je Tenant per CSS-Variable.
- [x] S0.5 `README` + [DEPLOYMENT.md](DEPLOYMENT.md) mit „ein Kommando Deploy, eines Rollback".

### Phase 1 — Datenmodell

- [x] S1.1 `prisma/schema.prisma` mit allen 8 Modellen; Stufe 1 bespielt Tenant/UseCase/AdminUser/MagicLink.
- [x] S1.2 Enums: `Frequenz`, `Reifegrad`, `UseCaseStatus` (+ `DUPLIKAT`), `SyncStatus`.
- [x] S1.3 `uuid`-Idempotenzanker auf `UseCase`; `openprojectWpId`, `openprojectLockVersion`, `syncedAt`, `syncStatus`, `syncFehler`.
- [x] S1.4 Migration `20260908120000_init` + `seed.ts` (Demo-Tenant, Admin, Anhang-Beispiel).

### Phase 2 — Berechnungslogik

- [x] S2.1 `src/lib/potential.ts` mit den Frequenz-Faktoren aus Abschnitt 4.5.
- [x] S2.2 Reine Funktion, `potential.test.ts` inkl. Anhang-Beispiel (367 h) — grün.
- [x] S2.3 `formatiereStundenpotenzial` („rund 370 Stunden im Jahr").

### Phase 3 — Einreicher-Frontend (Stufe 1)

- [x] S3.1 Route `/[tenant]`, Token-Prüfung gegen `accessTokenHash` + `tokenExpiresAt`, sonst `not-found.tsx`.
- [x] S3.2 Token → signiertes iron-session-Cookie über Route Handler `/api/access/[slug]`, Redirect auf saubere URL.
- [x] S3.3 `KurzerfassungForm` — 5 Felder gemäß 4.2, Dauer-Schnellauswahl 5/15/30/60/120.
- [x] S3.4 Live-Hochrechnung client-seitig, identische Formel wie Server.
- [x] S3.5 Name/Abteilung optional + „anonym einreichen" (Feld leer vorbelegt).
- [x] S3.6 Absenden als Server Action: Zod-Validierung, Potenzial serverseitig neu berechnet, `status=EINGEREICHT`, `reifegrad=KURZ`. (Abweichung vom Plan: Server Action statt REST-Route.)
- [x] S3.7 Danke-Seite mit berechnetem Potenzial + Hinweis auf spätere Ergänzung.
- [x] S3.8 „Details später ergänzen"-Hinweis am Formularende (Stufe-2-Ausblick).
- [x] S3.9 KI-Schalter sichtbar, hart deaktiviert, Hinweis „nicht verfügbar" — kein externer Code-Pfad.
- [x] S3.10 Branding: `EinreicherChrome` — Kundenlogo/-name oben + Akzentfarbe, „bereitgestellt von KI Partner" (Inline-SVG-Wortmarke) unten. Auf allen Einreicher-Seiten.

### Phase 4 — Magic Link (Rückkehr zum Entwurf)

- [x] S4.1 `MagicLink`-Datensatz (Token-Hash, 14 Tage Ablauf, `useCaseId`) bei Einreichung mit E-Mail.
- [x] S4.2 `GET /r/[token]` (Route Handler) → Session setzen → `/[tenant]/bearbeiten/[id]` mit vorbelegtem Formular.
- [x] S4.3 `src/lib/mailer.ts` — ohne `SMTP_URL` Konsolen-Log, sonst nodemailer (lazy).

### Phase 5 — Adminbereich

- [x] S5.1 `/admin/login` (bcrypt) → TOTP (otplib). iron-session HTTP-only-Cookie, 8 h.
- [x] S5.2 Schutz: `src/middleware.ts` (Cookie-Vorfilter für `/admin/*`) + serverseitiger Guard in `admin/(dashboard)/layout.tsx`.
- [x] S5.3 `/admin` Eingangskorb über alle Tenants, Filter Kunde/Status, Sortierung nach Potenzial.
- [x] S5.4 Detailansicht `/admin/uc/[id]` — alle Felder, Potenzial, Bearbeiten (Titel/Status/Notiz).
- [x] S5.5 Zusammenführen: `DuplikatForm` — führenden Eintrag wählen, Status `DUPLIKAT`, Aufhebung möglich.
- [x] S5.6 „Nach OpenProject übertragen"-Button mit Fehler-/Erfolgsmeldung.
- [x] S5.7 Mandantenverwaltung: Liste `/admin/tenants` + eigene Seite `/admin/tenants/neu` (Kunde anlegen, Zugangslink optional direkt miterzeugen) + Detailseite `/admin/tenants/[id]` (bearbeiten, Zugangslink erneuern/widerrufen, Klartext einmalig, Ablauf in Tagen).
- [x] S5.8 OpenProject-Projektauswahl: `listeProjekte()` füllt im Kundenformular ein Dropdown (aktive Projekte, nach Name sortiert); ohne erreichbare/konfigurierte API automatischer Rückfall auf ein Freitextfeld mit Hinweis. 8-s-Timeout auf allen OpenProject-Requests.

### Phase 6 — OpenProject-Sync

- [x] S6.1 `src/lib/openproject.ts` — API-Client (`apikey`-Basic-Auth über `OP_BASE_URL`/`OP_API_KEY`, siehe `OPENPROJECT_ZUGANG.md`; 8-s-Timeout). Verbindung zu `openproject.ki-partner.tech` lokal getestet (`scripts/op-test.sh`), Projektliste lädt, Dropdown + Status-Banner im Adminbereich aktiv.
- [x] S6.2 `openproject-mapping.json` (git-ignoriert) + `.example` mit realer Struktur (type_use_case_id, status_ids, custom_fields CF1–CF17, custom_options). `baueWorkPackageFelder()` mappt Enums → Options-IDs.
- [x] S6.3 Idempotenz: Filter auf `uc_uuid`-Custom-Field, sonst `PATCH` mit `lockVersion`. **Real getestet** gegen `openproject.ki-partner.tech` Projekt „Use Cases – ValuePropDemo": Anlegen → WP #45/#46, erneuter Lauf aktualisiert dasselbe WP (lockVersion steigt).
- [x] S6.4 `rendereBeschreibung` — `## Problem` / `## Wunschergebnis` (entfällt leer) / `## Prozessschritte`-Tabelle. Real im WP sichtbar.
- [x] S6.5 `aggregiereSysteme` → formatierbares Textfeld `{ raw }` (CF15).
- [x] S6.6 `einwilligungsStatus` → Options-ID CF17; Startstatus „eingereicht" nur beim Anlegen, bei `PATCH` nicht mitgesendet (OpenProject-Hoheit).
- [x] S6.7 Nach Erfolg `openprojectWpId`/`lockVersion`/`syncedAt` speichern, `status=UEBERTRAGEN`; Detailseite verlinkt das WP.
- [x] S6.8 Status-Rücklesen: `leseFortschritt` (Status-ID → Mapping-Schlüssel), `kundenFortschritt()` (vereinfachtes Label), `src/lib/op-status.ts` (einzeln + alle), Cron-Endpunkt `GET/POST /api/jobs/op-status` (Bearer `JOB_TOKEN`), Buttons im Adminbereich, Fortschrittsbanner auf der Magic-Link-Seite. Real getestet: liest „Eingereicht" von WP #45/#46, Änderungserkennung greift.
- [x] S6.9 Fehlerbehandlung: `syncStatus=FEHLER` + `syncFehler` sichtbar im Admin, Retry über denselben Button.

### Phase 7 — Mandantentrennung & Sicherheit

- [x] S7.1 `src/lib/tenant-db.ts` — `tenantDb(id)` erzwingt `tenantId` in jeder Einreicher-Abfrage.
- [ ] S7.2 Postgres RLS-Policy — noch nicht umgesetzt.
- [x] S7.3 Rate-Limiting: `src/lib/rate-limit.ts` (In-Memory, fixed window) auf Einreichung (10/10 min) und Admin-Login (8/10 min).
- [~] S7.4 CSP + Sicherheits-Header in `next.config.ts` (getestet). HSTS via Caddy. Zusätzliche CSRF-Härtung über den Server-Action-Origin-Check hinaus offen.
- [x] S7.5 Audit-Log: `AuditLog`-Modell + `src/lib/audit.ts`, Ansicht `/admin/audit`. Erfasst Einreichung, Login (Erfolg/Fehlschlag), Token-Rotation/-Widerruf, OpenProject-Sync.

### Phase 8 — Betrieb

- [x] S8.1 `Dockerfile` (multi-stage, standalone output, Entrypoint mit `migrate deploy`).
- [x] S8.2 `docker-compose.prod.yml` + Caddyfile-Snippet in [DEPLOYMENT.md](DEPLOYMENT.md).
- [~] S8.3 SOPS+age nach KI-Partner-Standard ([DEPLOYMENT.md](DEPLOYMENT.md)): `deploy.sh` entschlüsselt `secrets.enc.yaml` → `.env` (`--output-type dotenv`). Vorlage `secrets.example.yaml`. Die verschlüsselte `secrets.enc.yaml` + `.sops.yaml` müssen auf dem VPS angelegt werden.
- [x] S8.4 `scripts/deploy.sh` + `scripts/rollback.sh` (je ein Kommando).
- [x] S8.5 `scripts/backup.sh` (täglich, 7 Tage); Restore-Prozedur dokumentiert, noch nicht geprobt.
- [x] S8.6 `/api/health` (prüft DB).

### Phase 9 — Tests & Abnahme

- [x] S9.1 Unit: Potenzialrechnung, Markdown-Renderer, System-Aggregation, Einwilligungs-Mapping (13 Tests grün).
- [~] S9.2 Integration: Einreichung → DB → Admin-Sichtbarkeit manuell via HTTP verifiziert; OpenProject-Sync gegen Instanz offen.
- [ ] S9.3 E2E (Playwright) — noch nicht eingerichtet.
- [x] S9.4 Abnahme-Checkliste: [ABNAHME-STUFE1.md](ABNAHME-STUFE1.md).

---

## Ausbaustufe 2 — Tiefe (Konzept Abschnitt 10)

### Phase 10 — Prozessschritte (Konzept 4.3)

- [x] S10.1 `ProzessEditor` unter `/[tenant]/prozess/[id]`: Schritte anlegen/entfernen/verschieben, je Schritt Bezeichnung, Eingang, Ergebnis, System (Datalist + Freitext), Dauer, Marker *Wartezeit* / *menschliche Entscheidung*.
- [x] S10.2 `speichereProzessschritte` — ersetzt alle Schritte, setzt `reifegrad = PROZESS`, Rate-Limit + Audit. Erreichbar für jede Person mit Token (progressive Vertiefung).
- [x] S10.3 Einstieg: „Mehr Details erfassen" auf der Danke-Seite (mit `?uc=`) und auf der Magic-Link-Seite.
- [x] S10.4 Admin-Detailseite zeigt die Schritte als Tabelle mit Marker-Spalte.
- [x] S10.5 OpenProject-Sync übernimmt die Schritt-Tabelle in die Beschreibung und aggregiert die Systeme in `betroffene_systeme` — real an WP #46 verifiziert.
- [x] S10.6 Browser-E2E (Puppeteer, manuell): Editor ausfüllen → speichern → DB korrekt inkl. Umlauten.

### Phase 11 — Bewertungsblock im Adminbereich (Konzept 4.4)

- [x] S11.1 `BewertungForm` auf der Admin-Detailseite: Wertkorridor (pessimistisch/realistisch/optimistisch), Konfidenz, Datenlage, Fehlerkosten, Owner beim Kunden, interne Notiz. `speichereBewertung` upsertet `Assessment` (`bewertetVon`/`bewertetAm`).
- [x] S11.2 Vier K.-o.-Fragen (Ja/Nein) vor dem Wertkorridor; ein „nein" ohne Begründung wird abgelehnt, mit Begründung → `status = WARTELISTE`.
- [x] S11.3 `src/lib/bewertung.ts` — Euro-Korridor aus Stundenpotenzial × Automatisierungsgrad (40/55/70 %) × Stundensatz, als Vorschlag vorbefüllt. Unit-getestet.
- [x] S11.4 `reifegrad = BEWERTET` wenn K.-o. bestanden + Werte gesetzt. Tenant-Schalter `zeigtBewertung`; realistischer Wert erscheint dann auf der Magic-Link-Seite.
- [x] S11.5 Sync CF9–CF14 nach OpenProject — real an WP #45 verifiziert (wert_min/real/max als Zahl, konfidenz/datenlage/fehlerkosten als custom_option-Link).
- [x] S11.6 Eingangskorb: Spalte „Wert real".

### Phase 12 — KI-Anreicherung + Einwilligung (Konzept 4.6)

- [x] S12.1 Zweistufige Einwilligung: `KiEinwilligungSchalter` (Schalter = Stufe A, Dialog = Stufe B mit Wortlaut aus 4.6), Absenden-Button zeigt den Zustand. `KI_HINWEIS_VERSION` als Versionskennung; serverseitig geprüft (`pruefeEinwilligung`), Speicherung mit Zeitstempel + Version.
- [x] S12.2 Filterschicht `filtereNutzlast()` — nur freigegebene Felder, keine Identitätsfelder (unit-getestet). `verarbeiteAnreicherung` prüft die Einwilligung vor jeder Ausführung erneut; Status WARTEND/OK/FEHLER/UEBERSPRUNGEN; Job `/api/jobs/ki-enrichment` holt Wartende nach.
- [x] S12.3 `AiTransferLog` — Anbieter, Modell, Feldnamen-Liste, Hinweis-Version, Ergebnis; ohne Inhalt.
- [x] S12.4 Anbieter-Abstraktion `getKiProvider()` — `KI_PROVIDER` = `""` (aus) / `mock` (Tests) / `openai-compatible` (EU-Endpunkt via `KI_BASE_URL`/`KI_API_KEY`). Ergebnis: Titelvorschlag, Kategorisierung (festes Schema), erkannte Systeme. Konkreter Produktivanbieter noch zu wählen (AV-Vertrag, keine Trainingsnutzung).
- [x] S12.8 Zwei-Stufen-Freigabe: (1) `KI_PROVIDER` global, (2) `Tenant.kiAktiviert` pro Kunde (Adminbereich, Standard aus). Der Schalter erscheint nur, wenn beides gesetzt ist — serverseitig in `pruefeEinwilligung` durchgesetzt. **Aktuell überall aus** (KI wird erst bei Kundenwunsch aktiviert).
- [x] S12.5 Ähnlichkeitsprüfung `findeAehnliche()` — läuft rein lokal (Token-Jaccard), unabhängig von der Einwilligung; im Admin-Panel als „drei Kolleginnen haben etwas Ähnliches gemeldet". Später durch lokales Embedding-Modell ersetzbar.
- [x] S12.6 Widerruf `widerrufeEinwilligung()` — löscht `AiEnrichment`, setzt `kiEinwilligungWiderrufenAm`, Einreichung + `AiTransferLog` bleiben. Button auf der Magic-Link-Seite.
- [x] S12.7 Admin-Review-Panel: Titelvorschlag übernehmen / als geprüft markieren (`geprueft`-Flag) / neu verarbeiten; zeigt Einwilligungsstatus, Anbieter, Ähnliche.

### Phase 13 — Portfolio-Export (Konzept 10)

- [x] S13.1 CSV-Export `/admin/export/portfolio` (`src/lib/portfolio.ts`): 26 Spalten inkl. Wertkorridor, Prozessschritt-Zähler (gesamt / Wartezeit / Entscheidung), OpenProject-Status. UTF-8 mit BOM + Semikolon für Excel; respektiert die Eingangskorb-Filter (Kunde/Status). Link im Eingangskorb.

---

## Ausbaustufe 3 — Kundenerlebnis (Konzept Abschnitt 10)

### Phase 14 — Kunden-Portfolio-Sicht

- [x] S14.1 `/[tenant]/uebersicht`: read-only Portfolio des Kunden (Token-Session), Kennzahlen (Anzahl, Potenzial gesamt, in Umsetzung), Karten mit vereinfachtem Fortschritt. Realistischer Bewertungswert nur bei `tenant.zeigtBewertung` + Reifegrad BEWERTET. Verlinkt vom Formular und der Danke-Seite.

### Phase 15 — Priorisierungsmodus für Workshops

- [x] S15.1 `PrioRunde` / `PrioStimme` (Migration `prio_runde`). Admin `/admin/prio`: Runde anlegen (Kunde, Titel, Budget je Teilnehmer, Use-Case-Auswahl), Ergebnis-Ranking mit Balken, Runde öffnen/schließen/löschen, Teilnehmer-Link.
- [x] S15.2 Teilnehmer `/p/[code]`: ohne Login, fiktives Budget (Standard 1.000 €) auf Use-Case-Karten verteilen (Stepper + Live-Restbudget), Name optional. `verteilungGueltig()` unit-getestet. Branding je Kunde.
- [x] S15.3 Auswertung `werteRundeAus()`: Summe/Anteil/Stimmenzahl je Karte, sortiert.

### Phase 16 — Branding je Kunde

- [x] Bereits umgesetzt: Logo, Akzentfarbe, „bereitgestellt von KI Partner" auf allen Einreicher- und Teilnehmer-Seiten (`EinreicherChrome`, `KiPartnerLogo`).

### Phase 17 — Kunden-Dashboard mit Ansprechpartner-Zugang (Konzept Abschnitt 3)

- [x] S17.1 `TenantKontakt`-Modell (Migration `tenant_kontakt`), `UseCase.kundenkontext`.
- [x] S17.2 Admin: Abschnitt „Ansprechpartner (Dashboard-Zugang)" auf der Kundenseite — anlegen (Name, E-Mail), persönlichen Link erzeugen/erneuern/widerrufen/löschen, Link optional direkt per E-Mail.
- [x] S17.3 `/k/[token]` → Kontakt-Session (`ucradar_kontakt`, 12 h) → `/[tenant]/dashboard`.
- [x] S17.4 `/[tenant]/dashboard` (`requireKontakt`): Portfolio mit Kennzahlen, Fortschritts-Trichter (Eingegangen → Umgesetzt), je Use Case „Kontext ergänzen" (`speichereKontext`) und Link „Prozessschritte erfassen/bearbeiten". Kontext erscheint im Admin-Detail (amber-Kasten).
- [x] S17.5 `establishKontaktZugang` setzt zusätzlich die Einreicher-Session, damit der Ansprechpartner aus Dashboard/Übersicht heraus Prozessschritte erfassen und Use Cases einreichen kann. Prozess-Link jetzt auch in `/[tenant]/uebersicht`.

### Noch offen (Ausbaustufe 3/4)

- [ ] Ausbaustufe 4: mehrere Betreuer im Adminbereich, Vorlagenbibliothek, anonymisierter Benchmark über Kunden.
- [ ] Hardening: RLS (S7.2), CSRF über Origin-Check hinaus (S7.4), Playwright-E2E (S9.3), SOPS-Secret-Datei.

---

## Reihenfolge der Umsetzung (kritischer Pfad)

1. Phase 0 + Phase 1 (Gerüst, Schema, Seed)
2. Phase 2 (Berechnung, testgetrieben)
3. Phase 3 (Einreicher-Formular end-to-end bis DB)
4. Phase 5.1–5.4 (Admin-Login + Eingangskorb, damit Einreichungen sichtbar werden)
5. Phase 5.7 (Mandantenverwaltung — Token echt generieren statt Seed)
6. Phase 6 (OpenProject-Sync)
7. Phase 4 (Magic Link)
8. Phase 7 / 8 / 9 (Härtung, Betrieb, Tests)

---

## Offene Punkte aus dem Konzept, die die Umsetzung berühren

- Rechtsgrundlage KI-Einwilligung (Abschnitt 9) — für Stufe 1 irrelevant, da keine externe Verarbeitung.
- Anonyme Einreichung als Standard vs. Ausnahme (Offene Entscheidung 1) → Umsetzung: Name optional, Feld leer vorbelegt.
- Sichtbarkeit der Bewertung für Kunden (Offene Entscheidung 2) → erst Stufe 3 relevant.
- Stundensatz je Kunde vs. pauschal (Offene Entscheidung 4) → `stundensatz_default` auf Tenant, überschreibbar in Stufe 3.
