#!/usr/bin/env bash
# Ein Kommando fuer den Rollback (Konzept Abschnitt 8).
# Setzt den Code auf die zuletzt deployte Version zurueck und baut neu.
# ACHTUNG: Schema-Migrationen werden nicht automatisch zurueckgerollt.
# Bei einer inkompatiblen Migration zuerst das DB-Backup einspielen (siehe BETRIEB.md).
set -euo pipefail

cd "$(dirname "$0")/.."

test -f .deploy-previous-ref || { echo "Keine .deploy-previous-ref gefunden"; exit 1; }
TARGET="$(cat .deploy-previous-ref)"

echo "==> Rollback auf $TARGET"
git reset --hard "$TARGET"

export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/sops/age-key.txt}"
sudo /usr/local/bin/sops -d --output-type dotenv secrets.enc.yaml > .env
chmod 600 .env
docker compose -f docker-compose.prod.yml up -d --build

sleep 5
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"
echo "==> Rollback abgeschlossen"
