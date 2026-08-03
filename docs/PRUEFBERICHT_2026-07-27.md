# Wachtbruch - Pruefbericht 2026-07-27

## Ergebnis

Der Web-Kern startet frisch ueber `http://127.0.0.1:8765/`, rendert den
Wachhof sichtbar und bleibt nach Speicher-, Titel- und Editor-Smoke-Test ohne
Browserwarnungen oder Fehler. Der Godot-Kernexport wurde nach den Aenderungen
neu erzeugt.

## Heute stabilisiert

- Ausgangshinweis `UP` erscheint nur noch, wenn Ra horizontal und auf der
  passenden Hoehe am Ausgang steht.
- Gegner merken sich nun explizit, wenn ihr Pfad ueber eine Treppe laeuft.
- Gegner werden auf Treppen sanft zur begehbaren Spurmitte gefuehrt.
- Rueckstoss von Gegnern auf Treppen nutzt die feinere, segmentierte Bewegung,
  damit Treffer sie nicht in Treppenflanken einklemmen.
- Der Browser-Cache-Buster der Hauptdatei wurde auf
  `core-pass-2026-07-27` gesetzt.
- Die Kernpruefung schuetzt die neue Treppenfuehrung und die Hoehenbindung des
  Ausgangshinweises gegen spaetere Rueckschritte.

## Automatisch geprueft

- `tools/verify-core.mjs`
- `tools/export-godot-core.mjs`
- Syntaxpruefung aller 20 JavaScript- und MJS-Dateien
- 275 HTML-IDs ohne fehlende Referenzen
- 40 Assets und 31 GLB-Modelle
- zwei Waffen mit je fuenf Kombos plus Aufladeangriff
- drei Gegnertypen, vier Raeume und sechs Wellen
- zehn Godot-Module und vier Migrationsphasen
- Drei-Slot-Spielstandvertrag inklusive Sicherung
- Treppenflanken, Gegner-Treppenfuehrung und Exit-Hoehenpruefung

## Im Browser geprueft

- Startscreen mit drei leeren Slots
- neues Spiel in Slot 1
- sichtbare Wachhof-Szene mit HUD, Mauer, Treppe, Licht und Aktionsbuttons
- Interaktionsprompt am Start versteckt
- manuelles Speichern aus dem Spielmenue
- Rueckkehr zum Titelbildschirm
- Slotvorschau nach dem Speichern
- zweistufiges Loeschen des Testslots
- Werkstatt-/Editorstart aus dem Titelbildschirm
- Build-Panel, Raumwahl, Assetwahl und Bauen/Wellen-Umschaltung
- Browserkonsole ohne Warnungen und Fehler

## Noch bewusst offen fuer den Abendtest

- Voller echter Durchlauf durch alle vier Raeume mit eigener Spielweise
- Kampffeingefuehl bei langen Kombos, Kamera und Kantenwechseln
- Gegnerverhalten an Treppen unter Druck mit mehreren Akteuren gleichzeitig
- Level-4-Enterhakenfluss mit Schlucht, Anker und Hoehenwechsel
- Truheninhalte und Equipment-Funde in frei gebauten Raeumen

## Godot-Hinweis

Die heutige Treppen- und Exit-Logik gehoert spaeter in Godot in den
`HeightResolver`, `TransitionDirector` und die Gegnernavigation. Fuer den
Godot-Prototyp ist wichtig: Durchgangsmarker duerfen nicht nur horizontal,
sondern muessen auch ueber die aktuelle Hoehe validiert werden.
