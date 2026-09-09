# Konzeptpapier: Use-Case-Erfassung

**Arbeitstitel:** UC-Radar
**Auftraggeber / Produktverantwortung:** KI Partner (ki-partner.tech)
**Stand:** 6. September 2026
**Status:** Konzeptentwurf zur Abstimmung

---

## 1. Ausgangslage

KI Partner begleitet mittelständische Unternehmen bei Auswahl und Umsetzung von KI-Anwendungsfällen. In der Praxis zeigt sich ein wiederkehrendes Muster: In den Kundenorganisationen ist reichlich Ideenpotenzial vorhanden, es liegt aber verstreut in Köpfen, Workshop-Flipcharts und E-Mails. Es fehlt ein Kanal, der Ideen strukturiert einsammelt, und ein Maßstab, der sie vergleichbar macht.

Zwei Schwächen des heutigen Vorgehens sollen adressiert werden. Erstens sind Workshops punktuell — was am Workshoptag niemandem einfällt, geht verloren. Zweitens beschreiben Kunden typischerweise Lösungen („wir brauchen einen Chatbot“) statt Probleme, wodurch der eigentliche Wertbeitrag unklar bleibt.

## 2. Ziele

**Fachlich.** Kunden sollen Use Cases ohne Schulung und ohne Termindruck einreichen können. Die Erfassung soll dabei so führen, dass am Ende ein Problem beschrieben ist und nicht eine vorweggenommene Lösung. Jede Einreichung soll eine grobe Größenordnung des Potenzials mitliefern.

**Betrieblich.** Jeder qualifizierte Use Case landet als Work Package in OpenProject und ist damit unmittelbar in die bestehende Arbeitsorganisation von KI Partner eingebettet. Kein Medienbruch, keine parallele Liste.

**Geschäftlich.** Das Werkzeug ist wiederverwendbar über alle Kunden hinweg und wird selbst zum Beleg der eigenen Kompetenz: Der Kunde erlebt eine KI-gestützte Anwendung, während er über KI nachdenkt.

**Nicht-Ziele.** Die Anwendung ist kein Projektmanagement-Werkzeug (das ist OpenProject), kein Prozessmodellierungswerkzeug (keine BPMN-Notation) und kein Self-Service-Bewertungsrechner, der dem Kunden eine belastbare Wirtschaftlichkeitsrechnung suggeriert.

## 3. Nutzergruppen

| Gruppe | Zugang | Typische Nutzung |
|---|---|---|
| Einreicher beim Kunden (Sachbearbeitung, Fachbereich) | Unterfirma/Abteilung | Link mit Tenant-Token, kein Konto | Einmalig oder gelegentlich, 3 bis 15 Minuten |
| Ansprechpartner beim Kunden (z. B. Digitalisierungsverantwortlicher) | Magic Link | Sichtet Einreichungen des eigenen Hauses, ergänzt Kontext |
| KI Partner (Jens) | Adminbereich mit Konto | Sichtet Eingang, führt zusammen, bewertet, überträgt nach OpenProject |

## 4. Fachliches Konzept

### 4.1 Gestufte Erfassung statt zweier Formulare

Ursprünglich war ein Umschalter zwischen einer einfachen und einer ausführlichen Variante angedacht. Das Konzept setzt stattdessen auf **progressive Vertiefung**: Jeder Use Case beginnt als Kurzeintrag und kann jederzeit später ergänzt werden, auch von einer anderen Person. Der Umschalter wird damit zu einem „Mehr Details erfassen“-Angebot am Ende von Stufe 1. Der erreichte Detaillierungsgrad wird als Attribut *Reifegrad* mitgeführt.

Der Vorteil ist praktischer Natur: Niemand muss vorab entscheiden, wie viel Zeit er investieren will, und eine begonnene Kurzerfassung geht nicht verloren, wenn die Ausdauer nicht für die Prozessschritte reicht.

### 4.2 Stufe 1 — Kurzerfassung

Zielzeit: unter drei Minuten. Fünf Pflichtfelder:

1. **Was dauert zu lange oder ärgert?** Freitext. Bewusst nach dem Problem gefragt, nicht nach der Idee.
2. **Wer ist betroffen?** Rolle oder Abteilung, plus Anzahl der betroffenen Personen.
3. **Wie oft kommt das vor?** Auswahlliste (täglich bis seltener).
4. **Wie lange dauert ein Fall?** Minutenangabe mit Schnellauswahl (5 / 15 / 30 / 60 / 120).
5. **Was wäre das Wunschergebnis?** Freitext, optional.

Unmittelbar nach der Eingabe von Frequenz, Dauer und Anzahl blendet die Anwendung das hochgerechnete Jahrespotenzial ein („das sind rund 312 Stunden im Jahr“). Dieser Moment ist bewusst gesetzt: Er macht dem Einreicher den Wert seiner eigenen Meldung sichtbar und erhöht erfahrungsgemäß die Bereitschaft, weiterzumachen.

### 4.3 Stufe 2 — Prozessschritte

Zielzeit: 10 bis 20 Minuten. Der Nutzer legt Schritte in Reihenfolge an, je Schritt:

- Bezeichnung
- Eingang (was liegt vor?) und Ergebnis (was entsteht?)
- verwendetes System (Auswahlliste plus Freitext)
- geschätzte Dauer
- zwei Marker: **Wartezeit entsteht hier** und **menschliche Entscheidung erforderlich**

Die beiden Marker sind der eigentliche Ertrag dieser Stufe. Sie zeigen, wo Automatisierung tatsächlich greift und wo bestenfalls assistiert werden kann — eine Unterscheidung, die in der späteren Beratung wesentlich mehr wert ist als eine feingliedrige Prozessdokumentation.

### 4.4 Stufe 3 — Bewertung

Diese Stufe liegt bewusst **nicht** im Kundenfrontend, sondern im Adminbereich. Erfahrungsgemäß bewerten Einreicher den eigenen Vorschlag hoch, wodurch die Rangfolge unbrauchbar wird. Erfasst werden: Wertkorridor in Euro pro Jahr (pessimistisch, realistisch, optimistisch), Konfidenz der Schätzung, Datenlage, Fehlerkosten und der fachliche Owner beim Kunden.

Vor der Bewertung durchläuft jeder Use Case vier K.-o.-Fragen: Existieren die benötigten Daten heute in nutzbarer Form? Ist der Prozess stabil genug? Gibt es einen Owner, der Ergebnisse abnimmt? Sind Datenschutz und Mitbestimmung handhabbar? Was hier durchfällt, geht mit Begründung in eine Warteliste — das kostet wenig Zeit und wirkt beim Kunden professionell.

### 4.5 Berechnungslogik

```
Jahresfälle    = Frequenz-Faktor × Anzahl Betroffene
Stundenpotenzial p.a. = Jahresfälle × Dauer je Fall / 60
```

Frequenz-Faktoren (Fälle pro Person und Jahr): täglich 220, mehrmals wöchentlich 110, wöchentlich 44, monatlich 12, seltener 4.

Der Euro-Wert entsteht erst in Stufe 3 aus dem Stundenpotenzial, einem Automatisierungsgrad-Korridor (etwa 40 bis 70 Prozent) und einem hinterlegten Stundensatz. Die Anwendung zeigt bewusst einen Korridor, nie eine einzelne Zahl — eine Punktschätzung erzeugt eine Genauigkeit, die es an dieser Stelle nicht gibt.

### 4.6 KI-Anreicherung — optional und einwilligungspflichtig

Die LLM-gestützte Verarbeitung ist **standardmäßig deaktiviert**. Sie kann vom Einreicher pro Use Case zugeschaltet werden und erfordert dann eine zweite, ausdrückliche Bestätigung. Ohne diese Bestätigung verlassen die Daten des Use Case den Server von KI Partner nicht.

#### Funktionsumfang bei erteilter Einwilligung

1. **Titelvorschlag** aus dem Freitext, in der Form „Tätigkeit + Gegenstand“.
2. **Strukturierung**: Extraktion von betroffenem Prozess, Auslöser und genannten Systemen aus dem Fließtext.
3. **Kategorisierung** in ein festes Schema (Dokumentenverarbeitung, Recherche/Wissenszugriff, Kommunikation, Datenpflege, Analyse/Reporting, Qualitätsprüfung, Sonstiges).
4. **Ähnlichkeitsprüfung** gegen bestehende Einträge desselben Kunden.

Alle Ergebnisse sind als Vorschlag gekennzeichnet und überschreibbar. Nichts geht ungeprüft in die Bewertung; das Flag *KI-Vorschlag geprüft* dokumentiert die Freigabe durch KI Partner.

#### Zweistufige Einwilligung

**Stufe A — Schalter.** Am Ende des Formulars steht ein deaktivierter Schalter: *„Meine Eingaben durch KI aufbereiten lassen (optional)“*, mit einem einzeiligen Hinweis darunter, dass dabei Daten an einen externen Dienst übermittelt werden. Der Schalter allein löst noch nichts aus.

**Stufe B — Bestätigungsdialog.** Beim Aktivieren öffnet sich ein Dialog, der benennt, welche Felder übermittelt werden, an welche Anbieter, wozu und was das für den Nutzer bedeutet. Bestätigt wird über eine eigene Schaltfläche; ein Klick daneben oder auf *Abbrechen* setzt den Schalter zurück auf aus.

**Absenden.** Auf der Absenden-Schaltfläche wird der gewählte Zustand nochmals sichtbar gemacht — entweder *„Absenden (mit KI-Aufbereitung)“* oder *„Absenden (ohne KI)“*. Damit kann niemand versehentlich mit aktivierter Verarbeitung abschicken, ohne es beim letzten Klick gesehen zu haben.

Es gibt bewusst keine Voreinstellung auf Kundenebene, die den Schalter dauerhaft anschaltet. Die Entscheidung liegt bei der Person, die den konkreten Inhalt kennt.

#### Vorschlag für den Dialogtext

> **KI-Aufbereitung aktivieren?**
>
> Wenn Sie diese Option einschalten, werden die Inhalte dieses Use Case beim Absenden an einen externen KI-Dienst übermittelt und dort verarbeitet. Eingesetzt werden Dienste von Anbietern wie OpenAI oder Google AI.
>
> **Übermittelt werden:** Ihre Problembeschreibung, das Wunschergebnis, die Angaben zu Rolle, Frequenz und Dauer sowie — falls erfasst — Ihre Prozessschritte einschließlich der genannten Systeme.
>
> **Nicht übermittelt werden:** Ihr Name, Ihre E-Mail-Adresse und der Name Ihres Unternehmens.
>
> **Wozu:** Titelvorschlag, thematische Einordnung und Hinweis auf ähnliche Einreichungen im Haus.
>
> Bitte geben Sie keine personenbezogenen Daten Dritter, Kundennamen oder Geschäftsgeheimnisse in die Freitextfelder ein.
>
> Ohne diese Option wird Ihr Use Case ganz normal erfasst und ausgewertet — lediglich die automatische Aufbereitung entfällt.
>
> `[ Abbrechen ]` `[ Verstanden, KI-Aufbereitung aktivieren ]`

Der Hinweis auf Drittdaten ist kein juristisches Beiwerk, sondern der praktisch wirksamste Schutz: Freitextfelder in Prozessbeschreibungen enthalten erfahrungsgemäß Kundennamen und Kollegennamen, wenn man nicht ausdrücklich darum bittet, sie wegzulassen.

#### Technische Absicherung

Die Einwilligung wird mit Zeitpunkt und Versionskennung des angezeigten Hinweistextes gespeichert. Ändert sich der Text oder der eingesetzte Anbieter, steigt die Versionskennung — alte Einwilligungen gelten dann nicht automatisch für neue Verarbeitungen weiter.

Vor dem Versand entfernt eine Filterschicht die Identitätsfelder aus der Nutzlast. Die Prüfung erfolgt serverseitig, nicht im Browser: Ein manipulierter Client darf keine Verarbeitung auslösen können, für die keine gespeicherte Einwilligung vorliegt. Der Verarbeitungsauftrag wandert in eine Warteschlange, die vor jeder Ausführung erneut gegen den gespeicherten Einwilligungssatz prüft.

Die Einwilligung ist widerrufbar. Beim Widerruf werden die erzeugten Anreicherungen gelöscht; die ursprüngliche Einreichung bleibt bestehen. Jeder Versand wird protokolliert (Zeitpunkt, Anbieter, Modell, Use-Case-ID, übermittelte Feldliste) — ohne den Inhalt selbst, aber ausreichend für eine Auskunft.

#### Ähnlichkeitsprüfung möglichst ohne externen Dienst

Die Ähnlichkeitsprüfung trägt den größten Nutzen der vier Funktionen: Der Einreicher sieht direkt „drei Kolleginnen haben etwas Ähnliches gemeldet“ und kann sich anschließen statt neu einzureichen. Häufung ist zudem ein starkes Signal für die Priorisierung.

Genau diese Funktion lässt sich über ein lokal betriebenes Embedding-Modell auf dem VPS abbilden, ohne dass Daten das Haus verlassen. Dadurch steht der wertvollste Teil auch den Einreichern zur Verfügung, die die Einwilligung nicht erteilen, und der externe Aufruf beschränkt sich auf Titelvorschlag, Strukturierung und Kategorisierung. Der Ressourcenbedarf ist bei diesen Datenmengen gering. Ich halte das für den lohnendsten Ausbauschritt nach dem Erstlauf.

### 4.7 Eingangskorb statt Direktdurchstich

Einreichungen laufen **nicht** automatisch nach OpenProject. Sie landen zunächst in einem Eingangskorb im Adminbereich, wo gesichtet, zusammengeführt und dann per Klick übertragen wird. Andernfalls füllt sich OpenProject mit Halbfertigem, und der Aufgabenbestand verliert seine Aussagekraft.

## 5. Zugangs- und Rollenmodell

Ein Kontozwang senkt die Beteiligungsquote erheblich. Der Zugang läuft daher über eine kundenspezifische URL mit Zugangstoken, etwa `ideen.ki-partner.tech/muster-maschinenbau?t=…`, die der Kunde intern verteilt. Der Einreicher gibt Name und Abteilung an oder reicht anonym ein.

Für die Rückkehr zu einem eigenen Entwurf genügt ein Magic Link per E-Mail. Tokens sind pro Kunde rotierbar und mit Ablaufdatum versehen. Der Adminbereich ist davon vollständig getrennt und erfordert eine echte Anmeldung mit zweitem Faktor.

## 6. Datenmodell

**tenant** — id, slug, name, openproject_project_id, access_token_hash, token_expires_at, branding (Logo, Akzentfarbe), stundensatz_default, created_at

**use_case** — id, uuid (Idempotenzanker Richtung OpenProject), tenant_id, titel, problem_text, wunschergebnis, rolle, anzahl_betroffene, frequenz, dauer_minuten, stundenpotenzial_pa (berechnet), reifegrad, status, einreicher_name, einreicher_email, ist_anonym, ki_einwilligung (bool, Standard false), ki_einwilligung_am, ki_hinweis_version, ki_einwilligung_widerrufen_am, openproject_wp_id, openproject_lock_version, synced_at, created_at, updated_at

**process_step** — id, use_case_id, position, bezeichnung, input, output, system, dauer_minuten, hat_wartezeit, braucht_entscheidung

**assessment** — id, use_case_id, wert_min, wert_real, wert_max, konfidenz, datenlage, fehlerkosten, ko_kriterien (JSON), owner_beim_kunden, notiz_intern, bewertet_von, bewertet_am

**ai_enrichment** — id, use_case_id, titel_vorschlag, kategorie, extrahierte_systeme, aehnliche_use_cases (JSON), anbieter, modell, verarbeitung_lokal (bool), erzeugt_am, geprueft (bool)

**ai_transfer_log** — id, use_case_id, tenant_id, anbieter, modell, uebermittelte_felder (JSON, nur Feldnamen), hinweis_version, gesendet_am, ergebnis (ok / fehler). Enthält bewusst keine Inhalte, ist aber ausreichend, um einem Kunden auf Nachfrage belegen zu können, was wann wohin ging.

**Mandantentrennung** erfolgt auf Datenbankebene über `tenant_id` in jeder Abfrage, durchgesetzt über eine zentrale Zugriffsschicht (bei Postgres wahlweise zusätzlich per Row Level Security). Ein kundenübergreifender Zugriff darf technisch nicht möglich sein, auch nicht versehentlich.

## 7. Integration mit OpenProject

Die Struktur in OpenProject und die Vorgehensweise zur Anlage sind im separaten Dokument *Runbook: OpenProject für die Use-Case-Erfassung* beschrieben. Für die Anwendung sind sechs Punkte maßgeblich:

**Einseitiger Sync.** Die Anwendung schreibt nach OpenProject. Der Bearbeitungsstatus wird ausschließlich in OpenProject gepflegt und von der Anwendung nur gelesen, um dem Kunden einen vereinfachten Fortschritt anzuzeigen (etwa „in Prüfung“, „eingeplant“, „umgesetzt“).

**Idempotenz.** Die `uuid` des Use Case wird in ein Custom Field geschrieben. Vor jedem Anlegen wird gegen dieses Feld gefiltert. Damit erzeugt kein wiederholter Aufruf eine Dublette.

**Konfiguration statt Hardcoding.** Custom-Field-Bezeichner (`customField12`) und Options-IDs sind instanzspezifisch und liegen in einer Mapping-Datei, nicht im Code.

**Beschreibungstext.** Die Anwendung rendert Problem, Wunschergebnis und die Prozessschritt-Tabelle als Markdown in die Beschreibung des Work Package, jeweils als eigener Abschnitt („## Problem“, „## Wunschergebnis“, „## Prozessschritte“ mit der Schritt-Tabelle). Damit ist im Work Package alles sichtbar, ohne in die Anwendung zurückspringen zu müssen. Ist kein Wunschergebnis angegeben, entfällt der Abschnitt ersatzlos, statt eine leere Überschrift zu erzeugen.

**Aggregation der Systemliste.** Das Custom Field *Betroffene Systeme* wird von der Anwendung befüllt, nicht manuell im Work Package gepflegt: Sie fasst die `system`-Angaben aller `process_step`-Einträge (Stufe 2) mit den KI-seitig erkannten `extrahierte_systeme` (Stufe-1-Anreicherung, sofern Einwilligung erteilt) zu einer deduplizierten, kommaseparierten Liste zusammen und schreibt sie bei jedem Sync neu. Nachträgliche manuelle Ergänzungen direkt in OpenProject werden beim nächsten Sync überschrieben — Änderungen an dieser Liste gehören in die Prozessschritte der Anwendung, nicht ins Work Package.

**Übersetzung des Einwilligungsstatus.** Die Anwendung führt die KI-Einwilligung intern als Bool plus Zeitstempel (`ki_einwilligung`, `ki_einwilligung_am`, `ki_einwilligung_widerrufen_am`, Abschnitt 6), OpenProject dagegen als dreiwertige Liste. Beim Sync gilt: `ki_einwilligung = false` → *nicht erteilt*; `ki_einwilligung = true` und `ki_einwilligung_widerrufen_am` leer → *erteilt*; `ki_einwilligung_widerrufen_am` gesetzt → *widerrufen*. Nicht alle Felder aus Abschnitt 6 wandern nach OpenProject: `ko_kriterien`, `owner_beim_kunden`, `notiz_intern`, `bewertet_von` und `bewertet_am` bleiben bewusst app-intern, da sie internen Beratungskontext von KI Partner enthalten, der nicht für den Kunden im Work Package sichtbar sein soll.

## 8. Architektur und Betrieb

Die Anwendung läuft als weiterer Dienst auf dem bestehenden IONOS-VPS, neben OpenProject und hinter demselben Caddy-Reverse-Proxy.

**Komponenten.** Ein Anwendungscontainer, eine Postgres-Datenbank (bei kleinem Volumen genügt eine eigene Datenbank in der vorhandenen Instanz), Caddy als Reverse Proxy mit automatischem Zertifikat.

**Stack.** Empfohlen wird ein kompakter Stack, der Frontend und Backend in einem Deployment hält — etwa Next.js mit Prisma oder FastAPI mit schlankem Frontend. Ausschlaggebend ist weniger die Technologiewahl als die Betreibbarkeit durch eine Person: ein Container, ein Kommando, ein nachvollziehbares Log.

**Deployment.** Aus dem Repository, Secrets über das bestehende SOPS-plus-age-Setup. Ein Kommando für Deploy, eines für Rollback.

**Datensicherung.** Tägliches Datenbank-Backup, mindestens sieben Tage Vorhaltung. Ein Wiederherstellungslauf sollte einmal tatsächlich geprobt werden, bevor der erste Kunde produktiv arbeitet.

## 9. Datenschutz und Vertraulichkeit

In der Anwendung landen echte Prozessbeschreibungen der Kunden — betrieblich sensibel, teilweise mit Personenbezug (Einreicher, genannte Kolleginnen und Kollegen). Daraus folgen mehrere Festlegungen.

Die LLM-Verarbeitung ist ausdrücklich opt-in und wird pro Use Case einzeln bestätigt (Abschnitt 4.6). Ohne Einwilligung findet keine Übermittlung an Dritte statt — das ist die Grundeinstellung und der Normalfall. Für die Fälle mit Einwilligung ist zusätzlich anzustreben: ein Endpunkt innerhalb der EU, eine vertraglich abgesicherte Auftragsverarbeitung und der Ausschluss der Trainingsnutzung. Die eingesetzten Anbieter werden namentlich im Bestätigungsdialog genannt; ein Anbieterwechsel erhöht die Versionskennung des Hinweistextes.

Zu klären ist, ob die Einwilligung des einzelnen Mitarbeiters gegenüber KI Partner überhaupt die passende Rechtsgrundlage ist oder ob die Übermittlung besser über den Auftragsverarbeitungsvertrag mit dem Kunden getragen wird — mit dem Schalter dann als betriebliche Selbstbestimmung des Einreichers statt als datenschutzrechtliche Einwilligung. Praktisch ändert das an der Oberfläche nichts, an der Formulierung des Dialogtextes aber schon. Das gehört vor dem ersten Produktivkunden einmal anwaltlich oder mit dem Datenschutzbeauftragten des Kunden geprüft; ich bin hier keine belastbare Quelle.

Da KI Partner die Daten im Auftrag der Kunden verarbeitet, ist je Kunde ein Auftragsverarbeitungsvertrag erforderlich. Ein Standardtext sollte vorbereitet werden, bevor der erste Kunde live geht — nachträglich ist das unangenehm.

Weiterhin vorzusehen: Löschung aller Daten eines Kunden auf Anforderung inklusive der OpenProject-Seite, anonyme Einreichung als echte Option ohne versteckte Zuordnung, und eine Aufbewahrungsfrist für nicht weiterverfolgte Einreichungen.

Betriebsrat und Mitbestimmung sind mitzudenken: Sobald Tätigkeiten einzelner Rollen erfasst und bewertet werden, kann das mitbestimmungsrelevant werden. Der Hinweis gehört in die Kundenkommunikation, nicht erst in die Umsetzungsphase.

## 10. Ausbaustufen

**Stufe 1 — Tragfähiger Erstlauf.** Kurzerfassung, Potenzialrechnung, Adminkorb, Übertragung nach OpenProject, Mandantenverwaltung. Ohne jede externe Verarbeitung, damit der erste Kundeneinsatz datenschutzseitig unkompliziert bleibt. Realistisch in wenigen Tagen umsetzbar.

**Stufe 2 — Tiefe.** Prozessschritte, Bewertungsblock im Adminbereich, Export der Portfolioübersicht sowie die KI-Anreicherung samt Einwilligungsdialog, Filterschicht und Versandprotokoll. Die Ähnlichkeitsprüfung möglichst gleich über ein lokales Embedding-Modell, damit sie unabhängig von der Einwilligung funktioniert.

**Stufe 3 — Kundenerlebnis.** Kunden-Dashboard mit Portfolio-Sicht und Fortschritt, Priorisierungsmodus für Workshops (fiktives Budget von 1.000 Euro pro Teilnehmer, verteilt auf Use-Case-Karten), Branding je Kunde.

**Stufe 4 — Skalierung.** Mehrere Betreuer im Adminbereich, Vorlagenbibliothek typischer Use Cases nach Branche, Benchmark über Kunden hinweg in anonymisierter Form.

## 11. Offene Entscheidungen

1. **Anonyme Einreichung als Standard oder als Ausnahme?** Anonymität hebt die Beteiligung, erschwert aber Rückfragen. Empfehlung: Name optional, Vorbelegung leer.
2. **Sieht der Kunde die Bewertung?** Transparenz schafft Vertrauen, kann aber Diskussionen über Zahlen auslösen, die noch Schätzungen sind. Empfehlung: erst ab Reifegrad *Bewertet* und nur der realistische Wert.
3. **Wird das Werkzeug als Teil der Beratung mitgeliefert oder separat lizenziert?** Beeinflusst, wie viel in Mandantenfähigkeit und Self-Service investiert werden sollte.
4. **Stundensatz je Kunde oder pauschal?** Ein kundenspezifischer Satz ist genauer, erfordert aber eine Angabe, die manche Kunden ungern machen.

---

## Anhang: Beispiel einer Kurzerfassung

> **Problem:** Wenn eine Anfrage per E-Mail reinkommt, muss ich die Angaben von Hand ins Angebotstool übertragen, Preise aus der Preisliste suchen und das Angebot als PDF zurückschicken. Bei unklaren Anfragen muss ich nochmal nachfragen.
>
> **Betroffen:** Vertriebsinnendienst, 4 Personen
> **Frequenz:** täglich · **Dauer:** 25 Minuten
> **Wunschergebnis:** Angebotsentwurf liegt fertig vor, ich prüfe und schicke ab.

Berechnetes Potenzial: 220 × 4 × 25 / 60 = **367 Stunden pro Jahr**.

KI-Anreicherung — nur weil der Einreicher den Schalter aktiviert und den Hinweis bestätigt hat: Titel *„Angebotserstellung aus Anfrage-E-Mails“*, Kategorie *Dokumentenverarbeitung*, erkannte Systeme *E-Mail, Angebotstool, Preisliste*, ein ähnlicher Eintrag gefunden.

Ohne Einwilligung sähe derselbe Eintrag identisch aus, nur ohne Titelvorschlag und ohne Kategorie — beides trägt Jens im Adminbereich in wenigen Sekunden selbst nach.
