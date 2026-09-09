#!/bin/sh
set -e

# Migrationen anwenden, bevor der Server startet (Konzept Abschnitt 8:
# ein Kommando, nachvollziehbares Log).
echo "[entrypoint] prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy

exec "$@"
