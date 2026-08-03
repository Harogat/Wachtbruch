# Wachtbruch: Modularisierungsplan

## Ziel

Der spielbare Kern bleibt waehrend der Aufteilung jederzeit startbar. Module
besitzen ihren Zustand selbst und bieten `scene.js` nur kleine, ausdrueckliche
Schnittstellen an. Raumdaten bleiben serialisierbare Daten und enthalten keine
Three.js-Objekte.

## Zielstruktur

- `modules/core`: Konstanten, Spieltakt und gemeinsame Hilfen
- `modules/assets`: Modellkatalog, Laden und Instanziieren
- `modules/audio`: Musik, Effekte und spaeter Lautstaerkegruppen
- `modules/world`: Raeume, Hoehen, Uebergaenge und Navigation
- `modules/editor`: Setzen, Auswahl, Verlauf und Raumverwaltung
- `modules/combat`: Spieler, Gegner, Treffer, Wellen und Bosslogik
- `modules/loot`: Truhen, Drops, Muenzmagnet und Belohnungen
- `modules/ui`: HUD, Inventar, Dialoge und Eingabeanzeigen
- `modules/persistence`: Speicherformat, Migration, Import und Export
- `modules/godot`: Migrationsmanifest und spaetere Zielzuordnung

## Reihenfolge

1. Audio kapseln. Erledigt: `modules/audio/music-manager.js`.
2. Reine Katalogdaten auslagern. Erledigt: Assets, Angriffe, Gegner und Raumvorgaben unter `modules/catalog`.
3. Editorzugang kapseln. Erledigt: `modules/editor/developer-mode.js` trennt Spiel- und Werkzeugansicht.
4. Speicherung kapseln. Erledigt: `modules/persistence/storage.js` verwaltet
   versionierte Einstellungen, Raumstaende, Sicherungen und alte Schluessel.
5. Godot-Zielstruktur festhalten. Erledigt: `modules/godot/migration-manifest.js`
   und `docs/GODOT_MODULARITAET.md`.
6. Reine Laufzeitdaten fuer Progression, Truhen und Raumformat loesen.
   Erledigt: `modules/progression/run-upgrades.js`,
   `modules/loot/chest-drops.js` und `modules/world/room-format.js`.
7. Einen serialisierbaren Godot-Kernexport erzeugen. Erledigt:
   `modules/godot/content-bundle.js` und `tools/export-godot-core.cmd`.
8. Editorverlauf und raumbezogene Undo-/Redo-Zustaende loesen. Erledigt:
   `modules/editor/history.js` besitzt Snapshots, Verlaufsspruenge,
   raumgetrennte Zustaende und den JSON-Vertrag.
9. Kampf in Player-, Enemy-, Wave- und Loot-System teilen. Begonnen:
   `modules/combat/hit-reactions.js` besitzt die stabilen Trefferprofile;
   `docs/COMBAT_CORE_V1.md` friert den Laufzeitvertrag ein.
10. World- und Hoehensystem isolieren und mit kleinen Testkarten pruefen.
11. Die stabilen Datenvertraege auf Godot-Ressourcen abbilden.

## Leitplanken

- Pro Schritt nur ein Verantwortungsbereich.
- Vor und nach jedem Schritt: Start, drei Raeume, Kampf und Editor pruefen.
- Keine Speicherformate still veraendern.
- Keine Assets waehrend der Strukturarbeit loeschen oder umbenennen.
- Neue Systeme erhalten Datenobjekte statt direkter Zugriffe auf globale Werte.

## Speichervertrag

- Raumdaten bleiben im bestehenden Format 3 lesbar.
- Einstellungsdaten besitzen einen eigenen versionierten Sammelstand.
- Vor dem Ueberschreiben wird nur ein gueltiger Hauptstand als Sicherung uebernommen.
- Beschaedigte Hauptstaende fallen beim Laden auf die letzte gueltige Sicherung zurueck.
- Alte Ausruestungs- und Effekt-Schluessel werden migriert und vorerst gespiegelt.

## Pruefmodus

Der Dev-Schalter gibt im laufenden Spiel einen getrennten Pruefmodus frei. Er
pausiert die Simulation und kann Raeume, einzelne Wellen, Unverwundbarkeit und
den Ausgangszustand deterministisch setzen. Beim Abschalten der Dev-Werkzeuge
werden Panel und Unverwundbarkeit immer zurueckgesetzt.

## Naechste technische Grenze

Die Kataloge beschreiben nun Inhalte. Auch die Asset-Eigenschaften `solid`,
`walkable` und `grapple` liegen im Asset-Katalog und erzeugen die Laufzeitlisten
automatisch. Progression, feste Truheninhalte und Raum-/Wellenformate sind reine
JavaScript-Datenmodule und werden bereits in ein gemeinsames Godot-Kernpaket
exportiert.

Der Editorverlauf ist nun aus `scene.js` geloest. Undo und Redo arbeiten ueber
unveraenderliche Snapshots, jeder Raum besitzt einen getrennten Verlauf und
eine neue Aenderung nach Undo entfernt den alten Redo-Zweig kontrolliert.

Als naechstes sollten Auswahl- und Transformationsbefehle des Editors als
kleine Datenkommandos beschrieben werden. Danach kann ein erster
Godot-Importer Raumdaten und Editor-History einlesen. Der eingefrorene
Kampfkern, Bewegung, Hoehenphysik und Gegnernavigation bleiben dabei
unangetastet.

Die ausfuehrliche Anleitung fuer eigene Inhalte steht in `docs/ERWEITERN.md`.
Der konkrete Godot-Blueprint steht in `docs/GODOT_MODULARITAET.md`.
Der abgenommene Kampfvertrag steht in `docs/COMBAT_CORE_V1.md`.
