# Wachtbruch erweitern

## Das Grundmodell

Wachtbruch trennt drei Arten von Code:

1. **Kataloge** beschreiben Inhalte: Werte, IDs, Modelle und Zuordnungen.
2. **Systeme** fuehren Verhalten aus: Kampf, KI, Loot, Navigation und Editor.
3. **Adapter** verbinden die Systeme spaeter mit Three.js oder Godot.

Eine stabile ID wird gespeichert. Anzeigenamen duerfen spaeter geaendert oder
uebersetzt werden, IDs nicht. Deshalb heisst ein Gegner intern zum Beispiel
`orc-spear-thrower`, waehrend sein sichtbarer Name frei bleibt.

## Aktuelle Erweiterungspunkte

| Inhalt | Datei | Bereits datengetrieben | Noch Laufzeitcode |
| --- | --- | --- | --- |
| Musik | `modules/audio/music-manager.js` | Titel, Datei, Lautstaerke, Raum | Kampfmusik-Zustaende |
| Raeume und Wellen | `modules/catalog/rooms.js` | IDs, Namen, Wellenwerte | mitgelieferte Kartenlayouts |
| Angriffe | `modules/catalog/attacks.js` | Schaden, Wucht, Animation, Timing, Reichweite, Kegel | neue Komboformen und Speziallogik |
| Gegner | `modules/catalog/enemies.js` | Modell, Leben, Beute, Waffe, KI-Typ | neue KI-Typen und Spezialfaehigkeiten |
| Assets | `modules/catalog/assets.js` | Modell, Name, Editorgruppe, Spezialdefinition, Kollision, Begehbarkeit, Enterhaken | komplexe Laufzeitinteraktionen |
| Progress | `modules/progression/run-upgrades.js` | Lauf-Upgrades, Preise, Stapelwerte, Effekte | allgemeiner Skill- und Itemkatalog |
| Fundausruestung | `modules/progression/equipment-unlocks.js` | Freischaltung und Anlegestatus von Helm und Enterhaken | allgemeiner Ausruestungs- und Speicherstand |
| Charaktere | noch offen | dekorative Figuren als Asset | spielbare Charakterprofile |
| Gegenstaende und Loot | `modules/loot/chest-drops.js` | feste Truhenbelohnung | allgemeiner Item- und Loot-Tabellenkatalog |
| Raumformat | `modules/world/room-format.js` | Layoutversion, Wellen, Gegnerzuordnung | Hoehen- und Traversal-Vertraege |
| Editorverlauf | `modules/editor/history.js` | Undo/Redo-Snapshots und getrennte Raumverlaeufe | Auswahl- und Transformationskommandos |

## Spielansicht und Dev-Werkzeuge

Wachtbruch startet mit einer ruhigen Spielleiste. Bauwerkzeuge, Tageszeit,
Pixellicht, Regen, Kamerawerkzeug und die Ausruestbank sind verborgen. Der
Schalter mit dem Code-Symbol oeffnet oder schliesst alle Entwicklerwerkzeuge.
Beim Schliessen bleiben Karten- und Socket-Daten erhalten.

Fuer einen direkten Entwicklungsstart kann die URL `?dev=1` enthalten. Mit
`?dev=0` startet die Seite sicher in der Spielansicht. Der Zustand wird ansonsten
nur fuer die aktuelle Browser-Sitzung gespeichert.

## Fundausruestung an eine Siegestruhe binden

Helm und Enterhaken besitzen keine feste Weltposition. Ihr Fund ist Teil der
ausgewaehlten Truhe:

1. Im Setzsystem eine Truhe auswaehlen.
2. `Siegestruhe dieses Raums` aktivieren.
3. Unter `Truheninhalt` den `Wachthelm` oder `Enterhaken` waehlen.
4. Den Raum speichern.

Pro Raum kann genau eine Truhe als Siegestruhe markiert sein. Sie wird erst nach
der letzten bestandenen Welle freigegeben. Der Wachthelm erscheint danach im
Inventar und kann an- oder abgelegt werden. Der Enterhaken wird als Werkzeug
freigeschaltet und aktiviert seinen Kampf- und Traversal-Knopf.

## Ein neues 3D-Asset hinzufuegen

1. Die GLB-Datei nach `vendor/kenney-mini-dungeon/Models/GLB format` legen.
2. Der Dateiname ohne `.glb` wird die stabile Asset-ID.
3. In `modules/catalog/assets.js` einen Eintrag zu `BASE_ASSETS` hinzufuegen:

```js
{
  id: 'statue-guardian',
  label: 'Statue der alten Wacht',
  group: 'Ausstattung',
  loadModel: true,
  solid: true,
  grapple: true
}
```

Der Modelllader und die Editorpalette werden daraus automatisch aufgebaut.
Die optionalen Schalter `solid`, `walkable` und `grapple` erzeugen automatisch
die Listen fuer Kollision, begehbare Oberflaechen und Enterhaken-Ziele. Eine
reine Dekoration laesst diese drei Felder weg.

Gueltige Gruppen sind: `Boden`, `Architektur`, `Holz und Lager`,
`Ausstattung`, `Figuren`, `Gegner` und `Systemmarker`.

## Einen Gegner mit vorhandener KI hinzufuegen

In `modules/catalog/enemies.js` einen neuen Eintrag anlegen:

```js
'orc-heavy': freezeEnemy({
  id: 'orc-heavy',
  editorAssetId: 'enemy-heavy',
  editorLabel: 'Schwerer Ork',
  model: 'character-orc',
  animation: 'idle',
  scale: 1.25,
  combat: {
    name: 'Schwerer Ork',
    health: 6,
    coinReward: 6,
    weapon: 'weapon-sword',
    attackType: 'melee'
  }
})
```

Die Editorpalette uebernimmt ihn automatisch. Unterstuetzte Verhaltensarten
sind derzeit `melee`, `ranged` und `boss`. Ein neuer Typ wie `healer`,
`teleporter` oder `summoner` braucht spaeter ein eigenes KI-Modul und wird dann
ueber `attackType` registriert.

Verwendet der Gegner ein neues Modell, muss dieses Modell zuerst als ladbares
Asset in `assets.js` eingetragen werden.

## Eine vorhandene Angriffskette veraendern

Die Kombinationen liegen in `modules/catalog/attacks.js`. Jeder Schritt besitzt:

- `id`: stabile interne ID
- `profile`: derzeit `attack1` bis `attack6`
- `animation`: Name der Animation im GLB
- `duration`: Gesamtdauer in Sekunden
- `animationSpeed`: Wiedergabegeschwindigkeit
- `damage`: Schaden gegen Gegner
- `destructibleDamage`: optionaler Schaden gegen Fässer, Truhen und andere Objekte
- `knockback`: Rueckstossstaerke
- `hitStart` und `hitEnd`: aktives Trefferfenster von 0 bis 1
- `rangeCells`: Reichweite in Rasterzellen
- `cone`: erlaubter Angriffswinkel
- `lungeCells`, `lungeStart` und `lungeEnd`: Vorwaertsbewegung im Angriff
- `chainAt`: fruehester Zeitpunkt fuer den naechsten Kettenschritt
- `holdOnly`: Angriff wird nur durch Gedrueckthalten ausgeloest
- `chargeAnimation` und `chargeEnd`: Animation und Ende der Aufladephase

Der Katalog prueft beim Start ungueltige Trefferfenster und Zahlen. Die aktuelle
UI, Ausruestungsbank und Effekte kennen dieselben sechs Profile. `attack1` bis
`attack5` bilden die normale Kette. `attack4` und `attack5` sind die beiden
gegenlaeufigen Horizontalschlaege. `attack6` ist bei Schwert und Speer der
aufladbare Rundumschlag und wird nicht automatisch an die normale Kette
angehaengt. Neue Profilnamen muessen weiterhin gemeinsam in Katalog,
Ausruestungsbank, Effektkonfiguration und Kampfsteuerung registriert werden.

Die Progress-Upgrades veraendern diese Werte zur Laufzeit zentral. Deshalb
sollten neue Grundwerte zuerst im Katalog stehen und nicht direkt in der
Trefferabfrage.

## Godot-Migration vorbereiten

Die konkrete Zielstruktur steht in `docs/GODOT_MODULARITAET.md`. Die maschinenlesbare
Modulkarte liegt in `modules/godot/migration-manifest.js` und wird von
`tools\verify-core.cmd` mitgeprueft.

Mit `tools\export-godot-core.cmd` wird der aktuelle Kernvertrag nach
`exports/godot/wachtbruch-core-data.json` geschrieben. Dieses Paket enthaelt
Assets, Angriffe, Gegner, Kernraeume, Lauf-Upgrades und Truhen-Drops ohne
Three.js-Objekte oder DOM-Zustand.

Fuer neue Inhalte gilt deshalb:

1. Erst stabile IDs und Katalogdaten anlegen.
2. Dann pruefen, ob das spaetere Godot-Resource-Feld schon im Blueprint existiert.
3. Erst danach Laufzeitverhalten in `scene.js` oder spaeter einem Modul ergaenzen.

## Einen ausgelieferten Raum hinzufuegen

In `modules/catalog/rooms.js` einen Eintrag mit eindeutiger Raum-ID und
eindeutigen Wellen-IDs ergaenzen. Die Funktion
`createDefaultRoomDefinitions()` erzeugt daraus veraenderbare Laufzeitdaten.

Im Editor erzeugte Raeume werden weiterhin lokal gespeichert. Ein Raum im
Katalog ist die mit dem Spiel ausgelieferte Vorgabe; sein Kartenlayout wird noch
nicht aus diesem Modul geladen. Das wird zusammen mit der Speicherstruktur
modularisiert.

## Ein spielbares Charakterprofil braucht spaeter

Ein Charakter ist mehr als ein Modell. Der geplante Charakterkatalog braucht:

```js
{
  id: 'ra',
  model: 'character-human',
  animations: { idle: 'idle', run: 'sprint', attack1: 'attack-melee-right' },
  equipmentSockets: 'ra-default',
  collider: { radius: 0.39, height: 1.4 },
  stats: { health: 6, speed: 1, stamina: 1 },
  startingEquipment: ['sword', 'shield'],
  portrait: 'ra'
}
```

Erst wenn Spielersteuerung, Animation und Equipment auf dieses Profil zugreifen,
kann ein zweiter spielbarer Charakter gefahrlos nur durch Daten ergaenzt werden.

## Weitere spaetere Kataloge

- Items, Waffenwerte, Ruestung und Loot-Tabellen
- Faehigkeiten, Statuswerte und Elemente
- VFX-, Partikel- und Soundprofile
- Fallen und allgemeine Interaktionen
- Fortschritt, Upgrades und Preise
- UI-Symbole, Texte und Uebersetzungen
- Biome, Licht, Wetter und Umgebungsgeraeusche
- Quests, Dialoge und Ereignisbedingungen
- Eingabebelegung fuer Tastatur, Gamepad und Mobilgeraete

## Sichere Arbeitsweise

Nach jeder Erweiterung mindestens pruefen:

1. `tools\verify-core.cmd` ausfuehren.
2. Seite ohne Konsolenfehler laden.
3. Asset oder Gegner im Editor setzen und speichern.
4. Raum neu laden und gespeicherte ID kontrollieren.
5. Im Dev-Pruefmodus jeden betroffenen Raum und jede betroffene Welle direkt starten.
6. Kampf starten und Treffer, Kollision sowie Beute pruefen.
7. Einen alten Speicherstand laden und den Sicherungsrueckfall beachten.

Wenn eine Erweiterung mehr als einen Katalog und ein System gleichzeitig
veraendert, zuerst ein Backup anlegen und den Schritt teilen.
