#!/usr/bin/env bash
# Taegliches Datenbank-Backup, 7 Tage Vorhaltung (Konzept Abschnitt 8).
# Per Cron: 0 3 * * *  /pfad/zum/repo/scripts/backup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${UCRADAR_BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/ucradar-$STAMP.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-ucradar}" "${POSTGRES_DB:-ucradar}" | gzip > "$OUT"

echo "==> Backup geschrieben: $OUT"

# Alte Backups (aelter als 7 Tage) entfernen
find "$BACKUP_DIR" -name 'ucradar-*.sql.gz' -mtime +7 -delete
echo "==> Alte Backups (>7 Tage) entfernt"
