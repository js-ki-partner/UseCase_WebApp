# Betrieb — UC-Radar

App-spezifische Ergänzung zu [DEPLOYMENT.md](DEPLOYMENT.md) (dort das
verbindliche SOPS-/age-Prinzip). Stack-Verzeichnis auf dem VPS:
`/opt/stacks/ucradar/`.

## Komponenten

| Komponente | Beschreibung |
|---|---|
| `app` | Next.js-Anwendungscontainer (`npm run start`), intern `:3000`, Netz-Alias `ucradar` im Netz `proxy-net`; `127.0.0.1:3005` nur fuer Healthcheck/Debug |
| `db` | PostgreSQL 16, nur im internen `default`-Netz |
| Caddy | eigener Container-Stack unter `/opt/stacks/caddy/`, im Netz `proxy-net`, terminiert TLS, proxyt auf `ucradar:3000` |

Caddyfile-Eintrag (`/opt/stacks/caddy/Caddyfile`, Vorlage: [Caddyfile.snippet](Caddyfile.snippet)):

```
ideen.ki-partner.tech {
    reverse_proxy ucradar:3000
}
```

Neu laden nach der Aenderung:

```bash
docker compose -f /opt/stacks/caddy/docker-compose.yml exec caddy \
  caddy reload --config /etc/caddy/Caddyfile
```

## Secrets (`secrets.enc.yaml`)

Vorlage: [secrets.example.yaml](secrets.example.yaml). Der `deploy`-User kann
den age-Key nur über `sudo` lesen (siehe [OPENPROJECT_ZUGANG.md](OPENPROJECT_ZUGANG.md)),
daher immer:

```bash
SOPS_AGE_KEY_FILE=/etc/sops/age-key.txt sudo /usr/local/bin/sops secrets.enc.yaml
```

| Schlüssel | Zweck |
|---|---|
| `DATABASE_URL` | `postgresql://ucradar:<pw>@db:5432/ucradar?schema=public` |
| `SESSION_SECRET`, `TOKEN_HASH_SECRET` | je ≥ 32 Zeichen (`openssl rand -base64 36`) |
| `APP_BASE_URL` | `https://ideen.ki-partner.tech` |
| `OP_BASE_URL`, `OP_API_KEY` | OpenProject-Zugang (siehe `OPENPROJECT_ZUGANG.md`) |
| `OP_MAPPING_FILE` | `./openproject-mapping.json` |
| `SMTP_URL`, `MAIL_FROM` | Magic-Link- und Ansprechpartner-Mails |
| `JOB_TOKEN` | Bearer-Token für `/api/jobs/*` (Cron). Leer ⇒ Jobs deaktiviert |
| `KI_PROVIDER` (+ `KI_BASE_URL`, `KI_API_KEY`, `KI_MODELL`, `KI_ANBIETER_NAMEN`) | KI-Anreicherung, siehe unten. Standard: leer = aus |
| `POSTGRES_PASSWORD` (ggf. `POSTGRES_USER`, `POSTGRES_DB`) | nur für den `db`-Service |

`openproject-mapping.json` (instanzspezifische IDs, keine Geheimnisse) liegt im
Repo — bei Strukturänderungen in OpenProject abgleichen.

## Erstinbetriebnahme

Voraussetzungen (beim OpenProject-Deploy bereits erledigt): age-Key auf dem
Server (`/etc/sops/age-key.txt`), Sudoers-Regel für `deploy` + `sops`
(siehe [OPENPROJECT_ZUGANG.md](OPENPROJECT_ZUGANG.md)), Docker-Netz `proxy-net`
läuft (Caddy-Stack).

```bash
sudo mkdir -p /opt/stacks/ucradar && sudo chown "$USER" /opt/stacks/ucradar
cd /opt/stacks/ucradar
git clone https://github.com/js-ki-partner/UseCase_WebApp.git .
./scripts/first-deploy.sh
```

`first-deploy.sh` erzeugt `.sops.yaml` (mit dem bekannten age-Public-Key des
Servers) und `secrets.enc.yaml` (Zufallswerte für `SESSION_SECRET`,
`TOKEN_HASH_SECRET`, `JOB_TOKEN`, `POSTGRES_PASSWORD` werden generiert), fragt
`OP_API_KEY` (verborgen) und `SMTP_URL` interaktiv ab — alternativ vorher als
Umgebungsvariablen setzen —, baut, migriert und startet. Der Entrypoint führt
`prisma migrate deploy` aus.

Danach:

```bash
# 1. ersten Admin anlegen (2. Faktor beim ersten Login).
#    Ohne ADMIN_PASSWORT wird ein Zufallspasswort erzeugt und einmalig ausgegeben.
docker compose -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL=jens.schmidt@ki-partner.tech -e "ADMIN_NAME=Jens Schmidt" \
  app npm run db:admin

# 2. Caddy: Block aus Caddyfile.snippet in /opt/stacks/caddy/Caddyfile aufnehmen,
#    dann neu laden:
docker compose -f /opt/stacks/caddy/docker-compose.yml exec caddy \
  caddy reload --config /etc/caddy/Caddyfile
```

DNS: A-Record `ideen.ki-partner.tech` → VPS-IP.

## Laufender Betrieb

| Aufgabe | Kommando |
|---|---|
| Erstinbetriebnahme | `./scripts/first-deploy.sh` |
| Deploy (danach) | `./scripts/deploy.sh` |
| Rollback (Code) | `./scripts/rollback.sh` |
| Backup (Cron 03:00) | `./scripts/backup.sh` |
| OpenProject-Verbindung prüfen | `./scripts/op-test.sh` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Health | `curl -fsS http://127.0.0.1:3005/api/health` |

### Cron-Jobs

```
# Fortschritt aus OpenProject zurücklesen (alle 30 min)
*/30 * * * * curl -fsS -H "Authorization: Bearer <JOB_TOKEN>" https://ideen.ki-partner.tech/api/jobs/op-status > /dev/null

# wartende KI-Anreicherungen abarbeiten (alle 5 min; nur nötig wenn KI aktiv)
*/5 * * * * curl -fsS -H "Authorization: Bearer <JOB_TOKEN>" https://ideen.ki-partner.tech/api/jobs/ki-enrichment > /dev/null
```

Manuell geht beides über Buttons im Adminbereich.

### KI-Anreicherung (optional, Konzept 4.6)

Standardmäßig **aus**. Die Freigabe hat zwei Stufen, damit man sie erst
aktiviert, wenn ein Kunde danach fragt:

1. **Global** — Anbieter in `secrets.enc.yaml` konfigurieren. Anbieter mit
   EU-Endpunkt, Auftragsverarbeitungsvertrag, ausgeschlossener Trainingsnutzung:

   ```yaml
   KI_PROVIDER: openai-compatible
   KI_BASE_URL: https://<eu-endpunkt>/v1
   KI_API_KEY: <key>
   KI_MODELL: <modell>
   KI_ANBIETER_NAMEN: <im Dialog genannter Anbietername>
   ```

2. **Pro Kunde** — im Adminbereich auf der Kundenseite „KI-Aufbereitung für
   diesen Kunden anbieten" aktivieren (`Tenant.kiAktiviert`).

Erst wenn beides gesetzt ist, erscheint der Einwilligungsschalter im Formular.
Die Einwilligung bleibt trotzdem pro Use Case (Konzept 4.6).

Ändern sich Anbieter oder Hinweistext, muss `KI_HINWEIS_VERSION` in
`src/lib/ki.ts` hochgezählt werden — alte Einwilligungen gelten dann nicht weiter.

## Datensicherung & Restore

`scripts/backup.sh` schreibt ein gzip-`pg_dump` nach `./backups`, Vorhaltung 7 Tage.

Restore einmal proben (vor dem ersten Produktivkunden):

```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U ucradar -c "CREATE DATABASE ucradar_restore_test;"
gunzip -c backups/ucradar-JJJJMMTT-HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U ucradar -d ucradar_restore_test
```

## Rollback und Migrationen

`rollback.sh` setzt nur den Code auf die zuletzt deployte Version zurück
(`.deploy-previous-ref`). Schema-Migrationen werden **nicht** automatisch
zurückgerollt. Bei einem Deploy mit inkompatibler Migration zuerst das Backup
einspielen, dann Code-Rollback. Migrationen additiv halten (Spalten hinzufügen
statt umbenennen).

## Offene Betriebspunkte (vor Produktivgang)

- Auftragsverarbeitungsvertrag je Kunde vorbereiten (Konzept Abschnitt 9).
- Aufbewahrungsfrist für nicht weiterverfolgte Einreichungen + Löschjob.
- Löschworkflow „alle Daten eines Kunden inkl. OpenProject-Seite" dokumentieren.
- Restore-Lauf einmal tatsächlich durchgeführt.
