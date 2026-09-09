#!/usr/bin/env bash
# Prüft die OpenProject-Verbindung, ohne den API-Key auszugeben.
#
# Quelle der Werte (in dieser Reihenfolge):
#   1. bereits gesetzte Umgebungsvariablen OP_BASE_URL / OP_API_KEY
#   2. ./.env               (lokale Entwicklung)
#   3. ./secrets.enc.yaml   (Server, via SOPS + age)
#
# Nutzung:
#   scripts/op-test.sh              # nur Verbindung + Projektanzahl
#   scripts/op-test.sh --projects   # zusätzlich die ersten Projektnamen
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${OP_API_KEY:-}" ] && [ -f .env ]; then
  # nur die beiden Zeilen laden, nichts ausgeben
  set -a
  OP_BASE_URL="$(grep -E '^OP_BASE_URL=' .env | tail -1 | cut -d= -f2- | tr -d '"')"
  OP_API_KEY="$(grep -E '^OP_API_KEY=' .env | tail -1 | cut -d= -f2- | tr -d '"')"
  set +a
fi

if [ -z "${OP_API_KEY:-}" ] && [ -f secrets.enc.yaml ]; then
  eval "$(SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/sops/age-key.txt}" \
    sudo /usr/local/bin/sops -d --output-type dotenv secrets.enc.yaml \
    | grep -E '^OP_(BASE_URL|API_KEY)=' \
    | sed 's/^/export /')"
fi

: "${OP_BASE_URL:?OP_BASE_URL nicht gefunden}"
: "${OP_API_KEY:?OP_API_KEY nicht gefunden}"

BASE="${OP_BASE_URL%/}"
echo "→ Teste $BASE  (Benutzer: apikey / Passwort: <verborgen>)"

CODE=$(curl -s -o /tmp/op_test_body.json -w '%{http_code}' \
  -u "apikey:${OP_API_KEY}" \
  "$BASE/api/v3/projects?pageSize=200&filters=%5B%7B%22active%22%3A%7B%22operator%22%3A%22%3D%22%2C%22values%22%3A%5B%22t%22%5D%7D%7D%5D")

if [ "$CODE" = "200" ]; then
  TOTAL=$(grep -o '"total":[0-9]*' /tmp/op_test_body.json | head -1 | cut -d: -f2)
  echo "✓ Verbindung OK — $TOTAL aktive Projekte sichtbar."
  if [ "${1:-}" = "--projects" ]; then
    grep -o '"name":"[^"]*"' /tmp/op_test_body.json | sed 's/"name":"/  - /;s/"$//' | head -20
  fi
  rm -f /tmp/op_test_body.json
  exit 0
fi

echo "✗ Fehler — HTTP $CODE"
case "$CODE" in
  401) echo "  API-Key ungültig oder leer." ;;
  403) echo "  API-Key gültig, aber der Benutzer darf keine Projekte sehen." ;;
  000) echo "  $BASE nicht erreichbar (DNS/Netz/Zertifikat)." ;;
  *)   head -c 300 /tmp/op_test_body.json; echo ;;
esac
rm -f /tmp/op_test_body.json
exit 1
