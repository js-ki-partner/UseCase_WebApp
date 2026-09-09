# Abnahme-Checkliste — Ausbaustufe 1

Gegen das Zielbild aus [UMSETZUNGSPLAN.md](UMSETZUNGSPLAN.md) / Konzept Abschnitt 10.
Stand: 8. September 2026. `[x]` erfüllt und geprüft · `[~]` erfüllt, Prüfung offen · `[ ]` offen.

## Einreicher

- [x] Kundenspezifische URL mit Token öffnet das Formular ohne Konto (`/{slug}?t=…`).
- [x] Token wird gegen Hash + Ablauf geprüft; ungültig → neutrale Seite „Zugang nicht möglich".
- [x] Token landet in einem HttpOnly-Cookie, `?t=` verschwindet aus der Adresszeile.
- [x] Stufe-1-Formular: fünf Felder gemäß Konzept 4.2, Dauer-Schnellauswahl 5/15/30/60/120.
- [x] Live-Hochrechnung erscheint, sobald Frequenz + Dauer + Anzahl gesetzt sind.
- [x] Potenzial wird beim Absenden serverseitig neu berechnet (Client-Wert wird ignoriert).
- [x] Name/E-Mail optional; „anonym einreichen" ohne versteckte Zuordnung.
- [x] Danke-Seite zeigt das Potenzial und den Hinweis auf spätere Ergänzung.
- [x] KI-Schalter sichtbar, aber deaktiviert — kein Code-Pfad zu externen Diensten.
- [x] Branding: Kundenname/-logo oben, „bereitgestellt von KI Partner" unten, Akzentfarbe je Kunde.
- [x] Rate-Limit gegen Massen-Einreichungen (10 / 10 min / IP+Kunde).

## Rückkehr zum Entwurf

- [x] Bei Einreichung mit E-Mail wird ein Magic-Link verschickt (ohne SMTP: Konsolen-Log).
- [x] `/r/{token}` öffnet den vorbelegten Entwurf; abgelaufen/ungültig → Hinweisseite.
- [x] Änderungen werden gespeichert, Potenzial neu berechnet.

## Adminbereich

- [x] Login mit E-Mail + Passwort, danach TOTP-Pflicht (Einrichtung beim ersten Login).
- [x] Alle `/admin/*`-Seiten ohne gültige Session → Redirect auf Login.
- [x] Eingangskorb listet alle Kunden, Filter nach Kunde/Status, Sortierung nach Potenzial.
- [x] Detailansicht: alle Felder, Potenzial, Bearbeiten von Titel/Status/interner Notiz.
- [x] Duplikate: einem führenden Eintrag unterordnen, Markierung aufhebbar.
- [x] „Nach OpenProject übertragen" mit Erfolgs-/Fehlermeldung; Fehler bleibt sichtbar, Retry möglich.
- [x] Audit-Protokoll (`/admin/audit`): Login, Token-Rotation, Einreichung, Sync.
- [x] Login-Rate-Limit (8 / 10 min / IP).

## Mandantenverwaltung

- [x] Eigene Seite „Neuen Kunden anlegen" (`/admin/tenants/neu`): Slug, Name, OpenProject-Projekt, Stundensatz, Logo-URL, Akzentfarbe.
- [x] OpenProject-Projekt per Dropdown wählbar (Liste aus der API); ohne API automatischer Rückfall auf Freitextfeld.
- [x] Zugangslink beim Anlegen optional gleich miterzeugen — Link danach einmalig im Erfolgs-Panel sichtbar.
- [x] Auf der Kundenseite: Zugangslink erzeugen/erneuern (Klartext + Link einmalig, nur Hash gespeichert), widerrufen, Ablauf in Tagen.
- [x] Kundenliste zeigt OpenProject-Projekt und Zugangslink-Status je Kunde.

## OpenProject-Integration

- [x] Einseitiger Sync: Anwendung schreibt, Bearbeitungsstatus wird nicht zurückgeschrieben.
- [x] Idempotenz über UUID-Custom-Field (Filter vor Anlage, sonst PATCH mit `lockVersion`).
- [x] Beschreibung als Markdown: `## Problem` / `## Wunschergebnis` (entfällt leer) / `## Prozessschritte`.
- [x] Custom-Field-/Options-IDs in `openproject-mapping.json`, nicht im Code.
- [x] Einwilligungsstatus Bool → dreiwertige Liste.
- [x] Realer Sync gegen `openproject.ki-partner.tech` (Projekt „Use Cases – ValuePropDemo"): WP #45/#46 angelegt + idempotent aktualisiert, alle Custom Fields verifiziert.
- [x] Status-Rücklesen (`/api/jobs/op-status` + Admin-Buttons) und vereinfachte Fortschrittsanzeige beim Kunden auf der Magic-Link-Seite („Eingegangen" / „In Prüfung" / …).
- [x] Bewertungsblock (Stufe 2): K.-o.-Fragen + Wertkorridor im Admin, `reifegrad = BEWERTET`, Sync CF9–CF14 nach OpenProject, Tenant-Schalter für Kundensichtbarkeit.

## Mandantentrennung & Betrieb

- [x] Zentrale Zugriffsschicht `tenantDb(id)` erzwingt `tenant_id` in jeder Einreicher-Abfrage.
- [ ] Postgres Row Level Security (S7.2).
- [x] Sicherheits-Header inkl. enger CSP (`next.config.ts`); HSTS über Caddy.
- [ ] CSRF-Härtung über den Origin-Check von Server Actions hinaus (S7.4).
- [x] `Dockerfile` (standalone) + `docker-compose.prod.yml` + Caddyfile-Snippet.
- [x] `deploy.sh` / `rollback.sh` / `backup.sh` (je ein Kommando).
- [x] `/api/health` prüft die DB.
- [ ] SOPS-verschlüsselte `.env.prod.sops.yaml` anlegen (`.env.prod.example` als Vorlage).
- [~] Restore-Lauf einmal proben (Prozedur in DEPLOYMENT.md dokumentiert).

## Tests

- [x] Unit: Potenzialrechnung inkl. Anhang-Beispiel, Markdown-Renderer, Systemaggregation, Einwilligungs-Mapping (13 grün).
- [~] Integration: Einreichung → DB → Admin-Sichtbarkeit → Magic-Link → Admin-Login/2FA per HTTP durchgespielt.
- [ ] E2E mit Playwright (S9.3).

## Vor dem ersten Produktivkunden (aus Konzept Abschnitt 9)

- [ ] Auftragsverarbeitungsvertrag je Kunde vorbereitet.
- [ ] Rechtsgrundlage/Betriebsrat-Kommunikation geklärt (für Stufe 1 ohne externe KI unkritisch).
- [ ] Aufbewahrungsfrist für nicht weiterverfolgte Einreichungen + Löschjob.
- [ ] Löschworkflow „alle Daten eines Kunden inkl. OpenProject-Seite".
