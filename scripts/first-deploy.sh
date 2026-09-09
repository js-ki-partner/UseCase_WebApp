#!/usr/bin/env bash
# Erstinbetriebnahme von UC-Radar auf dem VPS. Auf dem Server ausfuehren, NICHT lokal.
#
#   sudo mkdir -p /opt/stacks/ucradar && sudo chown "$USER" /opt/stacks/ucradar
#   cd /opt/stacks/ucradar
#   git clone https://github.com/js-ki-partner/UseCase_WebApp.git .
#   ./scripts/first-deploy.sh
#
# Voraussetzung (einmalig pro Server, bereits beim OpenProject-Deploy erledigt,
# siehe OPENPROJECT_ZUGANG.md / DEPLOYMENT.md):
#   - age + sops installiert, /etc/sops/age-key.txt vorhanden (root:root, 600)
#   - Sudoers-Regel  deploy ALL=(root) NOPASSWD: /usr/local/bin/sops
#     mit  env_keep += "SOPS_AGE_KEY_FILE"
#   - externes Docker-Netz  proxy-net  (von der Caddy-Stack angelegt)
set -euo pipefail
cd "$(dirname "$0")/.."

# age-Public-Key des Servers (identisch mit dem OpenProject-Stack, siehe
# OPENPROJECT_ZUGANG.md). Der PRIVATE Key bleibt unter /etc/sops/age-key.txt.
AGE_PUB="age1ar2kraf9y4pqffcum36vp8exa92a08kl9zeznjln9p9nltedhqmsh5t8pl"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/sops/age-key.txt}"
SOPS="sudo /usr/local/bin/sops" # deploy darf den age-Key nur ueber sudo lesen

command -v sops >/dev/null || { echo "sops fehlt."; exit 1; }
test -e /etc/sops/age-key.txt || { echo "/etc/sops/age-key.txt fehlt (siehe OPENPROJECT_ZUGANG.md)."; exit 1; }
docker network inspect proxy-net >/dev/null 2>&1 || { echo "Docker-Netz 'proxy-net' fehlt (Caddy-Stack zuerst starten)."; exit 1; }

# --- .sops.yaml ---
if [ ! -f .sops.yaml ]; then
  printf 'creation_rules:\n  - path_regex: secrets\\.enc\\.yaml$\n    age: %s\n' "$AGE_PUB" > .sops.yaml
  echo "==> .sops.yaml erstellt (age: $AGE_PUB)"
fi

# Kaputte/leere secrets.enc.yaml aus einem abgebrochenen Lauf entfernen.
if [ -f secrets.enc.yaml ] && ! $SOPS -d --output-type dotenv secrets.enc.yaml >/dev/null 2>&1; then
  echo "==> secrets.enc.yaml ist unvollstaendig (abgebrochener Lauf) -> wird neu erzeugt."
  rm -f secrets.enc.yaml
fi

# --- secrets.enc.yaml anlegen (Zufallswerte generiert, 2 Werte traegt der User ein) ---
if [ ! -f secrets.enc.yaml ]; then
  TMP="$(mktemp)"; trap 'shred -u "$TMP" 2>/dev/null || rm -f "$TMP"' EXIT
  PG_PW="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)"

  # Die beiden echten Secrets: aus der Umgebung oder interaktiv abfragen.
  # Nichts davon wird ausgegeben oder in die History geschrieben.
  OP_KEY="${OP_API_KEY:-}"
  while [ -z "$OP_KEY" ]; do
    read -r -s -p "OpenProject OP_API_KEY (Eingabe verborgen): " OP_KEY; echo
  done
  SMTP="${SMTP_URL:-}"
  while [ -z "$SMTP" ]; do
    read -r -p "SMTP_URL (z. B. smtps://user:pass@mail.host:465): " SMTP
  done

  umask 077
  cat > "$TMP" <<EOF
DATABASE_URL: postgresql://ucradar:${PG_PW}@db:5432/ucradar?schema=public
APP_BASE_URL: https://ideen.ki-partner.tech
SESSION_SECRET: $(openssl rand -base64 36)
TOKEN_HASH_SECRET: $(openssl rand -base64 36)
OP_BASE_URL: https://openproject.ki-partner.tech
OP_API_KEY: ${OP_KEY}
OP_MAPPING_FILE: ./openproject-mapping.json
SMTP_URL: ${SMTP}
MAIL_FROM: UC-Radar <ideen@ki-partner.tech>
JOB_TOKEN: $(openssl rand -hex 24)
KI_PROVIDER: ""
KI_BASE_URL: ""
KI_API_KEY: ""
KI_MODELL: gpt-4o-mini
KI_ANBIETER_NAMEN: OpenAI oder Google AI
POSTGRES_USER: ucradar
POSTGRES_PASSWORD: ${PG_PW}
POSTGRES_DB: ucradar
EOF
  unset OP_KEY SMTP
  # An der Ziel-Pfad verschluesseln: nur so greift die creation_rule aus
  # .sops.yaml (path_regex endet auf secrets.enc.yaml). Kurzzeitig liegt hier
  # Klartext (umask 077 -> Modus 600), dann in-place verschluesselt.
  cp "$TMP" secrets.enc.yaml
  if ! $SOPS --encrypt --in-place secrets.enc.yaml; then
    shred -u secrets.enc.yaml 2>/dev/null || rm -f secrets.enc.yaml
    echo "sops --encrypt fehlgeschlagen."; exit 1
  fi
  sudo chown "$USER:$(id -gn)" secrets.enc.yaml .sops.yaml
  echo "==> secrets.enc.yaml erstellt (verschluesselt). Aendern spaeter mit:"
  echo "    SOPS_AGE_KEY_FILE=/etc/sops/age-key.txt sudo /usr/local/bin/sops secrets.enc.yaml"
fi

if $SOPS -d --output-type dotenv secrets.enc.yaml | grep -q 'BITTE-EINTRAGEN'; then
  echo "!! Platzhalter in secrets.enc.yaml. 'sudo /usr/local/bin/sops secrets.enc.yaml' -> Werte -> dann ./scripts/deploy.sh"
  exit 1
fi
test -f openproject-mapping.json || { echo "openproject-mapping.json fehlt"; exit 1; }

echo "==> Deploy (Build + Migrate + Start)"
$SOPS -d --output-type dotenv secrets.enc.yaml > .env
chmod 600 .env
git rev-parse HEAD > .deploy-previous-ref
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Healthcheck"; sleep 8
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"

cat <<'EOF'

Naechste Schritte:
  1. Ersten Admin anlegen (E-Mail/Name anpassen; ohne ADMIN_PASSWORT wird eins
     erzeugt und einmalig ausgegeben):
       docker compose -f docker-compose.prod.yml exec \
         -e ADMIN_EMAIL=jens.schmidt@ki-partner.tech -e "ADMIN_NAME=Jens Schmidt" \
         app npm run db:admin
     2FA wird beim ersten Login eingerichtet.
  2. Caddy: Block aus Caddyfile.snippet in /opt/stacks/caddy/Caddyfile aufnehmen,
     dann neu laden:
       docker compose -f /opt/stacks/caddy/docker-compose.yml exec caddy \
         caddy reload --config /etc/caddy/Caddyfile
  3. DNS: A-Record ideen.ki-partner.tech -> VPS-IP (falls noch nicht gesetzt).
  4. Weitere Deploys: ./scripts/deploy.sh
EOF
