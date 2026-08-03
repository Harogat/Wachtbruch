const GODOT_MODULES = [
  {
    id: 'content-catalogs',
    currentSource: 'modules/catalog',
    godotTarget: 'res://game/content',
    responsibility: 'Stabile IDs, Namen, Modelle, Raumvorgaben und Kampfwerte.',
    dataOwned: ['assets', 'attacks', 'enemies', 'rooms'],
    runtimeOwned: [],
    dependsOn: []
  },
  {
    id: 'world-runtime',
    currentSource: 'scene.js, modules/world/room-format.js',
    godotTarget: 'res://game/world',
    responsibility: 'Raumaufbau, Hoehen, Stufen, Abgruende, Ankunftspunkte und Durchgaenge.',
    dataOwned: ['room_layout', 'room_library', 'wave_assignments', 'height_level', 'system_markers'],
    runtimeOwned: ['WorldRoot', 'HeightResolver', 'TransitionDirector'],
    dependsOn: ['content-catalogs', 'persistence']
  },
  {
    id: 'combat-runtime',
    currentSource: 'scene.js, modules/combat/tuning.js, modules/combat/hit-reactions.js, modules/combat/weapon-rebound.js',
    godotTarget: 'res://game/combat',
    responsibility: 'Spielerangriffe, Gegner-KI, Trefferfenster, Kampfprofile, Bossphasen, Fallen und Wellen.',
    dataOwned: ['attack_sets', 'combat_tuning_profiles', 'hit_reaction_profiles', 'weapon_rebound_profile', 'enemy_profiles', 'wave_rules'],
    runtimeOwned: ['PlayerCombat', 'EnemyBrain', 'WaveDirector', 'HitResolver'],
    dependsOn: ['content-catalogs', 'world-runtime']
  },
  {
    id: 'loot-progression',
    currentSource: 'scene.js, modules/progression/run-upgrades.js, modules/progression/equipment-unlocks.js, modules/loot/chest-drops.js',
    godotTarget: 'res://game/progression',
    responsibility: 'Muenzen, Magnet, Truhen, Ausruestungsfunde, Versorgung, Lauf-Upgrades und Belohnungen.',
    dataOwned: ['run_upgrades', 'run_progress_state', 'equipment_unlocks', 'equipment_progress_state', 'chest_drops', 'loot_tables'],
    runtimeOwned: ['LootDirector', 'RunProgression', 'SupplyScreen'],
    dependsOn: ['content-catalogs', 'combat-runtime', 'persistence']
  },
  {
    id: 'equipment-animation',
    currentSource: 'scene.js',
    godotTarget: 'res://game/equipment',
    responsibility: 'Sockets, Waffenlage, Schildlage, Schwungeffekte, Leuchten und Vorschauwerte.',
    dataOwned: ['equipment_sockets', 'hook_back_sockets', 'attack_fx', 'attack_speed', 'attack_feel'],
    runtimeOwned: ['EquipmentRig', 'AttackAnimator', 'AttachmentEditor'],
    dependsOn: ['content-catalogs', 'persistence']
  },
  {
    id: 'audio-runtime',
    currentSource: 'modules/audio/music-manager.js',
    godotTarget: 'res://game/audio',
    responsibility: 'Raummusik, Kampfstart, Kampfloop, Siegcue und spaeter Soundgruppen.',
    dataOwned: ['music_tracks', 'sound_cues'],
    runtimeOwned: ['MusicDirector', 'SoundBusRouter'],
    dependsOn: ['content-catalogs']
  },
  {
    id: 'editor-tools',
    currentSource: 'scene.js, modules/editor/history.js',
    godotTarget: 'res://addons/wachtbruch_editor',
    responsibility: 'Setzsystem, Auswahl, Transformation, Welleneditor, Diagnoseansichten und Dev-Schalter.',
    dataOwned: ['editor_state', 'editor_history', 'diagnostic_layers'],
    runtimeOwned: ['RoomEditorPlugin', 'PlacementTool', 'DiagnosticsOverlay'],
    dependsOn: ['content-catalogs', 'world-runtime', 'persistence']
  },
  {
    id: 'ui-input',
    currentSource: 'index.html, scene.js',
    godotTarget: 'res://game/ui',
    responsibility: 'HUD, Interaktionshinweise, Inventar, Controllerfuehrung, Panels und Menuefokus.',
    dataOwned: ['ui_labels', 'input_actions'],
    runtimeOwned: ['HudController', 'PanelFocusRouter', 'InputGlyphs'],
    dependsOn: ['combat-runtime', 'loot-progression']
  },
  {
    id: 'persistence',
    currentSource: 'modules/persistence/storage.js, modules/persistence/save-slots.js',
    godotTarget: 'res://game/save',
    responsibility: 'Drei versionierte Spielstaende, Sicherungen, aktive Slotwahl, Einstellungen, Migrationen, Import und Export.',
    dataOwned: ['save_versions', 'game_save_slots', 'active_save_slot', 'settings_bundle', 'room_library'],
    runtimeOwned: ['SaveRepository', 'SaveSlotManager', 'SaveMigrator'],
    dependsOn: []
  },
  {
    id: 'qa-verification',
    currentSource: 'tools/verify-core.mjs, scene.js',
    godotTarget: 'res://tests',
    responsibility: 'Kernpruefung, Kampflabor, Katalogvalidierung, Speicherfallback und spaeter Godot-Playmode-Checks.',
    dataOwned: ['test_contracts', 'combat_lab_metrics'],
    runtimeOwned: ['CoreContractTests', 'CombatTuningLab', 'PlayModeSmokeTests'],
    dependsOn: ['content-catalogs', 'combat-runtime', 'persistence']
  }
];

export const GODOT_MIGRATION_MANIFEST = Object.freeze(GODOT_MODULES.map((module) => Object.freeze({
  ...module,
  dataOwned: Object.freeze([...module.dataOwned]),
  runtimeOwned: Object.freeze([...module.runtimeOwned]),
  dependsOn: Object.freeze([...module.dependsOn])
})));

export const GODOT_RESOURCE_BLUEPRINT = Object.freeze({
  asset: Object.freeze({
    resource: 'BuildAssetDefinition',
    source: 'modules/catalog/assets.js',
    targetDirectory: 'res://game/content/assets',
    stableIdField: 'id'
  }),
  attack: Object.freeze({
    resource: 'AttackDefinition',
    source: 'modules/catalog/attacks.js',
    targetDirectory: 'res://game/content/attacks',
    stableIdField: 'id'
  }),
  combatTuning: Object.freeze({
    resource: 'CombatTuningProfile',
    source: 'modules/combat/tuning.js',
    targetDirectory: 'res://game/content/combat',
    stableIdField: 'schema'
  }),
  hitReaction: Object.freeze({
    resource: 'HitReactionProfile',
    source: 'modules/combat/hit-reactions.js',
    targetDirectory: 'res://game/content/combat/hit_reactions',
    stableIdField: 'id'
  }),
  weaponRebound: Object.freeze({
    resource: 'WeaponReboundProfile',
    source: 'modules/combat/weapon-rebound.js',
    targetDirectory: 'res://game/content/combat/weapon_rebound',
    stableIdField: 'schema'
  }),
  enemy: Object.freeze({
    resource: 'EnemyDefinition',
    source: 'modules/catalog/enemies.js',
    targetDirectory: 'res://game/content/enemies',
    stableIdField: 'id'
  }),
  room: Object.freeze({
    resource: 'RoomDefinition',
    source: 'modules/catalog/rooms.js',
    targetDirectory: 'res://game/content/rooms',
    stableIdField: 'id'
  }),
  roomFormat: Object.freeze({
    resource: 'RoomLibraryBundle',
    source: 'modules/world/room-format.js',
    targetDirectory: 'res://game/content/rooms',
    stableIdField: 'version'
  }),
  runUpgrade: Object.freeze({
    resource: 'RunUpgradeDefinition',
    source: 'modules/progression/run-upgrades.js',
    targetDirectory: 'res://game/content/progression',
    stableIdField: 'id'
  }),
  equipmentUnlock: Object.freeze({
    resource: 'EquipmentUnlockDefinition',
    source: 'modules/progression/equipment-unlocks.js',
    targetDirectory: 'res://game/content/progression/equipment',
    stableIdField: 'id'
  }),
  chestDrop: Object.freeze({
    resource: 'ChestDropDefinition',
    source: 'modules/loot/chest-drops.js',
    targetDirectory: 'res://game/content/loot',
    stableIdField: 'id'
  }),
  coreBundle: Object.freeze({
    resource: 'WachtbruchCoreBundle',
    source: 'modules/godot/content-bundle.js',
    targetDirectory: 'res://game/content/import',
    stableIdField: 'schema'
  }),
  editorHistory: Object.freeze({
    resource: 'EditorHistoryBundle',
    source: 'modules/editor/history.js',
    targetDirectory: 'res://addons/wachtbruch_editor/state',
    stableIdField: 'schema'
  }),
  save: Object.freeze({
    resource: 'SaveBundle',
    source: 'modules/persistence/save-slots.js',
    targetDirectory: 'user://wachtbruch',
    stableIdField: 'slot'
  })
});

export const GODOT_MIGRATION_PHASES = Object.freeze([
  Object.freeze({
    id: 'phase-1-data',
    title: 'Datenvertrag einfrieren',
    goal: 'Kataloge, Speicherformat, Angriffswerte und Kampfprofile bleiben stabil und testbar.',
    modules: Object.freeze(['content-catalogs', 'persistence', 'qa-verification'])
  }),
  Object.freeze({
    id: 'phase-2-runtime-slice',
    title: 'Spielbarer Runtime-Schnitt',
    goal: 'Das Kampflabor-Duell mit einem Raum, Spieler, Gegner, Treffer, Loot und Durchgang in Godot nachbauen.',
    modules: Object.freeze(['world-runtime', 'combat-runtime', 'loot-progression', 'ui-input'])
  }),
  Object.freeze({
    id: 'phase-3-editor-slice',
    title: 'Setzsystem uebertragen',
    goal: 'Raumeditor als Godot-Addon mit denselben Placement-Daten aufbauen.',
    modules: Object.freeze(['editor-tools', 'equipment-animation'])
  }),
  Object.freeze({
    id: 'phase-4-polish',
    title: 'Gefuehl und Medien uebernehmen',
    goal: 'Musik, Sounds, Kamera, Partikel, Menuefuehrung und Balancing angleichen.',
    modules: Object.freeze(['audio-runtime', 'equipment-animation', 'qa-verification'])
  })
]);

export function validateGodotMigrationManifest(manifest = GODOT_MIGRATION_MANIFEST) {
  const failures = [];
  const ids = new Set();
  manifest.forEach((module, index) => {
    if (!module.id || ids.has(module.id)) failures.push(`Doppelte oder leere Godot-Modul-ID bei Index ${index}.`);
    ids.add(module.id);
    if (!module.currentSource) failures.push(`${module.id} besitzt keine aktuelle Quelle.`);
    if (!module.godotTarget?.startsWith('res://')) failures.push(`${module.id} besitzt kein Godot-res:// Ziel.`);
    if (!Array.isArray(module.dataOwned) || !Array.isArray(module.runtimeOwned) || !Array.isArray(module.dependsOn)) {
      failures.push(`${module.id} besitzt keine sauberen Listenfelder.`);
    }
    module.dependsOn?.forEach((dependency) => {
      if (dependency === module.id) failures.push(`${module.id} haengt von sich selbst ab.`);
      if (!ids.has(dependency) && !manifest.some((candidate) => candidate.id === dependency)) {
        failures.push(`${module.id} verweist auf unbekanntes Modul ${dependency}.`);
      }
    });
  });
  return failures;
}
