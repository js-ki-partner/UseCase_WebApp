#!/usr/bin/env bash
# Ein Kommando fuer den Deploy (Konzept Abschnitt 8).
# Aufruf auf dem VPS im Repo-Verzeichnis:  ./scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Code aktualisieren"
git fetch --all
PREV="$(git rev-parse HEAD)"
git reset --hard origin/main
echo "$PREV" > .deploy-previous-ref

echo "==> Secrets entschluesseln (SOPS + age)"
sops --decrypt --output .env.prod .env.prod.sops.yaml

echo "==> Mapping-Datei pruefen"
test -f openproject-mapping.json || { echo "openproject-mapping.json fehlt"; exit 1; }

echo "==> Bauen und starten (inkl. prisma migrate deploy im Entrypoint)"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Healthcheck"
sleep 5
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"

echo "==> Fertig. Vorherige Version: $PREV (fuer Rollback in .deploy-previous-ref)"
