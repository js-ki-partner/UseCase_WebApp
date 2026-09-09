#!/usr/bin/env bash
# Ein Kommando fuer den Rollback (Konzept Abschnitt 8).
# Setzt den Code auf die zuletzt deployte Version zurueck und baut neu.
# ACHTUNG: Schema-Migrationen werden nicht automatisch zurueckgerollt.
# Bei einer inkompatiblen Migration zuerst das DB-Backup einspielen (siehe DEPLOYMENT.md).
set -euo pipefail

cd "$(dirname "$0")/.."

test -f .deploy-previous-ref || { echo "Keine .deploy-previous-ref gefunden"; exit 1; }
TARGET="$(cat .deploy-previous-ref)"

echo "==> Rollback auf $TARGET"
git reset --hard "$TARGET"

sops --decrypt --output .env.prod .env.prod.sops.yaml
docker compose -f docker-compose.prod.yml up -d --build

sleep 5
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"
echo "==> Rollback abgeschlossen"
