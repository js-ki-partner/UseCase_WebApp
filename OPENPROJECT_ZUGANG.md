# OpenProject-Zugang für diese App

Diese Datei beschreibt, wie diese App (Use-Case-Erfassung, siehe
`konzept-use-case-erfassungg.md`) die beiden Werte erhält, die sie für die
OpenProject-API braucht: `OP_BASE_URL` und `OP_API_KEY`. Sie liegt im
Root-Verzeichnis dieses Repos, damit Claude Code sie automatisch als Kontext
liest.

Sie ergänzt `DEPLOYMENT.md` (falls dieses Repo eine eigene Kopie davon hat)
um die App-spezifischen Details der OpenProject-Anbindung. Falls
`DEPLOYMENT.md` hier fehlt, gilt trotzdem: **dasselbe SOPS-plus-age-Prinzip**
wie in allen anderen KI-Partner-Projekten auf diesem VPS.

## Grundprinzip

- `OP_API_KEY` ist ein Secret (Admin-API-Token von OpenProject) und liegt
  **niemals im Klartext** im Repo, im Chat oder in einem Log.
- Beide Werte liegen verschlüsselt in `secrets.enc.yaml` (SOPS + age) im
  Stack-Verzeichnis dieser App auf dem Server, z. B.
  `/opt/stacks/<app-name>/secrets.enc.yaml`.
- Jens trägt beide Werte selbst über `sops secrets.enc.yaml` ein — Claude
  Code fragt danach, gibt sie aber niemals als Klartext-Parameter vor.
- Claude Code darf die Werte zur **Laufzeit** entschlüsseln und verwenden
  (z. B. beim Deploy, für `.env`, für Testaufrufe gegen die API), aber
  **nie den entschlüsselten Inhalt in eine Chat-Antwort, einen Commit oder
  eine Log-Ausgabe schreiben.**

## Werte, die benötigt werden

| Schlüssel | Bedeutung |
|---|---|
| `OP_BASE_URL` | `https://openproject.ki-partner.tech` |
| `OP_API_KEY` | Admin-API-Token, HTTP Basic Auth mit Benutzername `apikey` |

Falls `OP_API_KEY` in der `secrets.enc.yaml` dieser App noch fehlt: Jens
öffnet auf dem Server `sops secrets.enc.yaml` im Stack-Verzeichnis der App
und trägt den Wert ein (identisch mit dem Token, das bereits unter
`/opt/stacks/openproject/secrets.enc.yaml` liegt, oder ein neu erzeugtes
Token für einen dedizierten API-User — Entscheidung liegt bei Jens).

## Warum `sudo` nötig ist (und wieso hier nichts neu eingerichtet werden muss)

Der private age-Key liegt unter `/etc/sops/age-key.txt`, `root:root`,
`chmod 600` — der `deploy`-User kann ihn nicht direkt lesen. Auf diesem
Server existiert dafür bereits eine **user-weite** (nicht app-gebundene)
Sudoers-Regel:

```
# /etc/sudoers.d/deploy-sops
Defaults:deploy env_keep += "SOPS_AGE_KEY_FILE"
deploy ALL=(root) NOPASSWD: /usr/local/bin/sops
```

Das wurde beim OpenProject-Deploy einmalig pro Server eingerichtet und gilt
für **jedes** Stack-Verzeichnis, in dem `deploy` `sops` aufruft — auch für
diese App. **Claude Code soll hier keine neue Sudoers-Regel anlegen**, nur
den Aufruf unten aus dem eigenen Stack-Verzeichnis heraus verwenden.
Voraussetzung ist lediglich, dass die `.sops.yaml` dieser App denselben
age-Public-Key referenziert wie beim OpenProject-Stack
(`age1ar2kraf9y4pqffcum36vp8exa92a08kl9zeznjln9p9nltedhqmsh5t8pl`), damit
derselbe private Key auf dem Server passt.

## Standard-Ablauf zur Laufzeit (das, was Claude Code ausführt)

```bash
cd /opt/stacks/<app-name>
SOPS_AGE_KEY_FILE=/etc/sops/age-key.txt sudo /usr/local/bin/sops -d --output-type dotenv secrets.enc.yaml > .env
chmod 600 .env
docker compose up -d
```

Wichtig: `--output-type dotenv` erzwingen, sonst gibt `sops -d` YAML
(`KEY: value`) statt `KEY=value` aus und die App liest die Variablen nicht
korrekt ein (dieser Fehler ist beim OpenProject-Deploy selbst schon einmal
passiert).

Die App liest `OP_BASE_URL` und `OP_API_KEY` ausschließlich aus
Umgebungsvariablen (`process.env.OP_API_KEY` o. ä.), nie hartkodiert im
Quellcode.

## Regeln für Claude Code in diesem Projekt

1. Niemals den Inhalt von `.env` oder den entschlüsselten Wert von
   `OP_API_KEY` in eine Chat-Antwort, einen Commit-Kommentar oder eine
   Log-Ausgabe schreiben.
2. Für Testaufrufe gegen die OpenProject-API die Werte serverseitig per
   `sops -d --output-type dotenv ... | source` in die Shell laden und den
   `curl`-Aufruf direkt darin ausführen — nicht den Wert zwischendurch
   ausgeben lassen (siehe Muster in
   `ProjectConfigs/ValuePropDemo/*.sh` im OpenProject-Repo).
3. `.env` niemals committen — Prüfung: `.gitignore` muss `.env` enthalten.
4. Der private age-Key (`/etc/sops/age-key.txt`) wird nie gelesen, kopiert,
   angezeigt oder in eine Antwort übernommen.
5. Instanzspezifische IDs (Typ, Stati, Custom Fields, Custom Options) sind
   **kein** Secret und liegen unverschlüsselt in
   `openproject-mapping.json` — diese Datei aus dem OpenProject-Repo
   (`ProjectConfigs/ValuePropDemo/openproject-mapping.json`) in dieses
   Projekt übernehmen und bei jeder Änderung der OpenProject-Struktur neu
   abgleichen.
6. Authentifizierung an der OpenProject-API: HTTP Basic Auth, Benutzername
   `apikey`, Passwort der Wert von `OP_API_KEY`.

## Bezug zum Runbook

Die vollständige OpenProject-Struktur (Custom Fields, Typ, Stati, Workflow)
und die API-Konventionen (Idempotenz über `UC-UUID`, `lockVersion`-Handling,
Beschreibungs-Aufbau mit „## Problem" / „## Wunschergebnis" /
„## Prozessschritte") sind im separaten Dokument
*Runbook: OpenProject für die Use-Case-Erfassung* beschrieben
(`ProjectConfigs/ValuePropDemo/openproject-usecase-runbook.md` im
OpenProject-Repo). Diese Datei hier regelt nur die Zugangsdaten, nicht die
fachliche Anlage-Logik.
