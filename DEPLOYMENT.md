# Deployment & Secrets-Verwaltung (IONOS VPS)

Diese Datei beschreibt die verbindliche Vorgehensweise für Deployment und
Secrets-Handling auf dem IONOS VPS. Sie liegt in jedem Projekt-Repo im
Root-Verzeichnis, damit Claude Code sie automatisch als Kontext liest und
sich bei jedem Deploy an dieselbe Vorgehensweise hält.

## Grundprinzip

- Secrets liegen **niemals im Klartext** im Repo oder im Chat.
- Secrets werden mit **SOPS (Secrets OPerationS)** und **age** verschlüsselt
  im Repo versioniert (`secrets.enc.yaml`).
- Entschlüsselung erfolgt **ausschließlich auf dem VPS** mit einem privaten
  age-Key, der nie das Terminal des Servers verlässt und nie in einen Chat
  eingefügt wird.
- Claude Code darf verschlüsselte Dateien lesen, bearbeiten (neue
  verschlüsselte Werte hinzufügen) und Deploy-Befehle ausführen — es sieht
  dabei nur Chiffretext, nie den entschlüsselten Inhalt.

## Verzeichnisstruktur (pro App)

```
/opt/stacks/<app-name>/
  docker-compose.yml
  Caddyfile.snippet        # Route für Caddy (falls eigenständig)
  secrets.enc.yaml         # verschlüsselt, darf ins Git-Repo
  .sops.yaml               # SOPS-Konfiguration (welcher age-Key gilt)
  .env                     # wird bei Deploy generiert, NICHT versionieren
```

`.env` gehört in `.gitignore` — sie entsteht erst zur Laufzeit aus
`secrets.enc.yaml`.

## Einmalige Einrichtung pro Server (nicht pro Projekt)

Diese Schritte führst **du selbst per SSH** aus, nicht Claude im Chat:

```bash
# 1. age installieren
sudo apt install age

# 2. Schlüsselpaar erzeugen
age-keygen -o /etc/sops/age-key.txt

# 3. Rechte einschränken
sudo chown root:root /etc/sops/age-key.txt
sudo chmod 600 /etc/sops/age-key.txt
```

Der Public Key wird beim Erzeugen ausgegeben (Zeile beginnt mit
`# public key: age1...`). Diesen Public Key notierst du dir — er kommt in
jede `.sops.yaml` der einzelnen Projekte. Der **private** Key bleibt
dauerhaft unter `/etc/sops/age-key.txt` und wird von dort nie kopiert,
verschickt oder in einen Chat eingefügt.

SOPS muss außerdem wissen, wo der private Key liegt (systemweit, gilt für
alle Projekte):

```bash
echo 'export SOPS_AGE_KEY_FILE=/etc/sops/age-key.txt' | sudo tee -a /etc/profile.d/sops.sh
```

## Einmalige Einrichtung pro Projekt

```bash
# .sops.yaml im Projektverzeichnis
cat > .sops.yaml <<'EOF'
creation_rules:
  - path_regex: secrets\.enc\.yaml$
    age: age1DEIN_PUBLIC_KEY_HIER
EOF
```

Secrets-Datei anlegen und verschlüsseln:

```bash
sops secrets.enc.yaml
```

Das öffnet einen Editor mit einer YAML-Vorlage, z. B.:

```yaml
POSTGRES_PASSWORD: hier-echtes-passwort-eintragen
API_KEY: hier-echten-key-eintragen
```

Beim Speichern verschlüsselt SOPS die Datei automatisch. Das Ergebnis
(`secrets.enc.yaml`) ist Chiffretext und darf bedenkenlos ins Git-Repo.

## Standard-Deploy-Ablauf (das, was Claude Code ausführt)

```bash
cd /opt/stacks/<app-name>
sops -d --output-type dotenv secrets.enc.yaml > .env
docker compose up -d
```

> Auf diesem Server liegt der age-Key `root:root 600`; der `deploy`-User ruft
> `sops` über die vorhandene Sudoers-Regel auf:
> `SOPS_AGE_KEY_FILE=/etc/sops/age-key.txt sudo /usr/local/bin/sops -d --output-type dotenv secrets.enc.yaml > .env`
> — Details in [OPENPROJECT_ZUGANG.md](OPENPROJECT_ZUGANG.md). Die Skripte in
> `scripts/` machen das bereits so.

`--output-type dotenv` erzwingen: sonst gibt `sops -d` YAML (`KEY: value`) statt
`KEY=value` aus und `env_file` liest die Variablen nicht (dieser Fehler ist beim
OpenProject-Deploy schon einmal passiert — siehe `OPENPROJECT_ZUGANG.md`).

Diesen Dreizeiler kann Claude Code bei jedem Deploy identisch ausführen.
Es sieht dabei nur den Befehl und den Erfolg/Fehler-Output, nicht den
Inhalt von `.env`.

## Secret aktualisieren oder ergänzen

```bash
sops secrets.enc.yaml
```

Öffnet die Datei entschlüsselt im lokalen Editor (nur auf dem Server, wo
der private Key liegt), Änderung eintragen, speichern → automatisch neu
verschlüsselt.

## Regeln für Claude Code in diesem Projekt

1. Niemals den Inhalt von `.env` oder entschlüsselten Secrets in eine
   Chat-Antwort, einen Commit-Kommentar oder eine Log-Ausgabe schreiben.
2. Neue Secrets immer über `sops secrets.enc.yaml` einfügen lassen (User
   trägt den Wert selbst ein), nie als Klartext-Parameter übergeben.
3. `.env` niemals committen — Prüfung: `.gitignore` muss `.env` enthalten.
4. Der private age-Key (`/etc/sops/age-key.txt`) wird nie gelesen, kopiert,
   angezeigt oder in eine Antwort übernommen.
5. Vor jedem `docker compose up -d`: prüfen, ob `secrets.enc.yaml` neuer
   ist als die zuletzt generierte `.env`, ggf. neu entschlüsseln.

## Backup des privaten Keys

Der private Key existiert nur einmal auf dem Server. Ohne ihn sind alle
`secrets.enc.yaml`-Dateien aller Projekte unwiederbringlich verloren.
Empfehlung: `/etc/sops/age-key.txt` verschlüsselt (z. B. mit einem
Passwort-Manager wie 1Password/Bitwarden als sicherer Notiz) außerhalb des
Servers sichern — nicht per Chat, nicht per E-Mail, sondern per direktem
Kopiervorgang über eine gesicherte Verbindung (z. B. `scp` auf deinen
lokalen Rechner, dort sofort in den Passwort-Manager, lokale Kopie danach
löschen).

---

## App-spezifisch: UC-Radar

Die konkreten Komponenten, benötigten Secrets, Cron-Jobs, die KI-Anreicherung
und das Restore-Verfahren für **diese** App stehen in [BETRIEB.md](BETRIEB.md).
