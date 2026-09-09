# Betrieb & Deployment

Zielumgebung: bestehender IONOS-VPS, neben OpenProject, hinter demselben
Caddy-Reverse-Proxy (Konzept Abschnitt 8).

## Komponenten

| Komponente | Beschreibung |
|---|---|
| `app` | Next.js-Anwendungscontainer (standalone build), lauscht intern auf `:3000`, gemappt auf `127.0.0.1:3005` |
| `db` | PostgreSQL 16 (eigene Datenbank; bei kleinem Volumen genügt das) |
| Caddy | vorhandener Reverse Proxy, terminiert TLS, proxyt auf `127.0.0.1:3005` |

## Erstmalige Einrichtung

1. Repository auf den VPS klonen.
2. `openproject-mapping.json` aus dem Runbook *OpenProject für die Use-Case-Erfassung*
   befüllen (Custom-Field-IDs, Options-IDs). Nicht im Repo — instanzspezifisch.
3. Secrets als `.env.prod.sops.yaml` anlegen (SOPS + age, wie bei OpenProject):
   - `DATABASE_URL` (auf den `db`-Container: `postgresql://ucradar:…@db:5432/ucradar`)
   - `SESSION_SECRET`, `TOKEN_HASH_SECRET` (je ≥ 32 Zeichen, `openssl rand -base64 36`)
   - `APP_BASE_URL` (z. B. `https://ideen.ki-partner.tech`)
   - `OP_BASE_URL`, `OP_API_KEY` (siehe `OPENPROJECT_ZUGANG.md`)
   - `SMTP_URL`, `MAIL_FROM`
   - `POSTGRES_PASSWORD`, ggf. `POSTGRES_USER`, `POSTGRES_DB`
4. Caddyfile-Eintrag ergänzen:

   ```
   ideen.ki-partner.tech {
       reverse_proxy 127.0.0.1:3005
   }
   ```

5. Erststart:

   ```bash
   sops --decrypt --output .env.prod .env.prod.sops.yaml
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   Der Entrypoint führt `prisma migrate deploy` aus, bevor der Server startet.

6. Ersten Admin-User anlegen (einmalig, im laufenden Container):

   ```bash
   docker compose -f docker-compose.prod.yml exec app \
     node -e "require('tsx/cjs'); require('./prisma/seed.ts')"
   ```

   Alternativ ein kleines Verwaltungsskript; der 2. Faktor wird beim ersten
   Login eingerichtet.

## Laufender Betrieb

| Aufgabe | Kommando |
|---|---|
| Deploy (Pull, Build, Migrate, Healthcheck) | `./scripts/deploy.sh` |
| Rollback auf die zuletzt deployte Version | `./scripts/rollback.sh` |
| Backup (Cron: täglich 03:00) | `./scripts/backup.sh` |
| OpenProject-Verbindung prüfen | `./scripts/op-test.sh` |
| Fortschritt aus OpenProject zurücklesen | `curl -fsS -H "Authorization: Bearer $JOB_TOKEN" http://127.0.0.1:3005/api/jobs/op-status` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Health | `curl -fsS http://127.0.0.1:3005/api/health` |

### Cron: Status-Rücklesen aus OpenProject

Der App-Status (für die vereinfachte Fortschrittsanzeige beim Kunden) wird nicht
automatisch aktualisiert. Empfohlener Cron-Eintrag (z. B. alle 30 Minuten):

```
*/30 * * * * curl -fsS -H "Authorization: Bearer <JOB_TOKEN>" https://ideen.ki-partner.tech/api/jobs/op-status > /dev/null
```

`JOB_TOKEN` liegt in `.env.prod` / `secrets.enc.yaml`. Ohne gesetztes Token gibt
der Endpunkt 503 zurück und der Rücklese-Job ist damit deaktiviert.
Manuell geht es jederzeit über den Button „Fortschritt aus OpenProject
aktualisieren" im Eingangskorb.

### KI-Anreicherung (optional, Konzept 4.6)

Standardmäßig **aus** (`KI_PROVIDER` leer) — dann findet keinerlei externe
Verarbeitung statt und der Einwilligungsschalter im Formular ist deaktiviert.

Aktivierung erfordert einen Anbieter mit EU-Endpunkt, Auftragsverarbeitungs­vertrag
und ausgeschlossener Trainingsnutzung. Dann in `.env.prod`:

```
KI_PROVIDER="openai-compatible"
KI_BASE_URL="https://<eu-endpunkt>/v1"
KI_API_KEY="..."
KI_MODELL="..."
KI_ANBIETER_NAMEN="<im Dialog genannter Anbietername>"
```

Ändern sich Anbieter oder Hinweistext, muss `KI_HINWEIS_VERSION` in
`src/lib/ki.ts` hochgezählt werden — alte Einwilligungen gelten dann nicht weiter.

Cron für die Nachverarbeitung wartender Aufträge (z. B. alle 5 Minuten):

```
*/5 * * * * curl -fsS -H "Authorization: Bearer <JOB_TOKEN>" https://ideen.ki-partner.tech/api/jobs/ki-enrichment > /dev/null
```

## Datensicherung

- `scripts/backup.sh` schreibt ein gzip-`pg_dump` nach `./backups`, Vorhaltung 7 Tage.
- **Restore proben** (vor dem ersten Produktivkunden, Konzept Abschnitt 8):

  ```bash
  gunzip -c backups/ucradar-JJJJMMTT-HHMMSS.sql.gz | \
    docker compose -f docker-compose.prod.yml exec -T db \
    psql -U ucradar -d ucradar_restore_test
  ```

## Rollback und Migrationen

`rollback.sh` setzt nur den Code zurück. Schema-Migrationen werden **nicht**
automatisch rückgängig gemacht. Enthält ein fehlgeschlagenes Deploy eine
inkompatible Migration, zuerst das Backup einspielen, dann Code-Rollback.
Migrationen daher additiv halten (Spalten hinzufügen statt umbenennen).

## Offene Betriebspunkte (vor Produktivgang)

- Auftragsverarbeitungsvertrag je Kunde vorbereiten (Konzept Abschnitt 9).
- Aufbewahrungsfrist für nicht weiterverfolgte Einreichungen festlegen und Job einrichten.
- Löschworkflow „alle Daten eines Kunden inkl. OpenProject-Seite" dokumentieren.
