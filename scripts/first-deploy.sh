#!/usr/bin/env bash
# Erstinbetriebnahme von UC-Radar auf dem VPS. Auf dem Server ausfuehren, NICHT lokal.
#
#   sudo mkdir -p /opt/stacks/ucradar && sudo chown "$USER" /opt/stacks/ucradar
#   cd /opt/stacks/ucradar
#   git clone https://github.com/js-ki-partner/UseCase_WebApp.git .
#   ./scripts/first-deploy.sh
#
# Voraussetzung (einmalig pro Server, siehe DEPLOYMENT.md "Einmalige Einrichtung
# pro Server"): age installiert, /etc/sops/age-key.txt vorhanden (chmod 600),
# SOPS_AGE_KEY_FILE gesetzt.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v sops >/dev/null || { echo "sops fehlt."; exit 1; }
test -f /etc/sops/age-key.txt || { echo "/etc/sops/age-key.txt fehlt (siehe DEPLOYMENT.md)."; exit 1; }

# --- .sops.yaml ---
if [ ! -f .sops.yaml ]; then
  PUB="$(grep -oE 'age1[0-9a-z]+' /etc/sops/age-key.txt | head -1)"
  [ -n "$PUB" ] || { echo "Kein age-Public-Key in /etc/sops/age-key.txt."; exit 1; }
  printf 'creation_rules:\n  - path_regex: secrets\\.enc\\.yaml$\n    age: %s\n' "$PUB" > .sops.yaml
  echo "==> .sops.yaml erstellt (age: $PUB)"
fi

# --- secrets.enc.yaml anlegen (Zufallswerte generiert, 2 Werte trägt der User ein) ---
if [ ! -f secrets.enc.yaml ]; then
  TMP="$(mktemp)"; trap 'shred -u "$TMP" 2>/dev/null || rm -f "$TMP"' EXIT
  PG_PW="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)"
  cat > "$TMP" <<EOF
DATABASE_URL: postgresql://ucradar:${PG_PW}@db:5432/ucradar?schema=public
APP_BASE_URL: https://ideen.ki-partner.tech
SESSION_SECRET: $(openssl rand -base64 36)
TOKEN_HASH_SECRET: $(openssl rand -base64 36)
OP_BASE_URL: https://openproject.ki-partner.tech
OP_API_KEY: BITTE-EINTRAGEN
OP_MAPPING_FILE: ./openproject-mapping.json
SMTP_URL: BITTE-EINTRAGEN
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
  sops --encrypt --input-type yaml --output-type yaml "$TMP" > secrets.enc.yaml
  echo "==> secrets.enc.yaml erstellt. Editor öffnet: OP_API_KEY und SMTP_URL eintragen, speichern."
  sops secrets.enc.yaml
fi

if sops -d --output-type dotenv secrets.enc.yaml | grep -q 'BITTE-EINTRAGEN'; then
  echo "!! Platzhalter in secrets.enc.yaml. 'sops secrets.enc.yaml' -> Werte -> dann ./scripts/deploy.sh"
  exit 1
fi
test -f openproject-mapping.json || { echo "openproject-mapping.json fehlt"; exit 1; }

echo "==> Deploy (Build + Migrate + Start)"
sops -d --output-type dotenv secrets.enc.yaml > .env
git rev-parse HEAD > .deploy-previous-ref
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Healthcheck"; sleep 6
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"

cat <<'EOF'

Naechste Schritte:
  1. Ersten Admin anlegen:
       docker compose -f docker-compose.prod.yml exec app npm run db:seed
     Zugangsdaten stehen im Output; 2FA beim ersten Login einrichten,
     SEED_ADMIN_PASSWORT danach aendern.
  2. Caddy: Caddyfile.snippet in die Caddyfile aufnehmen, 'systemctl reload caddy'.
  3. DNS: A-Record ideen.ki-partner.tech -> VPS-IP.
  4. Weitere Deploys: ./scripts/deploy.sh
EOF
