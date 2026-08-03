# Wachtbruch: Godot-Modularitaet

## Ziel

Der Web-Prototyp bleibt der fuehlbare Kern. Godot wird nicht als Neustart
gedacht, sondern als zweite Runtime fuer dieselben stabilen Daten:

- IDs bleiben gleich.
- Raum- und Einstellungsstaende bleiben versioniert.
- Angriffswerte, Gegner, Assets und Wellen werden zuerst als Resources
  abgebildet.
- Erst danach werden Bewegung, Kampf, Loot und Editor als Godot-Systeme gebaut.

Die technische Modulkarte liegt in
`modules/godot/migration-manifest.js` und wird von `tools/verify-core.mjs`
mitgeprueft.

## Daten zuerst

Diese Dateien sind ab jetzt der Kernvertrag:

| Bereich | Web-Quelle | Godot-Ziel | Godot-Form |
| --- | --- | --- | --- |
| Assets | `modules/catalog/assets.js` | `res://game/content/assets` | `BuildAssetDefinition.tres` |
| Angriffe | `modules/catalog/attacks.js` | `res://game/content/attacks` | `AttackDefinition.tres` |
| Kampftuning | `modules/combat/tuning.js` | `res://game/content/combat` | `CombatTuningProfile.tres` |
| Trefferprofile | `modules/combat/hit-reactions.js` | `res://game/content/combat/hit_reactions` | `HitReactionProfile.tres` |
| Gegner | `modules/catalog/enemies.js` | `res://game/content/enemies` | `EnemyDefinition.tres` |
| Raeume/Wellen | `modules/catalog/rooms.js` | `res://game/content/rooms` | `RoomDefinition.tres` |
| Raumformat | `modules/world/room-format.js` | `res://game/content/rooms` | `RoomLibraryBundle`, `PlacementData` |
| Lauf-Upgrades | `modules/progression/run-upgrades.js` | `res://game/content/progression` | `RunUpgradeDefinition.tres` |
| Truhen-Drops | `modules/loot/chest-drops.js` | `res://game/content/loot` | `ChestDropDefinition.tres` |
| Editorverlauf | `modules/editor/history.js` | `res://addons/wachtbruch_editor/state` | `EditorHistoryBundle` |
| Speicher | `modules/persistence/save-slots.js`, `modules/persistence/storage.js` | `res://game/save` und `user://wachtbruch` | `GameSaveSlot`, `SaveSlotManager`, `SaveMigrator` |
| Musik | `modules/audio/music-manager.js` | `res://game/audio` | `MusicTrackDefinition`, `MusicDirector` |

Wichtig: Anzeigenamen duerfen sich aendern. IDs nicht. Godot speichert dieselben
IDs, damit Web-Export, Godot-Import und alte Spielstaende zusammenpassen.

## Maschinenlesbarer Kernexport

Der aktuelle Datenvertrag kann ohne Browser erzeugt werden:

```bat
tools\export-godot-core.cmd
```

Das Ergebnis liegt unter
`exports/godot/wachtbruch-core-data.json` und besitzt das Schema
`wachtbruch-godot-core`, Version 4. Es enthaelt:

- Zell- und Ebenenmasse
- Assetdefinitionen
- beide Angriffssaetze
- Gegnerprofile
- Kernraeume und Wellen
- Lauf-Upgrades samt Effekten
- feste Truhen-Drop-Typen
- den versionierten Vertrag fuer drei Spielstand-Slots

`tools\verify-core.cmd` prueft zusaetzlich, dass dieses Paket vollstaendig
JSON-serialisierbar bleibt.

## Runtime-Module in Godot

### `res://game/world`

Besitzt:

- Rauminstanzen und Placement-Daten
- Hoehenebenen
- Stufen und Kanten
- Abgrundfelder
- Ankunftspunkte und Durchgaenge mit Hoehenpruefung
- sichere Spawnpunkte

Kern-Nodes:

- `WorldRoot`
- `RoomInstance`
- `HeightResolver`
- `TransitionDirector`
- `TraversalSurface`

Der `TransitionDirector` prueft Durchgaenge nicht nur ueber X/Z-Nahe,
sondern auch ueber die aktuelle Hoehe des Spielers. So erscheint ein
Durchgangshinweis nicht, wenn der Spieler zwar horizontal nahe, aber auf einer
anderen Ebene steht.

Erste Aufgabe in Godot: Ein Raum mit Boden, Wand, Treppe, Ausgang und sauberem
Spawn. Wenn das nicht perfekt laeuft, wird kein weiterer Umfang uebertragen.

### `res://game/combat`

Besitzt:

- Trefferfenster
- Reichweiten
- Schaden, Wucht und Hitstop
- geblockte, leichte, schwere und umgebungsbedingte Trefferprofile
- exportierbare Spieler-/Ork-Kampfprofile
- Gegnerzustand
- Wellenablauf
- Bossphasen
- Fallen

Kern-Nodes:

- `PlayerCombat`
- `AttackController`
- `HitResolver`
- `EnemyBrain`
- `WaveDirector`
- `BossPhaseController`
- `TrapController`

Godot bekommt keine hart codierten Angriffe. Es liest `AttackDefinition`
Resources, die aus dem Web-Katalog entstehen. Das Kampflabor exportiert dazu
ein `CombatTuningProfile`, das Angriffstempo, Trefferwirkung und den Rhythmus
des Schwert-Orks zusammenhaelt. `HitReactionProfile` trennt davon die
Reaktionsdauer, den Bewegungsimpuls und die Feedbackstaerke. Der verbindliche
Referenzablauf steht in `docs/COMBAT_CORE_V1.md`.

### `res://game/progression`

Besitzt:

- Muenzen
- Magnet
- Truheninhalt
- Versorgung nach Boss oder Raum
- Lauf-Upgrades
- feste und spaeter zufaellige Belohnungen

Kern-Nodes:

- `LootDirector`
- `CoinMagnet`
- `ChestReward`
- `RunProgression`
- `SupplyScreen`

Progress darf die Kampfwerte beeinflussen, aber nicht selbst Treffer suchen.
Die Grenze bleibt: Progress veraendert Werte, Combat loest Treffer.

### `res://game/equipment`

Besitzt:

- Waffen- und Schild-Sockets
- Ruecken-Sockets fuer den Enterhakenflug
- Animationsprofile
- Angriffstempo-Feintuning
- Schwungwinkel
- Leuchten
- Partikelpositionen

Kern-Nodes:

- `EquipmentRig`
- `AttachmentSocket`
- `AttackAnimator`
- `AttachmentEditor`

Die Ausruestbank ist damit kein Spielmenue, sondern ein Werkzeug fuer
Animationsdaten. Spaeter wird daraus in Godot zuerst ein internes Dev-Panel.

### `res://game/ui`

Besitzt:

- HUD
- Interaktionshinweise
- Inventar
- Versorgungsauswahl
- Controller-Fokus
- Dev-Menue

Kern-Nodes:

- `HudController`
- `InteractionPrompt`
- `PanelFocusRouter`
- `InputGlyphs`
- `InventoryPanel`
- `DeveloperMenu`

Leitlinie: Controller und Tastatur muessen ohne Maus durch jedes echte
Spielmenue kommen. Editor-Werkzeuge duerfen getrennt bleiben.

### `res://game/save`

Besitzt:

- genau drei unabhaengige Spielstand-Slots
- aktuellen Raum, sicheren Checkpoint und Blickrichtung
- Leben, Ausdauer, Muenzen, Traenke und aktive Waffe
- Lauf-Upgrades sowie gefundene und angelegte Ausruestung
- erledigte Raeume, geoeffnete Belohnungstruhen und besiegte Bosse
- noch nicht eingesammelte Muenzen
- Spielzeit, Vorschau und Speicherdatum
- eine letzte gueltige Sicherung pro Slot

Kern-Nodes:

- `SaveSlotManager`
- `SaveGameSerializer`
- `CheckpointDirector`
- `SaveMigrator`

Gespeichert wird nur an stabilen Punkten: bei einem neuen Lauf, nach
Raumankunft, nach gesichertem Raum, nach einer Belohnung oder Versorgung,
bei sicherer Ausruestungsaenderung, manuell ausserhalb eines Kampfes und beim
Rueckweg zum Titel. Aktive Gegnerwellen werden bewusst nicht mitten im Zustand
eingefroren.

### `res://addons/wachtbruch_editor`

Besitzt:

- Raumeditor
- Asset-Palette
- Setzen, Bewegen, Loeschen
- Transformationswerte
- Welleneditor
- Diagnoseansicht

Kern-Nodes:

- `RoomEditorPlugin`
- `PlacementTool`
- `WaveEditor`
- `DiagnosticsOverlay`
- `RoomExportImport`

Das Editor-Addon speichert weiterhin serialisierbare Placement-Daten, keine
direkten Node-Referenzen.

## Vier Migrationsphasen

### Phase 1: Datenvertrag einfrieren

Ziel: Kataloge und Speicher bleiben stabil.

Bereiche:

- `content-catalogs`
- `persistence`
- `qa-verification`

Ergebnis:

- Godot-Resource-Formate sind definiert.
- Web-Kataloge koennen in Godot-Daten ueberfuehrt werden.
- Das Kampflabor-Profil kann als JSON fuer Godot exportiert werden.
- `verify-core` prueft Kataloge, Profilgrenzen und Neustart-Speicherung.

### Phase 2: Ein spielbarer Runtime-Schnitt

Ziel: Ein Raum in Godot fuehlt sich spielbar an.

Bereiche:

- `world-runtime`
- `combat-runtime`
- `loot-progression`
- `ui-input`

Ergebnis:

- Spieler bewegt sich.
- Das Referenzduell gegen einen Schwert-Ork trifft und reagiert wie im Web-Labor.
- Komboketten verwenden `chainAt`; die Kamera folgt der Eingaberichtung und
  nicht der kurzfristigen Angriffsrotation.
- Eine Truhe oder Muenze funktioniert.
- Ein Ausgang bringt den Spieler zum naechsten Raum.

### Phase 3: Setzsystem als Godot-Werkzeug

Ziel: Der Editor kann dieselben Daten erzeugen wie der Web-Prototyp.

Bereiche:

- `editor-tools`
- `equipment-animation`

Ergebnis:

- Objekte lassen sich setzen, transformieren und speichern.
- Wellen koennen pro Raum bearbeitet werden.
- Diagnoseansichten zeigen Kollision, Marker, Licht und Radien.

### Phase 4: Gefuehl angleichen

Ziel: Web- und Godot-Version fuehlen sich bewusst gleich an.

Bereiche:

- `audio-runtime`
- `equipment-animation`
- `qa-verification`

Ergebnis:

- Musikzustand, Sounds, Kamera, Trefferfeedback, Partikel und Attacken-Timing
  sind aufeinander abgestimmt.

## Was jetzt nicht weiter zerlegt werden sollte

- `scene.js` noch nicht brutal aufsplitten. Der Web-Prototyp ist gerade unser
  schneller Fuehltest.
- Keine neuen Speicherformate ohne Migration.
- Keine grossen Asset-Umbenennungen.
- Keine Godot-Editorarbeit, bevor der Runtime-Schnitt in einem Raum stabil ist.
- Keine tiefen Boss- oder Skill-Systeme, bevor Treffer, Stufen und Ausgang
  wirklich sauber bleiben.

## Naechster sauberer Schnitt im Web-Prototyp

Bereits getrennt sind Progression, Raumformat, feste Truhen-Drops sowie der
serialisierbare, raumbezogene Editorverlauf. Die naechste risikoarme
Aufteilung ist:

1. Auswahl- und Transformationsaktionen als reine Editorkommandos
2. Ausruestungsprofile als eigenes Datenmodul
3. Eingabeaktionen und Controller-Zuordnung als Datenvertrag
4. Sound-Cues getrennt von ihrer Web-Audio-Ausgabe

Bewegung, Stufen, Kanten, Trefferaufloesung und Gegnernavigation werden erst
verschoben, wenn dafuer deterministische Laufzeittests existieren.

## Godot-Resource-Skizzen

### `AttackDefinition.gd`

```gdscript
class_name AttackDefinition
extends Resource

@export var id: String
@export var profile: String
@export var damage: int = 1
@export var destructible_damage: int = 1
@export var knockback: float = 0.0
@export var duration: float = 0.4
@export var animation: String
@export var animation_speed: float = 1.0
@export_range(0.0, 1.0) var hit_start: float = 0.25
@export_range(0.0, 1.0) var hit_end: float = 0.65
@export var range_cells: float = 1.0
@export var cone: float = 0.0
@export var lunge_cells: float = 0.0
@export var chain_at: float = 0.8
@export var hold_only: bool = false
```

### `BuildAssetDefinition.gd`

```gdscript
class_name BuildAssetDefinition
extends Resource

@export var id: String
@export var label: String
@export var group: String
@export var model_path: String
@export var solid: bool = false
@export var walkable: bool = false
@export var grapple: bool = false
@export var marker_type: String = ""
```

### `CombatTuningProfile.gd`

```gdscript
class_name CombatTuningProfile
extends Resource

@export var schema: String = "wachtbruch-combat-tuning"
@export var version: int = 1
@export var attack_profile: AttackDefinition
@export var animation_speed_multiplier: float = 1.0
@export var range_multiplier: float = 1.0
@export_range(0.0, 1.0) var hit_start: float = 0.25
@export_range(0.0, 1.0) var hit_end: float = 0.65
@export var lunge_multiplier: float = 1.0
@export var impact_multiplier: float = 1.0
@export var combo_pause_seconds: float = 0.05
@export var enemy_windup_seconds: float = 0.38
@export var enemy_active_seconds: float = 0.40
@export var enemy_recovery_seconds: float = 0.18
@export var enemy_cooldown_seconds: float = 0.76
@export var hit_stop_multiplier: float = 1.0
@export var slow_motion_multiplier: float = 1.0
@export var camera_shake_multiplier: float = 1.0
```

### `RoomDefinition.gd`

```gdscript
class_name RoomDefinition
extends Resource

@export var id: String
@export var display_name: String
@export var waves: Array[WaveDefinition] = []
```

### `PlacementData.gd`

```gdscript
class_name PlacementData
extends Resource

@export var asset_id: String
@export var x: int
@export var z: int
@export var level: int
@export var rotation: float
@export var offset_x: float = 0.0
@export var offset_z: float = 0.0
@export var scale: float = 1.0
@export var settings: Dictionary = {}
```

### `GameSaveSlot.gd`

```gdscript
class_name GameSaveSlot
extends Resource

@export var schema: String = "wachtbruch-game-save"
@export var version: int = 1
@export_range(1, 3) var slot: int = 1
@export var created_at: String
@export var saved_at: String
@export var play_seconds: float = 0.0
@export var summary: Dictionary = {}
@export var checkpoint: Dictionary = {}
@export var player: Dictionary = {}
@export var progression: Dictionary = {}
@export var world: Dictionary = {}
```

## Pruefregel fuer jede Migration

Ein Teil gilt erst als uebertragen, wenn diese vier Dinge passen:

1. Die Daten koennen aus dem Web-Vertrag erzeugt werden.
2. Godot kann sie laden, ohne IDs umzuschreiben.
3. Eine kleine Testszene zeigt das Verhalten.
4. Der Web-Prototyp bleibt danach weiter startbar.
