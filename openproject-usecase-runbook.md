# Runbook: OpenProject für die Use-Case-Erfassung

**Zielgruppe:** Ein Agent (Claude Code / Cowork) mit SSH-Zugang zum IONOS-VPS und API-Zugang zu OpenProject.
**Zweck:** Reproduzierbares Setup der Use-Case-Struktur in OpenProject sowie die wiederkehrende Anlage neuer Kundenprojekte und Use Cases.

Dieses Dokument ist als Arbeitsanweisung geschrieben. Abschnitte mit `AGENT:` sind unmittelbar ausführbar. Abschnitte mit `STOP:` erfordern eine ausdrückliche Bestätigung durch Jens, bevor weitergearbeitet wird.

---

## 0. Betriebsregeln für den Agenten

1. **Niemals blind schreiben.** Vor jeder schreibenden Operation den Ist-Zustand lesen und mit dem Soll-Zustand aus diesem Dokument vergleichen. Nur die Differenz anlegen.
2. **Idempotenz ist Pflicht.** Jedes Skript muss mehrfach ausführbar sein, ohne Dubletten zu erzeugen. Vorgehen immer: suchen → wenn vorhanden, ID merken und überspringen → sonst anlegen.
3. **Keine Löschung ohne `STOP:`.** Der Agent löscht in OpenProject nichts eigenständig — keine Projekte, keine Custom Fields, keine Stati, keine Work Packages.
4. **Backup vor Struktureingriffen.** Vor jedem Eingriff über die Rails-Konsole (Abschnitt 2) einen Datenbank-Dump ziehen und den Pfad protokollieren.
5. **Protokollpflicht.** Jeder Lauf schreibt ein Protokoll nach `./logs/openproject-setup-<ISO-Datum>.log` mit allen erzeugten IDs (Custom Fields, Typ, Stati, Projekte). Diese IDs werden für die App gebraucht.
6. **Versionsabhängigkeit prüfen.** Die Rails-Modelle unterscheiden sich zwischen OpenProject-Versionen. Vor Abschnitt 2 die installierte Version feststellen und bei Abweichungen zwischen Skript und Modell abbrechen statt zu raten.

---

## 1. Voraussetzungen und Vorabprüfung

### 1.1 Benötigte Werte

Diese Werte liegen verschlüsselt in `secrets.enc.yaml` (SOPS + age) und werden zur Laufzeit entschlüsselt:

| Schlüssel | Bedeutung |
|---|---|
| `OP_BASE_URL` | z. B. `https://projekte.ki-partner.tech` |
| `OP_API_KEY` | API-Token eines Administratorkontos |
| `OP_CONTAINER` | Name des OpenProject-Web-Containers, z. B. `openproject-web-1` |

Authentifizierung an der API erfolgt als HTTP Basic Auth mit dem Benutzernamen `apikey` und dem Token als Passwort.

### 1.2 AGENT: Verbindungs- und Rechteprüfung

```bash
set -euo pipefail

# API erreichbar und Token gültig?
curl -sf -u "apikey:${OP_API_KEY}" "${OP_BASE_URL}/api/v3" | jq '.coreVersion // ."_type"'

# Adminrechte vorhanden? (muss ein Ergebnis liefern, nicht 403)
curl -sf -u "apikey:${OP_API_KEY}" "${OP_BASE_URL}/api/v3/users/me" | jq '{id, name, admin}'

# Bestehende Typen und Stati inventarisieren
curl -sf -u "apikey:${OP_API_KEY}" "${OP_BASE_URL}/api/v3/types"    | jq '._embedded.elements[] | {id, name}'
curl -sf -u "apikey:${OP_API_KEY}" "${OP_BASE_URL}/api/v3/statuses" | jq '._embedded.elements[] | {id, name, isClosed}'
```

Bricht einer der Aufrufe ab, hier stoppen und den Fehler melden. Nicht weiterarbeiten.

### 1.3 Was die API kann und was nicht

Das ist der entscheidende Punkt für die Automatisierung:

| Objekt | Anlegen per API v3 | Weg für den Agenten |
|---|---|---|
| Projekt | ja | `POST /api/v3/projects` |
| Work Package | ja | `POST /api/v3/projects/{id}/work_packages` |
| Work Package aktualisieren | ja | `PATCH` mit `lockVersion` |
| Mitgliedschaft / Rolle | ja | `POST /api/v3/memberships` |
| **Custom Field** | **nein** | Rails-Konsole oder Admin-UI |
| **Work-Package-Typ** | **nein** | Rails-Konsole oder Admin-UI |
| **Status / Workflow** | **nein** | Rails-Konsole oder Admin-UI |

Konsequenz: Abschnitt 2 (Einmal-Setup) läuft über die Rails-Konsole im Container. Abschnitt 3 und 4 (laufender Betrieb) laufen vollständig über die API und sind damit auch aus der Custom App heraus aufrufbar.

---

## 2. Einmal-Setup der Struktur

Dieser Abschnitt wird **einmal** ausgeführt. Danach ist er nur noch relevant, wenn Felder ergänzt werden sollen.

### 2.1 STOP: Freigabe einholen

Der Agent legt Jens vor: geplante Custom Fields, geplanter Typ, geplante Stati (siehe unten) und den Pfad des erstellten Datenbank-Backups. Erst nach ausdrücklicher Freigabe weiter.

### 2.2 AGENT: Backup

```bash
docker exec "${OP_CONTAINER}" pg_dump -U openproject openproject \
  | gzip > "./backups/openproject-$(date +%Y%m%dT%H%M%S).sql.gz"
ls -lh ./backups/ | tail -3
```

Der genaue Datenbank-Benutzer und -Name hängen vom Compose-Setup ab. Vor Ausführung aus der `docker-compose.yml` verifizieren, nicht raten.

### 2.3 Soll-Zustand: Custom Fields

Alle Felder sind vom Typ *Work Package*, `is_for_all = true` (in allen Projekten verfügbar) und filterbar.

| # | Name | Format | Werte / Hinweis | Wer pflegt |
|---|---|---|---|---|
| 1 | UC-UUID | string | Technische ID aus der App, Idempotenzanker | App |
| 2 | Einreicher | string | Name oder „anonym“ | App |
| 3 | Rolle / Abteilung | string | Betroffene Rolle | App |
| 4 | Frequenz | list | täglich; mehrmals wöchentlich; wöchentlich; monatlich; seltener | App |
| 5 | Dauer je Fall (Min) | int | | App |
| 6 | Anzahl Betroffene | int | | App |
| 7 | Stundenpotenzial p.a. | float | Von der App berechnet | App |
| 8 | Reifegrad | list | Kurzerfassung; Prozess erfasst; Bewertet | App |
| 9 | Wert min (EUR/Jahr) | float | Pessimistischer Wert | Jens |
| 10 | Wert real (EUR/Jahr) | float | Realistischer Wert | Jens |
| 11 | Wert max (EUR/Jahr) | float | Optimistischer Wert | Jens |
| 12 | Konfidenz | list | niedrig; mittel; hoch | Jens |
| 13 | Datenlage | list | vorhanden strukturiert; vorhanden unstrukturiert; teilweise; nicht vorhanden | Jens |
| 14 | Fehlerkosten | list | gering; mittel; hoch/kritisch | Jens |
| 15 | Betroffene Systeme | text | Freitext, z. B. „M365, DATEV, Shopware“ | beide |
| 16 | KI-Vorschlag geprüft | bool | Kennzeichnet, ob die LLM-Anreicherung freigegeben wurde | Jens |
| 17 | KI-Einwilligung | list | nicht erteilt; erteilt; widerrufen | App |

**Warum UC-UUID zuerst kommt:** Ohne dieses Feld kann die App nicht erkennen, ob zu einem Use Case bereits ein Work Package existiert. Jeder erneute Sync würde Dubletten erzeugen. Das Feld ist der wichtigste Eintrag der Liste.

**Warum KI-Einwilligung mitgeführt wird:** Die LLM-Anreicherung ist opt-in und wird vom Einreicher pro Use Case bestätigt. Der Status gehört auch nach OpenProject, damit im Work Package erkennbar ist, ob die enthaltenen Vorschläge aus einer externen Verarbeitung stammen. Bei *nicht erteilt* dürfen die Felder aus der Anreicherung schlicht leer sein — das ist der Normalfall und kein Mangel. Führendes System für die Einwilligung selbst bleibt die App; OpenProject spiegelt nur.

### 2.4 AGENT: Custom Fields anlegen

Zuerst die Modellstruktur der installierten Version prüfen, dann als Trockenlauf, dann scharf.

```bash
# Version und Modellattribute prüfen
docker exec -i "${OP_CONTAINER}" bundle exec rails runner \
  'puts OpenProject::VERSION.to_s; puts WorkPackageCustomField.new.attributes.keys.sort.inspect'
```

Skript `setup_custom_fields.rb` (auf den Host legen, dann per `rails runner` einspielen):

```ruby
# Idempotent: legt nur an, was fehlt. Gibt am Ende die ID-Zuordnung aus.
DRY_RUN = ENV.fetch("DRY_RUN", "true") == "true"

FIELDS = [
  { name: "UC-UUID",               field_format: "string" },
  { name: "Einreicher",            field_format: "string" },
  { name: "Rolle / Abteilung",     field_format: "string" },
  { name: "Frequenz",              field_format: "list",
    possible_values: ["täglich", "mehrmals wöchentlich", "wöchentlich", "monatlich", "seltener"] },
  { name: "Dauer je Fall (Min)",   field_format: "int" },
  { name: "Anzahl Betroffene",     field_format: "int" },
  { name: "Stundenpotenzial p.a.", field_format: "float" },
  { name: "Reifegrad",             field_format: "list",
    possible_values: ["Kurzerfassung", "Prozess erfasst", "Bewertet"] },
  { name: "Wert min (EUR/Jahr)",   field_format: "float" },
  { name: "Wert real (EUR/Jahr)",  field_format: "float" },
  { name: "Wert max (EUR/Jahr)",   field_format: "float" },
  { name: "Konfidenz",             field_format: "list",
    possible_values: ["niedrig", "mittel", "hoch"] },
  { name: "Datenlage",             field_format: "list",
    possible_values: ["vorhanden strukturiert", "vorhanden unstrukturiert", "teilweise", "nicht vorhanden"] },
  { name: "Fehlerkosten",          field_format: "list",
    possible_values: ["gering", "mittel", "hoch/kritisch"] },
  { name: "Betroffene Systeme",    field_format: "text" },
  { name: "KI-Vorschlag geprüft",  field_format: "bool" },
  { name: "KI-Einwilligung",       field_format: "list",
    possible_values: ["nicht erteilt", "erteilt", "widerrufen"] }
]

mapping = {}

FIELDS.each do |spec|
  existing = WorkPackageCustomField.find_by(name: spec[:name])
  if existing
    puts "= vorhanden: #{spec[:name]} -> customField#{existing.id}"
    mapping[spec[:name]] = existing.id
    next
  end

  if DRY_RUN
    puts "+ WÜRDE ANLEGEN: #{spec[:name]} (#{spec[:field_format]})"
    next
  end

  cf = WorkPackageCustomField.new(
    name: spec[:name],
    field_format: spec[:field_format],
    is_required: false,
    is_filter: true,
    searchable: %w[string text].include?(spec[:field_format]),
    is_for_all: true
  )
  cf.possible_values = spec[:possible_values] if spec[:possible_values]
  cf.save!
  puts "+ angelegt: #{spec[:name]} -> customField#{cf.id}"
  mapping[spec[:name]] = cf.id
end

puts "\n--- MAPPING (in die App-Konfiguration übernehmen) ---"
mapping.each { |name, id| puts "#{name} = customField#{id}" }
```

Ausführung:

```bash
# 1. Trockenlauf
docker exec -i "${OP_CONTAINER}" bundle exec rails runner - < setup_custom_fields.rb

# 2. Nach Sichtprüfung scharf schalten
docker exec -i -e DRY_RUN=false "${OP_CONTAINER}" bundle exec rails runner - < setup_custom_fields.rb
```

Das ausgegebene Mapping (`customField12` usw.) ins Protokoll und in die App-Konfiguration übernehmen. **Diese IDs sind instanzspezifisch und dürfen nicht hart im App-Code stehen** — sie gehören in die Umgebungskonfiguration.

### 2.5 AGENT: Stati und Work-Package-Typ

Stati in dieser Reihenfolge: `Eingereicht`, `Geprüft`, `Qualifiziert`, `Priorisiert`, `In Umsetzung`, `Umgesetzt` (geschlossen), `Verworfen` (geschlossen).

```ruby
DRY_RUN = ENV.fetch("DRY_RUN", "true") == "true"

STATUSES = [
  { name: "Eingereicht",   is_closed: false, is_default: true },
  { name: "Geprüft",       is_closed: false },
  { name: "Qualifiziert",  is_closed: false },
  { name: "Priorisiert",   is_closed: false },
  { name: "In Umsetzung",  is_closed: false },
  { name: "Umgesetzt",     is_closed: true  },
  { name: "Verworfen",     is_closed: true  }
]

STATUSES.each_with_index do |spec, i|
  if (s = Status.find_by(name: spec[:name]))
    puts "= Status vorhanden: #{spec[:name]} (#{s.id})"
    next
  end
  if DRY_RUN
    puts "+ WÜRDE ANLEGEN Status: #{spec[:name]}"
    next
  end
  s = Status.create!(name: spec[:name], is_closed: spec[:is_closed], position: 100 + i)
  puts "+ Status angelegt: #{s.name} (#{s.id})"
end

# Work-Package-Typ
type = Type.find_by(name: "Use Case")
if type
  puts "= Typ vorhanden: Use Case (#{type.id})"
elsif DRY_RUN
  puts "+ WÜRDE ANLEGEN Typ: Use Case"
else
  type = Type.create!(name: "Use Case", is_default: false, color_id: nil, position: 100)
  puts "+ Typ angelegt: Use Case (#{type.id})"
end
```

**Achtung Workflow:** Ein neuer Typ hat zunächst keine Workflow-Übergänge, wodurch Statuswechsel in der UI nicht möglich sind. Der Agent kopiert deshalb den Workflow eines bestehenden Typs und meldet das Ergebnis. Da die Workflow-Verwaltung stark versionsabhängig ist, ist der zuverlässigere Weg hier die Admin-UI unter *Administration → Arbeitspakete → Status-Übergänge*, mit „Workflow kopieren“ von Typ *Task* auf Typ *Use Case*. Der Agent führt diesen Schritt entweder per Browser-Automatisierung aus oder legt Jens eine kurze Klickanweisung vor.

### 2.6 AGENT: Formularkonfiguration

Die neuen Felder müssen im Formular des Typs *Use Case* sichtbar gemacht werden (*Administration → Arbeitspakete → Typen → Use Case → Formularkonfiguration*). Empfohlene Gruppierung:

- **Erfassung (Kunde):** Einreicher, Rolle/Abteilung, Frequenz, Dauer je Fall, Anzahl Betroffene, Stundenpotenzial, Reifegrad, KI-Einwilligung
- **Bewertung (KI Partner):** Wert min/real/max, Konfidenz, Datenlage, Fehlerkosten, Betroffene Systeme, KI-Vorschlag geprüft
- **Technisch:** UC-UUID

### 2.7 AGENT: Projektvorlage

Ein Projekt `Use-Case-Vorlage` anlegen, dort den Typ *Use Case* aktivieren, die Standardansichten einrichten (siehe 3.3) und in den Projekteinstellungen als Vorlage markieren. Neue Kundenprojekte werden anschließend aus dieser Vorlage kopiert — das spart in Abschnitt 3 mehrere Einzelschritte.

### 2.8 Abnahmekriterien Einmal-Setup

- [ ] Alle 17 Custom Fields existieren, Mapping ist protokolliert
- [ ] Typ *Use Case* existiert und ist im Vorlagenprojekt aktiv
- [ ] Alle 7 Stati existieren, Workflow ist für den Typ hinterlegt
- [ ] Ein manuell angelegtes Test-Work-Package lässt sich von *Eingereicht* bis *Umgesetzt* durchschalten
- [ ] Backup-Pfad ist protokolliert

---

## 3. Wiederkehrend: Neuen Kunden anlegen

Dieser Abschnitt ist vollständig API-basiert und damit auch aus der Custom App heraus aufrufbar.

### 3.1 Eingabeparameter

| Parameter | Beispiel |
|---|---|
| `KUNDE_NAME` | `Muster Maschinenbau GmbH` |
| `KUNDE_SLUG` | `muster-maschinenbau` (klein, nur `a-z0-9-`) |
| `KUNDE_BESCHREIBUNG` | kurze Einordnung, Branche |

Namenskonvention für das Projekt: `Use Cases – <KUNDE_NAME>`, Identifier: `uc-<KUNDE_SLUG>`.

### 3.2 AGENT: Projekt anlegen (idempotent)

```bash
IDENT="uc-${KUNDE_SLUG}"

# 1. Prüfen, ob es das Projekt schon gibt
EXISTING=$(curl -s -u "apikey:${OP_API_KEY}" \
  "${OP_BASE_URL}/api/v3/projects/${IDENT}" | jq -r '.id // empty')

if [ -n "$EXISTING" ]; then
  echo "Projekt existiert bereits: id=${EXISTING}"
else
  curl -sf -u "apikey:${OP_API_KEY}" \
    -X POST "${OP_BASE_URL}/api/v3/projects" \
    -H "Content-Type: application/json" \
    -d "{
      \"identifier\": \"${IDENT}\",
      \"name\": \"Use Cases – ${KUNDE_NAME}\",
      \"description\": { \"format\": \"markdown\", \"raw\": \"${KUNDE_BESCHREIBUNG}\" },
      \"public\": false
    }" | jq '{id, identifier, name}'
fi
```

Alternativ und bevorzugt: das Vorlagenprojekt aus 2.7 kopieren, damit Typaktivierung und Ansichten mitkommen. Der Kopiervorgang läuft asynchron als Job — der Agent muss den Job-Status abfragen, bevor er weitermacht, und darf nicht sofort Work Packages anlegen.

### 3.3 AGENT: Projekt konfigurieren

1. Typ *Use Case* im Projekt aktivieren (falls nicht aus Vorlage übernommen).
2. Drei gespeicherte Ansichten anlegen:
   - **Eingang** — Filter: Status = Eingereicht, sortiert nach Erstelldatum absteigend
   - **Trichter** — Board oder Gruppierung nach Status
   - **Portfolio** — Filter: Status = Qualifiziert oder Priorisiert, sortiert nach Stundenpotenzial absteigend, Spalten: Titel, Rolle, Frequenz, Stundenpotenzial, Wert real, Konfidenz
3. Optional Kundenzugang: nur bei ausdrücklichem Wunsch, dann mit einer Rolle ohne Schreibrechte.

### 3.4 AGENT: Ergebnis zurückmelden

Die Projekt-ID zurück an die Custom App melden, wo sie im Feld `tenant.openproject_project_id` gespeichert wird. Ohne diesen Schritt kann die App später keine Use Cases zuordnen.

### 3.5 Abnahmekriterien

- [ ] Projekt existiert mit korrektem Identifier
- [ ] Typ *Use Case* ist aktiv, Custom Fields sind im Formular sichtbar
- [ ] Drei Ansichten sind angelegt
- [ ] Projekt-ID ist in der App hinterlegt
- [ ] Ein Test-Use-Case ließ sich per API anlegen und wurde danach wieder entfernt

---

## 4. Wiederkehrend: Use Case anlegen und aktualisieren

### 4.1 Schema zuerst abfragen

Vor dem ersten Schreibzugriff auf ein Projekt einmal das Schema abrufen, um die gültigen Custom-Field-Bezeichner und die zulässigen Optionswerte zu bestätigen:

```bash
curl -sf -u "apikey:${OP_API_KEY}" \
  "${OP_BASE_URL}/api/v3/work_packages/schemas/${PROJECT_ID}-${TYPE_ID}" \
  | jq 'to_entries[] | select(.key | startswith("customField")) | {(.key): .value.name}'
```

Bei Listenfeldern werden die Werte nicht als Text übergeben, sondern als Link auf die jeweilige Option (`/api/v3/custom_options/{id}`). Diese IDs stehen in `allowedValues` des Schemas und werden einmalig in die App-Konfiguration übernommen.

### 4.2 AGENT: Anlegen

```bash
curl -sf -u "apikey:${OP_API_KEY}" \
  -X POST "${OP_BASE_URL}/api/v3/projects/${PROJECT_ID}/work_packages" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Angebotserstellung aus Anfrage-E-Mails",
    "description": {
      "format": "markdown",
      "raw": "## Problem\n...\n\n## Wunschergebnis\n...\n\n## Prozessschritte\n| # | Schritt | System | Dauer |\n|---|---|---|---|\n| 1 | ... | Outlook | 10 min |"
    },
    "customField12": "3f8a1c92-...",
    "customField16": 180,
    "customField18": 312.0,
    "_links": {
      "type":   { "href": "/api/v3/types/8" },
      "status": { "href": "/api/v3/statuses/1" },
      "customField15": { "href": "/api/v3/custom_options/42" }
    }
  }' | jq '{id, subject, lockVersion}'
```

Der Abschnitt „## Wunschergebnis" ist optional (Konzeptpapier 4.2 nennt das Feld freiwillig) und entfällt ersatzlos, wenn kein Wunschergebnis angegeben wurde — keine leere Überschrift erzeugen.

Die zurückgegebene `id` und `lockVersion` in der App speichern.

### 4.3 AGENT: Aktualisieren

Jeder `PATCH` benötigt die aktuelle `lockVersion`. Ist sie veraltet, antwortet OpenProject mit **409 Conflict** — dann neu lesen und erneut versuchen, aber die Änderungen aus OpenProject nicht überschreiben.

```bash
LV=$(curl -sf -u "apikey:${OP_API_KEY}" \
  "${OP_BASE_URL}/api/v3/work_packages/${WP_ID}" | jq '.lockVersion')

curl -sf -u "apikey:${OP_API_KEY}" \
  -X PATCH "${OP_BASE_URL}/api/v3/work_packages/${WP_ID}" \
  -H "Content-Type: application/json" \
  -d "{ \"lockVersion\": ${LV}, \"customField18\": 420.0 }"
```

### 4.4 AGENT: Dublettenschutz

Vor dem Anlegen immer gegen die UC-UUID prüfen:

```bash
FILTER='[{"customField12":{"operator":"=","values":["3f8a1c92-..."]}}]'
curl -sfG -u "apikey:${OP_API_KEY}" \
  "${OP_BASE_URL}/api/v3/work_packages" \
  --data-urlencode "filters=${FILTER}" | jq '.total'
```

Ist `total > 0`, wird aktualisiert statt angelegt.

### 4.5 Statushoheit

Der Status wird **ausschließlich in OpenProject** gepflegt. Die App setzt beim Anlegen einmalig *Eingereicht* und schreibt danach nie wieder ins Statusfeld. Sie darf den Status lesen, um dem Kunden einen vereinfachten Fortschritt anzuzeigen.

---

## 5. Fehlerbehandlung

| Symptom | Ursache | Reaktion des Agenten |
|---|---|---|
| 401 | Token ungültig oder rotiert | Abbrechen, Jens informieren. Kein Retry. |
| 403 | Fehlende Rechte oder Feld im Projekt nicht aktiv | Typaktivierung und Formularkonfiguration prüfen |
| 409 | `lockVersion` veraltet | Neu lesen, Differenz prüfen, dann erneut. Max. 3 Versuche. |
| 422 mit `PropertyConstraintViolation` | Feldwert passt nicht zum Schema, meist Listenoption als Text statt Link | Schema neu abrufen, Mapping korrigieren |
| Custom Field taucht im Schema nicht auf | `is_for_all` nicht gesetzt oder Feld nicht im Typ-Formular | Abschnitt 2.6 nacharbeiten |
| Zeitüberschreitung beim Projektkopieren | Asynchroner Job noch nicht fertig | Job-Status pollen, nicht neu starten |

---

## 6. Übergabeartefakt

Nach Abschluss von Abschnitt 2 erzeugt der Agent eine Datei `openproject-mapping.json`, die von der Custom App gelesen wird:

```json
{
  "base_url": "https://projekte.ki-partner.tech",
  "type_use_case_id": 8,
  "status_ids": {
    "eingereicht": 1, "geprueft": 12, "qualifiziert": 13,
    "priorisiert": 14, "in_umsetzung": 15, "umgesetzt": 16, "verworfen": 17
  },
  "custom_fields": {
    "uc_uuid": "customField12",
    "einreicher": "customField13",
    "rolle": "customField14",
    "frequenz": "customField15",
    "dauer_min": "customField16",
    "anzahl_betroffene": "customField17",
    "stundenpotenzial": "customField18",
    "reifegrad": "customField19",
    "ki_einwilligung": "customField20"
  },
  "custom_options": {
    "frequenz": { "täglich": 40, "mehrmals wöchentlich": 41, "wöchentlich": 42, "monatlich": 43, "seltener": 44 },
    "reifegrad": { "Kurzerfassung": 45, "Prozess erfasst": 46, "Bewertet": 47 },
    "ki_einwilligung": { "nicht erteilt": 48, "erteilt": 49, "widerrufen": 50 }
  }
}
```

Diese Datei enthält keine Geheimnisse und darf ins Repository. Der API-Token bleibt in `secrets.enc.yaml`.
