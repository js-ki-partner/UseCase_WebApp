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
# deploy darf den age-Key nur ueber sudo lesen (siehe OPENPROJECT_ZUGANG.md).
# --output-type dotenv erzwingen, sonst KEY: value statt KEY=value (siehe DEPLOYMENT.md)
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/sops/age-key.txt}"
sudo /usr/local/bin/sops -d --output-type dotenv secrets.enc.yaml > .env
chmod 600 .env

echo "==> Mapping-Datei pruefen"
test -f openproject-mapping.json || { echo "openproject-mapping.json fehlt"; exit 1; }

echo "==> Bauen und starten (inkl. prisma migrate deploy im Entrypoint)"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Healthcheck"
sleep 5
curl -fsS http://127.0.0.1:3005/api/health && echo " OK"

echo "==> Fertig. Vorherige Version: $PREV (fuer Rollback in .deploy-previous-ref)"
