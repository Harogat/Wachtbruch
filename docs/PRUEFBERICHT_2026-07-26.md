# Wachtbruch - Pruefbericht 2026-07-26

## Ergebnis

Der aktuelle Web-Kern startet, rendert und bleibt nach der weiteren
Modularisierung funktionsfaehig. Die ausgelagerten Datenvertraege sind
JSON-faehig und koennen als ein gemeinsames Godot-Kernpaket exportiert werden.

## Automatisch geprueft

- Syntaxpruefung aller 20 JavaScript- und MJS-Dateien
- eindeutige HTML-IDs und vorhandene Kern-Elemente
- 40 Assets und 31 GLB-Modelle
- zwei animierte Wachtfackeln mit stabilen Clips, Lichtankern und
  eingebetteten Punktlichtern
- zwei Waffen mit je fuenf Kombostufen plus Aufladeangriff
- drei Gegnertypen
- vier Raeume mit sechs Wellen
- Fortschrittssystem mit neun Upgrades und Stapelgrenzen
- feste Truheninhalte und normalisierte Truhendaten
- Wachthelm und Enterhaken als frei zuweisbare Truhenbelohnungen
- serialisierbarer Freischalt- und Anlegestatus fuer Fundausruestung
- Raum-, Platzierungs- und Wellenvertraege
- serialisierbarer Editorverlauf mit Undo, Redo und getrennten Raumstaenden
- Godot-Manifest mit zehn Modulen und vier Migrationsphasen
- JSON-Rundlauf und erneute Diskvalidierung des Godot-Kernexports
- freie Treppenmitte sowie linke und rechte Treppenflanke
- Flankenregel fuer Spielerbewegung und Gegnernavigation
- serialisierbares Waffenabprallerprofil mit Schwungwinkeln,
  Fuehlerabstaenden und Rueckimpuls
- Sichtschutz fuer Nahkampftreffer: feste Weltgeometrie gewinnt vor einem
  dahinterliegenden Ziel
- drei unabhaengige, versionierte Spielstand-Slots
- aktive Slot-Metadaten, Loeschen und letzte gueltige Sicherung je Slot
- Rundlauf von Raum, Checkpoint, Spielerwerten, Fortschritt, Weltzustand und
  noch nicht eingesammelten Muenzen
- identischer Spielstandvertrag im Godot-Kernexport

## Im Browser geprueft

- Startbildschirm und Spielstart
- Bewegungseingabe und Angriffsausloesung
- Inventar
- Ausruestungsbank mit Enterhakenprofil
- Front-, Seiten- und Rueckenansicht der Ausruestung
- Pruefmodus und Kampflabor
- Laden aller vier Raeume
- Start der Wachtschlucht-Welle und Gegner-Spawn
- Editor-Raumwechsel
- Welleneditor
- Undo und Redo einer Wellenplanaenderung
- isolierte Undo-/Redo-Verlaeufe fuer Wachhof und Tiefe Wacht
- Neustart mit unveraendertem, sauber wiederhergestelltem Wellenplan
- Diagnoseansicht mit Kollisionen, Gegnern, Licht und Triggern
- warme Wachtflamme und blaue Runenflamme im Assetkatalog
- Laden beider Fackelmodelle im Setzsystem
- laufende Flammenanimation mit messbarer Bildaenderung
- getrennte Lichtwirkung bei Tag und Nacht
- vollstaendiger Wachhof-Truhenlauf bis zur Helm-Enthuellung
- Wachthelm zuerst nur gefunden und danach bewusst im Inventar angelegt
- Enterhaken bleibt ohne zugewiesenen Truhenfund gesperrt
- Diagnoseansicht zeigt die beiden seitlichen Treppenkollisionen
- Angriff an der Raumbegrenzung beendet das Trefferfenster und loest den
  Waffenabpraller genau einmal aus
- normaler Angriffspfad erhoeht den Abprallerzaehler nicht
- Browserkonsole bleibt nach Wandkontakt und erneutem Kampfeinstieg ohne
  Warnungen und Fehler
- leeren Slot auswaehlen und einen neuen Lauf anlegen
- manuell in Slot 2 speichern und dessen Vorschau am Titelbildschirm anzeigen
- denselben Slot erneut laden und Raum, Leben sowie Muenzen wiederherstellen
- Test-Slot zweistufig bestaetigt loeschen
- Desktop- und Mobilansicht des Drei-Slot-Menues ohne horizontalen Ueberlauf
- Browserkonsole bleibt waehrend Speichern, Laden und Loeschen ohne Warnungen
  und Fehler

## Gefundener und behobener Fehler

Die seitliche und rueckwaertige Ausruestungsvorschau konnte von der
Weltgeometrie verdeckt werden. Die Ausruestungsbank isoliert ihre Vorschau nun
von der aktiven Raumgeometrie und stellt den vorherigen Sichtbarkeitszustand
beim Schliessen wieder her.

Eine fruehe Fassung behandelte Wachthelm und Enterhaken als feste Weltfunde.
Beide Freischaltungen werden nun ausschliesslich durch die konfigurierte
Siegestruhe eines Raums ausgeloest. Der Wachthelm wird beim Fund nicht
automatisch angelegt.

Treppen konnten seitlich durchlaufen werden, weil nur ihre begehbare
Hoehenflaeche beschrieben war. Jede Treppe besitzt nun zwei gedrehte,
skalierbare Seitenflanken. Die Mitte bleibt fuer Auf- und Abstieg frei; bereits
ueberlappende Akteure duerfen aus einer Flanke herauslaufen und werden nicht
festgesetzt.

Nahkampfangriffe konnten feste Geometrie bislang nur ueber das Zielsystem
indirekt beruecksichtigen. Waffenbahnen pruefen nun Raumgrenzen, Tore,
Treppenflanken, Hoehenkanten und feste Assets direkt. Der erste Weltkontakt
beendet den Angriff, verhindert Treffer durch Mauern und erzeugt einen kurzen
3D-Funken- und Klangimpuls.

Der Titelbildschirm setzte nach dem Rueckweg aus dem Spiel den Controllerfokus
zunaechst wieder auf Slot 1. Der zuletzt aktive Slot bleibt nun ausgewaehlt,
ist direkt ladbar und wird beim Neustart aus den Slot-Metadaten rekonstruiert.

Ausstehende Muenzen gingen in einer fruehen Spielstandfassung nach einem
Neuladen verloren. Ihre Werte und Bodenpositionen gehoeren nun zum
Spielstandvertrag und werden beim Laden erneut als Magnetbeute hergestellt.

## Neue Godot-Grenzen

- `modules/combat/weapon-rebound.js`
- `modules/progression/run-upgrades.js`
- `modules/progression/equipment-unlocks.js`
- `modules/loot/chest-drops.js`
- `modules/world/room-format.js`
- `modules/world/stair-collision.js`
- `modules/editor/history.js`
- `modules/persistence/save-slots.js`
- `modules/godot/content-bundle.js`
- `exports/godot/wachtbruch-core-data.json`

Der Export wird mit `tools/export-godot-core.cmd` neu erzeugt. Seine IDs,
Versionen und Einheiten sollen in Godot unveraendert uebernommen werden.

## Bewusst noch im Web-Laufzeitkern

Kampfphysik, Hoehenwechsel, Kamera und Gegnersteuerung bleiben vorerst
gemeinsam in `scene.js`. Treppenflankengeometrie und Waffenabprallerprofil sind
bereits in `modules/world/stair-collision.js` sowie
`modules/combat/weapon-rebound.js` gekapselt; ihre Laufzeitintegration bleibt
bis zum kleinen Godot-Ladeprototyp im gemeinsamen Kern.

## Naechster sicherer Schritt

Der Drei-Slot-Spielstand und der raumbezogene Undo-/Redo-Verlauf sind geloest.
Als naechstes werden Auswahl- und Transformationsaktionen als Datenkommandos
beschrieben. Danach kann ein Godot-Importer den vorhandenen Kernexport in
Resources umwandeln, ohne das Spielverhalten erneut zu erfinden.
