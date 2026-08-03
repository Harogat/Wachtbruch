import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAssetCatalog, createAssetViews } from '../modules/catalog/assets.js';
import { ATTACK_CATALOG, createAttackSets } from '../modules/catalog/attacks.js';
import { createEnemyCatalog } from '../modules/catalog/enemies.js';
import { DEFAULT_ROOM_DEFINITIONS } from '../modules/catalog/rooms.js';
import {
  COMBAT_TUNING_SCHEMA,
  COMBAT_TUNING_VERSION,
  createCombatTuning,
  createGodotCombatProfile,
  serializeCombatTuning
} from '../modules/combat/tuning.js';
import {
  createGodotHitReactionProfiles,
  PLAYER_HIT_REACTION_PROFILES,
  resolvePlayerHitReaction
} from '../modules/combat/hit-reactions.js';
import {
  createGodotWeaponReboundProfile,
  createWeaponProbeAngles,
  createWeaponProbeDistances,
  createWeaponReboundProfile
} from '../modules/combat/weapon-rebound.js';
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  createEditorHistoryBundle,
  createEditorHistoryState,
  createRoomHistoryStore,
  currentEditorSnapshot,
  moveEditorHistory,
  pushEditorSnapshot,
  restoreRoomHistoryState,
  storeRoomHistoryState,
  validateEditorHistoryBundle
} from '../modules/editor/history.js';
import {
  applyNormalizedChestDrop,
  createGodotChestDropCatalog,
  normalizeChestDrop,
  validateChestDropCatalog
} from '../modules/loot/chest-drops.js';
import {
  applyRunUpgrade,
  createGodotRunUpgradeCatalog,
  createRunProgress,
  hydrateRunProgress,
  resetRunProgress,
  rollRunUpgradeOffers,
  runUpgradeStackCount,
  serializeRunProgress,
  validateRunUpgradeCatalog
} from '../modules/progression/run-upgrades.js';
import {
  createEquipmentProgress,
  createGodotEquipmentUnlockCatalog,
  hydrateEquipmentProgress,
  isEquipmentEquipped,
  isEquipmentUnlocked,
  serializeEquipmentProgress,
  setEquipmentEquipped,
  unlockEquipment,
  validateEquipmentUnlockCatalog
} from '../modules/progression/equipment-unlocks.js';
import {
  createGameSave,
  createGodotSaveSlotContract,
  formatGameSaveDuration,
  GAME_SAVE_SCHEMA,
  GAME_SAVE_SLOT_COUNT,
  validateGameSave
} from '../modules/persistence/save-slots.js';
import {
  cloneRoomWaves,
  createRoomLayoutPayload,
  createRoomLibraryPayload,
  normalizePlacementWaveAssignments,
  normalizeRoomWaves,
  validateRoomLayoutPayload,
  validateRoomLibraryPayload
} from '../modules/world/room-format.js';
import {
  createGodotStairCollisionProfile,
  createStairCollisionDimensions,
  stairFlankMoveBlocked,
  stairFlankOverlapDepthLocal
} from '../modules/world/stair-collision.js';
import {
  createGodotContentBundle,
  validateGodotContentBundle
} from '../modules/godot/content-bundle.js';
import {
  GODOT_MIGRATION_MANIFEST,
  GODOT_MIGRATION_PHASES,
  GODOT_RESOURCE_BLUEPRINT,
  validateGodotMigrationManifest
} from '../modules/godot/migration-manifest.js';
import {
  createWachtbruchPersistence,
  PERSISTENCE_KEYS,
  SETTINGS_FORMAT_VERSION
} from '../modules/persistence/storage.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function readGlbJson(path) {
  try {
    const buffer = readFileSync(path);
    if (buffer.length < 20 || buffer.toString('utf8', 0, 4) !== 'glTF') return null;
    const jsonLength = buffer.readUInt32LE(12);
    const jsonType = buffer.readUInt32LE(16);
    if (jsonType !== 0x4e4f534a || 20 + jsonLength > buffer.length) return null;
    return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trimEnd());
  } catch {
    return null;
  }
}

check(
  existsSync(join(root, 'docs', 'COMBAT_CORE_V1.md')),
  'Der eingefrorene Combat-Core-v1-Vertrag fehlt.'
);

function filesBelow(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

const sourceFiles = [
  join(root, 'scene.js'),
  ...filesBelow(join(root, 'modules'), '.js')
];

sourceFiles.forEach((file) => {
  try {
    execFileSync(process.execPath, ['--experimental-default-type=module', '--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`Syntaxfehler in ${relative(root, file)}: ${error.stderr?.toString().trim() || error.message}`);
  }
});

const html = readFileSync(join(root, 'index.html'), 'utf8');
const scene = readFileSync(join(root, 'scene.js'), 'utf8');
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const referencedIds = [...scene.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]);
const duplicateHtmlIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
const missingHtmlIds = [...new Set(referencedIds)].filter((id) => !htmlIds.includes(id));

check(duplicateHtmlIds.length === 0, `Doppelte HTML-IDs: ${[...new Set(duplicateHtmlIds)].join(', ')}`);
check(missingHtmlIds.length === 0, `Fehlende HTML-IDs: ${missingHtmlIds.join(', ')}`);
check(
  scene.includes('function beginPlayerHitReaction(direction, knockback, duration = null)')
    && scene.includes('if (updatePlayerHitReaction(delta))'),
  'Ra besitzt keine framebasierte Trefferreaktion.'
);
check(
  scene.includes('function resolvePlayerAttackWorldContact(attack)')
    && scene.includes("clearCombatEffectsByKind('attack-3d-trail')")
    && scene.includes("kind: 'weapon-world-sparks'")
    && scene.includes('canvas.dataset.weaponReboundCount')
    && scene.includes('canvas.dataset.weaponReboundKind')
    && scene.includes('canvas.dataset.weaponReboundWeapon'),
  'Weltkontakt bricht den Spielerangriff nicht mit einem eigenen 3D-Abpraller ab.'
);
check(
  !/moveCombatRootSwept\(\s*playerRoot,\s*direction\.clone\(\)\.multiplyScalar\(knockback\)/.test(scene),
  'Ra wird beim Treffer noch unmittelbar versetzt statt physisch zurueckgestossen.'
);
check(
  scene.includes('progress >= chainAt')
    && scene.includes('attack.chainAt ?? 1'),
  'Die Angriffskette verwendet ihr vorgesehenes chainAt-Fenster nicht.'
);
check(
  scene.includes('const stableIdleDirection = lastMoveDirection.lengthSq()'),
  'Die Kampfkamera ist noch an reine Animationsdrehungen gekoppelt.'
);
check(
  html.includes('<option value="hook">')
    && scene.includes("hook: 'hook'")
    && scene.includes("hook: 'jump'")
    && scene.includes("if (!equipmentOpen && playerEquipmentStowedForHook) return 'hook';"),
  'Der Enterhakenflug ist nicht als gespeichertes Ausruestungsprofil mit der Spielpose verbunden.'
);
check(
  scene.includes("from './modules/progression/run-upgrades.js'")
    && scene.includes("from './modules/progression/equipment-unlocks.js")
    && scene.includes("from './modules/loot/chest-drops.js'")
    && scene.includes("from './modules/world/room-format.js'")
    && scene.includes("from './modules/editor/history.js'"),
  'Progression, Truhen-Drops, Raumformat oder Editorverlauf liegen noch nicht hinter stabilen Modulgrenzen.'
);
check(
  (html.match(/data-save-slot="[123]"/g) ?? []).length === GAME_SAVE_SLOT_COUNT
    && html.includes('id="game-menu-save"')
    && scene.includes("saveActiveGame('room-entry')")
    && scene.includes("saveActiveGame('room-cleared')")
    && scene.includes("saveActiveGame('reward-collected')")
    && scene.includes("saveActiveGame('supply-complete')"),
  'Die drei Spielstaende oder ihre sicheren Speicherpunkte sind nicht vollstaendig verdrahtet.'
);
check(!scene.includes('const RUN_UPGRADES = Object.freeze(['),
  'Die Lauf-Upgrades sind weiterhin doppelt in scene.js definiert.');
check(!scene.includes("new Set(['choice', 'coins', 'sword', 'spear', 'healing'])"),
  'Die Truhen-Drop-IDs sind weiterhin doppelt in scene.js definiert.');
check(!scene.includes('let history = []') && !scene.includes('let historyIndex = -1'),
  'Der Editorverlauf wird weiterhin ueber getrennte globale Variablen verwaltet.');

validateRunUpgradeCatalog().forEach((failure) => failures.push(failure));
const runProgress = createRunProgress();
const coinCallResult = applyRunUpgrade(runProgress, 'coin-call');
check(coinCallResult.applied && Math.abs(runProgress.magnetRadiusMultiplier - 1.35) < 0.0001,
  'Muenzenruf vergroessert den Magnetradius nicht.');
applyRunUpgrade(runProgress, 'coin-call');
applyRunUpgrade(runProgress, 'coin-call');
const coinCallOverflow = applyRunUpgrade(runProgress, 'coin-call');
check(runUpgradeStackCount(runProgress, 'coin-call') === 3 && !coinCallOverflow.applied,
  'Die Stapelgrenze von Muenzenruf wird nicht eingehalten.');
const serializedRun = serializeRunProgress(runProgress);
check(serializedRun.upgrades['coin-call'] === 3,
  'Der Lauf-Fortschritt laesst sich nicht verlustfrei serialisieren.');
const hydratedRun = hydrateRunProgress(createRunProgress(), serializedRun);
check(runUpgradeStackCount(hydratedRun, 'coin-call') === 3
  && Math.abs(hydratedRun.magnetRadiusMultiplier - runProgress.magnetRadiusMultiplier) < 0.0001,
'Der Lauf-Fortschritt laesst sich nicht verlustfrei wiederherstellen.');
resetRunProgress(runProgress);
const guardianHeartResult = applyRunUpgrade(runProgress, 'guardian-heart');
check(guardianHeartResult.restoreHealth === 2 && runProgress.maxHealthBonus === 1,
  'Waechterherz besitzt keinen stabilen Lebens- und Heilvertrag.');
const deterministicOffers = rollRunUpgradeOffers(createRunProgress(), {
  random: () => 0.42
});
check(deterministicOffers.length === 3 && new Set(deterministicOffers).size === 3,
  'Die Versorgung erzeugt keine drei eindeutigen Angebote.');
const godotUpgradeCatalog = createGodotRunUpgradeCatalog();
check(godotUpgradeCatalog.upgrades.some((upgrade) => upgrade.id === 'hook-core'),
  'Der Godot-Upgrade-Katalog enthaelt den Hakenkern nicht.');

validateEquipmentUnlockCatalog().forEach((failure) => failures.push(failure));
const equipmentProgress = createEquipmentProgress();
const helmetUnlock = unlockEquipment(equipmentProgress, 'helmet');
check(helmetUnlock.newlyUnlocked
  && isEquipmentUnlocked(equipmentProgress, 'helmet')
  && !isEquipmentEquipped(equipmentProgress, 'helmet'),
'Der Wachthelm wird nicht als anlegbarer Fund freigeschaltet.');
check(setEquipmentEquipped(equipmentProgress, 'helmet', true)
  && isEquipmentEquipped(equipmentProgress, 'helmet'),
'Der gefundene Wachthelm laesst sich nicht anlegen.');
const hookUnlock = unlockEquipment(equipmentProgress, 'hook');
check(hookUnlock.newlyUnlocked && isEquipmentEquipped(equipmentProgress, 'hook'),
  'Der gefundene Enterhaken wird nicht als einsatzbereites Werkzeug aktiviert.');
const serializedEquipment = serializeEquipmentProgress(equipmentProgress);
check(serializedEquipment.unlocked.includes('helmet')
  && serializedEquipment.unlocked.includes('hook')
  && serializedEquipment.equipped.includes('helmet'),
'Der Ausruestungsfortschritt laesst sich nicht verlustfrei serialisieren.');
const hydratedEquipment = hydrateEquipmentProgress(createEquipmentProgress(), serializedEquipment);
check(isEquipmentUnlocked(hydratedEquipment, 'helmet')
  && isEquipmentUnlocked(hydratedEquipment, 'hook')
  && isEquipmentEquipped(hydratedEquipment, 'helmet'),
'Der Ausruestungsfortschritt laesst sich nicht verlustfrei wiederherstellen.');
const godotEquipmentCatalog = createGodotEquipmentUnlockCatalog();
check(godotEquipmentCatalog.equipment.length === 2
  && godotEquipmentCatalog.equipment.some((definition) => definition.id === 'hook'),
'Der Godot-Katalog besitzt nicht beide freischaltbaren Ausruestungen.');

validateChestDropCatalog().forEach((failure) => failures.push(failure));
const invalidChestDrop = normalizeChestDrop({ dropType: 'unbekannt', dropAmount: 99 });
check(invalidChestDrop.type === 'choice' && invalidChestDrop.amount === 25,
  'Ungueltige Truheninhalte werden nicht sicher normalisiert.');
const mutableChestSettings = { dropType: 'coins', dropAmount: 7 };
const appliedChestDrop = applyNormalizedChestDrop(mutableChestSettings);
check(appliedChestDrop.type === 'coins'
  && mutableChestSettings.dropType === 'coins'
  && mutableChestSettings.dropAmount === 7,
'Ein fester Muenzeninhalt wird nicht stabil in den Placement-Daten gehalten.');
const godotChestCatalog = createGodotChestDropCatalog();
check(godotChestCatalog.drops.some((drop) => drop.id === 'healing'),
  'Der Godot-Truhenkatalog enthaelt die Heilbelohnung nicht.');
check(godotChestCatalog.drops.some((drop) => drop.id === 'helmet')
  && godotChestCatalog.drops.some((drop) => drop.id === 'hook'),
'Helm und Enterhaken stehen nicht als feste Truheninhalte bereit.');
check(scene.includes("addRewardChest('wachhof', -3.65, -2.65, Math.PI * 0.18, 'helmet')")
  && scene.includes("addRewardChest('tiefe-wacht', -3.65, -2.65, Math.PI * 0.18, 'hook')")
  && html.includes('Siegestruhe dieses Raums'),
'Helm und Enterhaken sind nicht sauber an editierbare Siegestruhen gebunden.');
check(!scene.includes('CORE_EQUIPMENT_PICKUPS')
  && !scene.includes('ensureCoreEquipmentPickups'),
'Feste Weltpositionen fuer Helm oder Enterhaken sind noch aktiv.');
check(!scene.includes('addCampfire(')
  && !scene.includes('fireLight'),
'Das feste Lagerfeuer oder sein separates Punktlicht ist noch aktiv.');
const stairCollision = createStairCollisionDimensions(2.35);
const stairCenterDepth = stairFlankOverlapDepthLocal({
  x: 0,
  z: 0,
  radius: 0.32,
  ...stairCollision
});
const stairRightDepth = stairFlankOverlapDepthLocal({
  x: stairCollision.flankCenterOffset,
  z: 0,
  radius: 0.32,
  ...stairCollision
});
const stairLeftDepth = stairFlankOverlapDepthLocal({
  x: -stairCollision.flankCenterOffset,
  z: 0,
  radius: 0.32,
  ...stairCollision
});
const stairEndDepth = stairFlankOverlapDepthLocal({
  x: stairCollision.flankCenterOffset,
  z: stairCollision.collisionHalfLength + 0.33,
  radius: 0.32,
  ...stairCollision
});
check(stairCenterDepth === 0,
  'Die begehbare Treppenmitte wird von den Seitenkollisionen verdeckt.');
check(stairRightDepth > 0 && stairLeftDepth > 0,
  'Die Treppe besitzt nicht auf beiden Seiten eine Kollision.');
check(stairEndDepth === 0,
  'Die Treppenflanke blockiert ueber das sichtbare Treppenende hinaus.');
check(stairFlankMoveBlocked(0, stairRightDepth)
  && stairFlankMoveBlocked(stairRightDepth * 0.5, stairRightDepth)
  && !stairFlankMoveBlocked(stairRightDepth, stairRightDepth * 0.5),
'Die Treppenflanke blockiert keinen Eintritt oder laesst einen bereits ueberlappenden Akteur nicht entkommen.');
check(createGodotStairCollisionProfile().ratios.walkableHalfWidth === 0.44,
  'Das Godot-Treppenprofil besitzt keine stabile begehbare Breite.');
check(scene.includes('stairFlanksBlockPosition(position, radius, actorHeight, movingRoot, roomId)')
  && scene.includes('stairFlanksOccupyPosition(position, actorRadius, CELL * 0.72, roomId)')
  && scene.includes('addDiagnosticStairFlanks(root)'),
'Spieler, Gegnernavigation oder Diagnoseansicht verwenden die Treppenflanken noch nicht gemeinsam.');
check(scene.includes('function enemyStairLaneDirection(enemy, travelDirection)')
  && scene.includes('ENEMY_STAIR_CENTERING_STRENGTH')
  && scene.includes('enemy.navigationStairRoot')
  && scene.includes('enemy.navigationUsingStairs ? moveCombatRootSwept : moveCombatRoot'),
'Gegner werden auf Treppen nicht stabil zur begehbaren Spur gefuehrt.');
check(scene.includes('function playerSharesMarkerHeight(marker)')
  && scene.includes('EXIT_PROMPT_HEIGHT_TOLERANCE')
  && scene.includes('nearest.distance <= radius && playerSharesMarkerHeight(nearest.marker)'),
'Der Ausgangshinweis ist nicht an die tatsaechliche Ebene des Spielers gebunden.');

const reboundProfile = createWeaponReboundProfile({
  probeStart: -3,
  recoilSeconds: 9,
  sparkCount: 2
});
const attackOneStartAngles = createWeaponProbeAngles({
  profile: 'attack1',
  windowProgress: 0
});
const attackOneEndAngles = createWeaponProbeAngles({
  profile: 'attack1',
  windowProgress: 1
});
const attackTwoStartAngles = createWeaponProbeAngles({
  profile: 'attack2',
  windowProgress: 0
});
const reboundDistances = createWeaponProbeDistances({
  start: 0.32,
  range: 1.01,
  step: 0.12
});
const godotReboundProfile = createGodotWeaponReboundProfile();
check(reboundProfile.probeStart === 0.05
  && reboundProfile.recoilSeconds === 0.5
  && reboundProfile.sparkCount === 3,
'Der Waffenabprall begrenzt ungueltige Laufzeitwerte nicht sicher.');
check(attackOneStartAngles[1] < attackOneEndAngles[1]
  && attackTwoStartAngles[1] > attackOneStartAngles[1],
'Hin- und Rueckschwung besitzen keine gegensaetzlichen Kontaktbahnen.');
check(reboundDistances[0] === 0.32
  && Math.abs(reboundDistances.at(-1) - 1.01) < 0.0001
  && reboundDistances.every((distance) => distance <= 1.01),
'Die Waffenprobe erreicht ihr Ziel nicht lueckenlos oder prueft hinter der Reichweite.');
check(godotReboundProfile.schema === 'wachtbruch-weapon-rebound'
  && godotReboundProfile.sweepDegrees.attack5[0] > godotReboundProfile.sweepDegrees.attack5[1],
'Der Waffenabprall laesst sich nicht stabil fuer Godot exportieren.');

const duplicateWaveInput = [
  { id: 'probe', name: 'Probe A', intermission: 0.1, rewardCoins: 99 },
  { id: 'probe', name: 'Probe B', intermission: 2, rewardCoins: 2 }
];
const normalizedWaves = normalizeRoomWaves('test-raum', duplicateWaveInput);
check(normalizedWaves.length === 2
  && normalizedWaves[0].id !== normalizedWaves[1].id
  && normalizedWaves[0].intermission === 0.4
  && normalizedWaves[0].rewardCoins === 25,
'Wellen-IDs und Grenzwerte werden nicht stabil normalisiert.');
const bossFallbackWaves = normalizeRoomWaves('boss-raum', [], [{ name: 'enemy-boss' }]);
check(bossFallbackWaves[0].boss === true && bossFallbackWaves[0].name === 'Bosswelle',
  'Ein Bossraum ohne Wellenvorgabe erzeugt keine Bosswelle.');
const wavePlacements = [{ name: 'enemy-sword', settings: { waveId: 'fehlt', spawnDelay: 99 } }];
normalizePlacementWaveAssignments(wavePlacements, normalizedWaves, {
  isEnemyPlacement: (placement) => placement.name.startsWith('enemy-')
});
check(wavePlacements[0].settings.waveId === normalizedWaves[0].id
  && wavePlacements[0].settings.spawnDelay === 20,
'Gegner-Placements werden keiner gueltigen Welle zugeordnet.');
const roomLayoutContract = createRoomLayoutPayload({
  placements: wavePlacements,
  waves: normalizedWaves
});
check(validateRoomLayoutPayload(roomLayoutContract).length === 0,
  'Der erzeugte Raum-Layout-Vertrag ist ungueltig.');
const roomLibraryContract = createRoomLibraryPayload({
  activeRoomId: 'test-raum',
  rooms: [{
    id: 'test-raum',
    name: 'Test-Raum',
    placements: wavePlacements,
    waves: cloneRoomWaves(normalizedWaves)
  }]
});
check(validateRoomLibraryPayload(roomLibraryContract).length === 0,
  'Der erzeugte Raumsammlungs-Vertrag ist ungueltig.');

const editorLayoutA = createRoomLayoutPayload({
  placements: [{ name: 'floor', x: 0, y: 0, z: 0 }],
  waves: normalizedWaves
});
const editorLayoutB = createRoomLayoutPayload({
  placements: [{ name: 'floor', x: 1, y: 0, z: 0 }],
  waves: normalizedWaves
});
const editorLayoutC = createRoomLayoutPayload({
  placements: [{ name: 'floor', x: 2, y: 0, z: 0 }],
  waves: normalizedWaves
});
const editorInitialHistory = createEditorHistoryState(editorLayoutA);
const editorPushB = pushEditorSnapshot(editorInitialHistory, editorLayoutB);
check(editorPushB.changed
  && editorPushB.state.index === 1
  && canUndoEditorHistory(editorPushB.state)
  && !canRedoEditorHistory(editorPushB.state),
'Eine Editor-Aenderung erzeugt keinen sauberen Undo-Zustand.');
const editorUndo = moveEditorHistory(editorPushB.state, 0);
check(editorUndo.changed
  && editorUndo.direction === 'undo'
  && currentEditorSnapshot(editorUndo.state).placements[0].x === 0
  && canRedoEditorHistory(editorUndo.state),
'Undo stellt den vorherigen Editor-Snapshot nicht wieder her.');
const editorPushC = pushEditorSnapshot(editorUndo.state, editorLayoutC);
check(editorPushC.state.snapshots.length === 2
  && editorPushC.state.index === 1
  && currentEditorSnapshot(editorPushC.state).placements[0].x === 2
  && !canRedoEditorHistory(editorPushC.state),
'Eine neue Aenderung nach Undo schneidet den alten Redo-Zweig nicht ab.');
const editorDuplicate = pushEditorSnapshot(editorPushC.state, editorLayoutC);
check(!editorDuplicate.changed && editorDuplicate.state.snapshots.length === 2,
  'Ein unveraenderter Editorstand erzeugt einen doppelten History-Eintrag.');
const editorRoomHistories = createRoomHistoryStore();
storeRoomHistoryState(editorRoomHistories, 'raum-a', editorPushC.state);
storeRoomHistoryState(editorRoomHistories, 'raum-b', createEditorHistoryState(editorLayoutB));
const restoredRoomAHistory = restoreRoomHistoryState(editorRoomHistories, 'raum-a', editorLayoutA);
restoredRoomAHistory.snapshots.push(JSON.stringify(editorLayoutB));
check(restoreRoomHistoryState(editorRoomHistories, 'raum-a', editorLayoutA).snapshots.length === 2,
  'Raumverlaeufe teilen veraenderbare Snapshot-Listen miteinander.');
const editorHistoryBundle = createEditorHistoryBundle(editorRoomHistories, 'raum-a');
check(validateEditorHistoryBundle(editorHistoryBundle).length === 0
  && JSON.parse(JSON.stringify(editorHistoryBundle)).rooms.length === 2,
'Der Editorverlauf besitzt keinen stabilen JSON-Vertrag fuer Godot.');

const godotContentBundle = createGodotContentBundle();
validateGodotContentBundle(godotContentBundle).forEach((failure) => failures.push(failure));
check(JSON.parse(JSON.stringify(godotContentBundle)).schema === godotContentBundle.schema,
  'Das Godot-Kernpaket ist nicht vollstaendig JSON-serialisierbar.');
check(godotContentBundle.weaponRebound.schema === 'wachtbruch-weapon-rebound',
  'Das Godot-Kernpaket enthaelt den Waffenabprall nicht.');
check(godotContentBundle.saveSlots.schema === GAME_SAVE_SCHEMA
  && godotContentBundle.saveSlots.slotCount === GAME_SAVE_SLOT_COUNT,
'Das Godot-Kernpaket enthaelt nicht den Drei-Slot-Spielstandvertrag.');

const quietLogger = { warn() {} };
const gameSaveContract = createGodotSaveSlotContract();
check(gameSaveContract.slotCount === 3
  && gameSaveContract.sections.checkpoint.includes('position')
  && gameSaveContract.autosaveReasons.includes('room-cleared'),
'Der Godot-Spielstandvertrag beschreibt Slots, Checkpoint oder Autosaves nicht vollstaendig.');
check(formatGameSaveDuration(60 * 125 + 4) === '2 h 05 min',
  'Die Spielzeitvorschau formatiert Stunden und Minuten nicht stabil.');

const saveStorage = createMemoryStorage();
const savePersistence = createWachtbruchPersistence({ storage: saveStorage, logger: quietLogger });
const baseGameSave = createGameSave({
  slot: 1,
  createdAt: '2026-07-26T08:00:00.000Z',
  savedAt: '2026-07-26T08:10:00.000Z',
  reason: 'room-cleared',
  playSeconds: 610,
  summary: {
    roomId: 'wachhof',
    roomName: 'Wachhof',
    level: 1,
    checkpointLabel: 'Wachhof gesichert',
    health: 5,
    maxHealth: 6,
    coins: 7
  },
  checkpoint: {
    roomId: 'wachhof',
    level: 1,
    state: 'exit-ready',
    position: { x: 1.25, y: 0.18, z: -2.5 },
    rotationY: Math.PI
  },
  player: {
    health: 5,
    maxHealth: 6,
    stamina: 0.75,
    inventory: { coins: 7, potions: 2 },
    equippedWeapon: 'sword',
    swordEmpowered: true
  },
  progression: {
    run: serializedRun,
    equipment: serializedEquipment
  },
  world: {
    completedRooms: ['wachhof'],
    openedRewardRooms: ['wachhof'],
    defeatedBossRooms: [],
    pendingCoins: [
      { position: { x: 0.5, y: 0.26, z: -1.5 }, value: 2 }
    ]
  }
});
check(validateGameSave(baseGameSave, 1).length === 0,
  'Ein vollstaendiger Spielstand besteht seinen eigenen Datenvertrag nicht.');
check(baseGameSave.world.pendingCoins[0].value === 2,
  'Ausstehende Muenzen werden nicht im Spielstand erhalten.');
savePersistence.saveGameSaveSlot(1, baseGameSave);
savePersistence.saveGameSaveSlot(2, {
  ...baseGameSave,
  slot: 2,
  summary: { ...baseGameSave.summary, roomId: 'tiefe-wacht', roomName: 'Tiefe Wacht', level: 2 },
  checkpoint: { ...baseGameSave.checkpoint, roomId: 'tiefe-wacht', level: 2, state: 'ready' }
});
check(savePersistence.listGameSaveSlots().filter((record) => record.save).length === 2,
  'Die Spielstandverwaltung trennt ihre drei Slots nicht sauber.');
check(savePersistence.loadGameSaveMeta().activeSlot === 2,
  'Der zuletzt verwendete Spielstand-Slot wird nicht gemerkt.');
savePersistence.saveGameSaveSlot(1, {
  ...baseGameSave,
  savedAt: '2026-07-26T08:20:00.000Z',
  player: {
    ...baseGameSave.player,
    inventory: { ...baseGameSave.player.inventory, coins: 19 }
  }
});
saveStorage.setItem(`${PERSISTENCE_KEYS.gameSaveSlotPrefix}1-v1`, '{beschaedigt');
const recoveredGameSave = savePersistence.loadGameSaveSlot(1);
check(recoveredGameSave.recovered
  && recoveredGameSave.save.player.inventory.coins === 7,
'Ein beschaedigter Spielstand faellt nicht auf seine letzte gueltige Sicherung zurueck.');
savePersistence.deleteGameSaveSlot(2);
check(savePersistence.loadGameSaveSlot(2) === null,
  'Ein geloeschter Spielstand bleibt weiterhin ladbar.');

const legacyStorage = createMemoryStorage({
  [PERSISTENCE_KEYS.equipmentLegacy]: JSON.stringify({ sword: { idle: { x: 1.25 } } }),
  [PERSISTENCE_KEYS.attackFx]: JSON.stringify({ sword: { attack1: { enabled: true } } })
});
const legacyPersistence = createWachtbruchPersistence({ storage: legacyStorage, logger: quietLogger });
const migratedSettings = legacyPersistence.loadSettings();
check(migratedSettings.migrated === true, 'Legacy-Einstellungen wurden nicht migriert.');
check(migratedSettings.version === SETTINGS_FORMAT_VERSION, 'Migrierte Einstellungen besitzen die falsche Version.');
check(migratedSettings.data.equipment?.sword?.idle?.x === 1.25, 'Legacy-Socketwerte gingen bei der Migration verloren.');
check(Boolean(legacyStorage.getItem(PERSISTENCE_KEYS.settings)), 'Migrierte Einstellungen wurden nicht gebuendelt gespeichert.');

legacyPersistence.saveSettings({
  equipment: { marker: 'erster-stand' },
  attackFx: {},
  attackSequence: {},
  comboFlow: { sword: { mode: 'fixed' } },
  chargedAttack: { sword: true, spear: true },
  weaponGlow: {},
  horizontalSweep: { sword: { attack4: { startDeg: 18, endDeg: -66 } } },
  attackSpeed: { sword: { attack4: 1 } },
  attackFeel: { sword: { attack4: { rangeScale: 1, hitStart: 0.2, hitEnd: 0.66, lungeScale: 1, impactScale: 1 } } },
  combatTuning: createCombatTuning({
    impact: { hitStopScale: 1.1 },
    meleeEnemy: { windup: 0.42 }
  })
});
legacyPersistence.saveSettings({
  equipment: { marker: 'zweiter-stand' },
  attackFx: {},
  attackSequence: {},
  comboFlow: { sword: { mode: 'random' } },
  chargedAttack: { sword: false, spear: true },
  weaponGlow: {},
  horizontalSweep: { sword: { attack4: { startDeg: 12, endDeg: -58 } } },
  attackSpeed: { sword: { attack4: 1.25 } },
  attackFeel: { sword: { attack4: { rangeScale: 1.14, hitStart: 0.18, hitEnd: 0.72, lungeScale: 1.08, impactScale: 1.2 } } },
  combatTuning: createCombatTuning({
    impact: { hitStopScale: 1.35 },
    meleeEnemy: { windup: 0.55 }
  })
});
const settingsBackup = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.settingsBackup));
const mirroredEquipment = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.equipment));
const mirroredChargedAttack = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.chargedAttack));
const mirroredComboFlow = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.comboFlow));
const mirroredHorizontalSweep = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.horizontalSweep));
const mirroredAttackSpeed = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.attackSpeed));
const mirroredAttackFeel = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.attackFeel));
const mirroredCombatTuning = JSON.parse(legacyStorage.getItem(PERSISTENCE_KEYS.combatTuning));
const reloadedCombatSettings = legacyPersistence.loadSettings();
check(settingsBackup.data.equipment.marker === 'erster-stand', 'Die Einstellungssicherung enthaelt nicht den vorherigen Stand.');
check(settingsBackup.data.combatTuning.meleeEnemy.windup === 0.42,
  'Die Einstellungssicherung verlor das vorherige Kampfprofil.');
check(mirroredEquipment.marker === 'zweiter-stand', 'Der kompatible Einstellungs-Schluessel wurde nicht gespiegelt.');
check(mirroredChargedAttack.sword === false, 'Die Auflade-Aktion wurde nicht separat gespiegelt.');
check(mirroredComboFlow.sword.mode === 'random', 'Der Kombo-Ablauf wurde nicht separat gespiegelt.');
check(mirroredHorizontalSweep.sword.attack4.endDeg === -58, 'Der Armwinkel wurde nicht separat gespiegelt.');
check(mirroredAttackSpeed.sword.attack4 === 1.25, 'Das Angriffstempo wurde nicht separat gespiegelt.');
check(mirroredAttackFeel.sword.attack4.impactScale === 1.2, 'Das Kampfgefuehl wurde nicht separat gespiegelt.');
check(mirroredCombatTuning.impact.hitStopScale === 1.35, 'Das Kampftuning wurde nicht separat gespiegelt.');
check(reloadedCombatSettings.data.combatTuning.meleeEnemy.windup === 0.55,
  'Das Kampftuning ueberlebt einen Neustart nicht.');

const normalizedCombatTuning = createCombatTuning({
  impact: { hitStopScale: 9, cameraShakeScale: -2 },
  meleeEnemy: { windup: 0.55, active: 0.44, recovery: 0.2, cooldown: 0.8 }
});
check(normalizedCombatTuning.impact.hitStopScale === 1.8, 'Hitstop wird nicht auf den erlaubten Bereich begrenzt.');
check(normalizedCombatTuning.impact.cameraShakeScale === 0, 'Kamerawucht erlaubt ungueltige negative Werte.');
check(serializeCombatTuning(normalizedCombatTuning).meleeEnemy.windup === 0.55,
  'Das Kampftuning laesst sich nicht verlustfrei serialisieren.');

const godotCombatProfile = createGodotCombatProfile({
  tuning: normalizedCombatTuning,
  weapon: 'sword',
  attackProfile: 'attack1',
  attackSpeed: 1.15,
  attackFeel: {
    rangeScale: 1.08,
    hitStart: 0.24,
    hitEnd: 0.62,
    lungeScale: 1.05,
    impactScale: 1.2
  },
  comboPause: 0.05
});
check(godotCombatProfile.schema === COMBAT_TUNING_SCHEMA
  && godotCombatProfile.version === COMBAT_TUNING_VERSION,
'Das exportierte Godot-Kampfprofil besitzt keinen stabilen Datenvertrag.');
check(godotCombatProfile.playerAttack.profile === 'attack1'
  && godotCombatProfile.meleeEnemy.windupSeconds === 0.55,
'Das Godot-Kampfprofil enthaelt nicht die ausgewaehlten Duellwerte.');

const lightPlayerHit = resolvePlayerHitReaction({
  source: 'enemy-melee',
  amount: 1,
  knockback: 1.25
});
const heavyPlayerHit = resolvePlayerHitReaction({
  source: 'boss-charge',
  amount: 2,
  knockback: 3.35
});
const blockedPlayerHit = resolvePlayerHitReaction({
  source: 'enemy-melee',
  amount: 1,
  knockback: 0.35,
  blocked: true
});
const godotHitProfiles = createGodotHitReactionProfiles();
check(lightPlayerHit.id === 'light', 'Ein normaler Orktreffer verwendet nicht das leichte Trefferprofil.');
check(heavyPlayerHit.id === 'heavy'
  && heavyPlayerHit.hurtSeconds > lightPlayerHit.hurtSeconds,
'Ein schwerer Bosstreffer ist nicht klar vom leichten Treffer getrennt.');
check(blockedPlayerHit.id === 'blocked'
  && blockedPlayerHit.hurtSeconds < lightPlayerHit.hurtSeconds,
'Ein Block besitzt keine kurze eigene Trefferreaktion.');
check(godotHitProfiles.profiles.heavy.id === PLAYER_HIT_REACTION_PROFILES.heavy.id,
  'Die Trefferprofile lassen sich nicht stabil fuer Godot exportieren.');

const validRoomBackup = {
  version: 3,
  activeRoomId: 'wachhof',
  rooms: [{ id: 'wachhof', name: 'Wachhof', placements: [], waves: [] }]
};
const roomStorage = createMemoryStorage({
  [PERSISTENCE_KEYS.roomLibrary]: '{beschaedigt',
  [PERSISTENCE_KEYS.roomLibraryBackup]: JSON.stringify(validRoomBackup)
});
const roomPersistence = createWachtbruchPersistence({ storage: roomStorage, logger: quietLogger });
let restoredRoomPayload = null;
const restoredRoomSource = roomPersistence.loadRoomLibrary((payload) => {
  if (payload?.version !== 3 || !Array.isArray(payload.rooms)) throw new Error('Ungueltiger Raumstand');
  restoredRoomPayload = payload;
});
check(restoredRoomSource === 'Sicherungsstand', 'Ein beschaedigter Raumstand fiel nicht auf die Sicherung zurueck.');
check(restoredRoomPayload?.activeRoomId === 'wachhof', 'Der Raum-Sicherungsstand wurde nicht angewendet.');
roomPersistence.saveRoomLibrary({ ...validRoomBackup, activeRoomId: 'tiefe-wacht' });
check(
  JSON.parse(roomStorage.getItem(PERSISTENCE_KEYS.roomLibraryBackup)).activeRoomId === 'wachhof',
  'Ein beschaedigter Hauptstand hat die gueltige Raumsicherung ueberschrieben.'
);

const enemyCatalog = createEnemyCatalog({ bossMaxHealth: 18, bossBodyRadius: 0.9 });
const assetCatalog = createAssetCatalog({ cellSize: 1.6, enemyCatalog });
const assetViews = createAssetViews(assetCatalog);
const glbRoot = join(root, 'vendor', 'kenney-mini-dungeon', 'Models', 'GLB format');

assetViews.modelNames.forEach((model) => {
  const source = assetViews.modelSources[model];
  const modelPath = source ? join(root, source) : join(glbRoot, `${model}.glb`);
  check(existsSync(modelPath), `Fehlendes GLB-Modell: ${model}.glb`);
});
[
  'wachtanker-ahnhoehe',
  'enterhaken-ahnhoehe',
  'wachthelm-ahnhoehe-mani-neufassung',
  'wachtmal-ahnhoehe',
  'wachtfackel-ahnhoehe-gelb',
  'wachtfackel-ahnhoehe-blau'
].forEach((model) => {
  check(assetViews.nativeScaleModelIds.includes(model), `${model} muss in nativer Meterskalierung laufen.`);
  check(Boolean(assetViews.modelSources[model]), `${model} besitzt keinen modularen Modellpfad.`);
});
[
  ['wachtfackel-ahnhoehe-gelb', 'Wachtfackel_Gelb_Loop', 'LightAnchor_Gelb'],
  ['wachtfackel-ahnhoehe-blau', 'Wachtfackel_Blau_Loop', 'LightAnchor_Blau']
].forEach(([assetId, animation, lightAnchor]) => {
  const entry = assetCatalog[assetId];
  const definition = entry?.definition;
  check(definition?.animation === animation, `${assetId} besitzt nicht den erwarteten Animationsclip.`);
  check(Number(definition?.mountHeight) > 0, `${assetId} besitzt keine Wandmontagehoehe.`);
  check(Number(definition?.torch?.nightIntensity) > Number(definition?.torch?.dayIntensity),
    `${assetId} wird nachts nicht staerker beleuchtet.`);
  check(definition?.torch?.lightAnchor === lightAnchor, `${assetId} besitzt den falschen Lichtanker.`);
  const glb = entry?.source ? readGlbJson(join(root, entry.source)) : null;
  check(Boolean(glb), `${assetId} ist kein lesbares GLB.`);
  check(glb?.animations?.some((clip) => clip.name === animation),
    `${assetId} enthaelt den Animationsclip ${animation} nicht.`);
  check(glb?.nodes?.some((node) => node.name === lightAnchor),
    `${assetId} enthaelt den Lichtanker ${lightAnchor} nicht.`);
  check(Boolean(glb?.extensions?.KHR_lights_punctual?.lights?.length),
    `${assetId} enthaelt kein eingebettetes Punktlicht.`);
});
{
  const helmetEntry = assetCatalog['wachthelm-ahnhoehe-mani-neufassung'];
  const helmetGlb = helmetEntry?.source ? readGlbJson(join(root, helmetEntry.source)) : null;
  const helmetAnimations = helmetEntry?.definition?.animations ?? [];
  check(Boolean(helmetGlb), 'Der Wachthelm ist kein lesbares GLB.');
  check(helmetAnimations.length === 2
    && helmetAnimations.every((animation) => helmetGlb?.animations?.some((clip) => clip.name === animation)),
  'Die beiden Runenanimationen des Wachthelms sind nicht vollstaendig katalogisiert.');
  check(helmetGlb?.nodes?.some((node) => node.name === 'Wachthelm_von_Ahnhoehe')
    && helmetGlb?.nodes?.some((node) => node.name === 'Wachthelm_von_Ahnhoehe.001'),
  'Die beiden absichtlich ueberlagerten Wachthelm-Wurzeln wurden nicht erhalten.');
}
check(
  assetCatalog['grapple-anchor']?.model === 'wachtanker-ahnhoehe',
  'Der Enterhakenanker verwendet noch das alte Rundschild.'
);

const attackSets = createAttackSets(1.6);
Object.entries(ATTACK_CATALOG).forEach(([weaponId, weapon]) => {
  const profiles = weapon.steps.map((step) => step.profile);
  check(weapon.steps.length === 6, `${weaponId} besitzt ${weapon.steps.length} statt 5 Kombos plus Auflade-Angriff.`);
  check(new Set(profiles).size === profiles.length, `${weaponId} besitzt doppelte Angriffsprofile.`);
  check(weapon.steps.some((step) => step.profile === 'attack6' && step.holdOnly),
    `${weaponId} besitzt keinen separaten Auflade-Rundumschlag.`);
  check(weapon.steps.every((step) => Number.isFinite(step.damage) && step.damage > 0),
    `${weaponId} besitzt Angriffe ohne sauberen Schadenswert.`);
  check(weapon.steps.every((step) => Number.isFinite(step.knockback) && step.knockback >= 0),
    `${weaponId} besitzt Angriffe ohne sauberen Wuchtwert.`);
  check(weapon.steps.some((step) => step.profile === 'attack4'
    && step.horizontalSweep
    && step.sweepDirection === -1
    && !step.reverseSweep
    && Number.isFinite(step.armStartDeg)
    && Number.isFinite(step.armEndDeg)
    && step.cone === 0),
  `${weaponId} besitzt keinen sauberen Horizontal-4-Schlag.`);
  check(weapon.steps.some((step) => step.profile === 'attack5'
    && step.horizontalSweep
    && step.reverseSweep
    && step.sweepDirection === -1
    && Number.isFinite(step.armStartDeg)
    && Number.isFinite(step.armEndDeg)
    && step.cone === 0),
  `${weaponId} besitzt keinen gespiegelten Horizontal-5-Schlag.`);
  check(attackSets[weaponId]?.length === weapon.steps.length, `${weaponId} wurde nicht vollstaendig erzeugt.`);
});

const roomIds = DEFAULT_ROOM_DEFINITIONS.map((room) => room.id);
const waveIds = DEFAULT_ROOM_DEFINITIONS.flatMap((room) => room.waves.map((wave) => wave.id));
check(new Set(roomIds).size === roomIds.length, 'Doppelte Raum-IDs im Katalog.');
check(new Set(waveIds).size === waveIds.length, 'Doppelte Wellen-IDs im Katalog.');
check(DEFAULT_ROOM_DEFINITIONS.length === 4, `Erwartet werden 4 Kernraeume, gefunden wurden ${DEFAULT_ROOM_DEFINITIONS.length}.`);
check(roomIds.includes('wachtschlucht'), 'Die Wachtschlucht fehlt im Kernraumkatalog.');
check(waveIds.includes('wachtschlucht-welle-1'), 'Die Wachtschlucht besitzt keine Kernwelle.');

const godotManifestFailures = validateGodotMigrationManifest();
godotManifestFailures.forEach((failure) => failures.push(failure));
check(GODOT_MIGRATION_MANIFEST.length >= 8, 'Der Godot-Modulplan ist zu duenn fuer die Kernmigration.');
check(GODOT_MIGRATION_PHASES.length === 4, 'Der Godot-Migrationsplan braucht vier klare Phasen.');
Object.entries(GODOT_RESOURCE_BLUEPRINT).forEach(([key, blueprint]) => {
  check(existsSync(join(root, blueprint.source)), `Godot-Blueprint ${key} verweist auf fehlende Quelle ${blueprint.source}.`);
  check(Boolean(blueprint.resource && blueprint.targetDirectory && blueprint.stableIdField),
    `Godot-Blueprint ${key} ist nicht vollstaendig.`);
});

if (failures.length) {
  console.error('Wachtbruch-Kernpruefung fehlgeschlagen:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Wachtbruch-Kernpruefung bestanden.');
  console.log(`JavaScript-Dateien: ${sourceFiles.length}`);
  console.log(`HTML-IDs: ${htmlIds.length}`);
  console.log(`Assets: ${Object.keys(assetCatalog).length}, GLB-Modelle: ${assetViews.modelNames.length}`);
  console.log(`Waffen: ${Object.keys(ATTACK_CATALOG).length}, Angriffe je Waffe: 5 Kombos + Aufladen`);
  console.log(`Gegner: ${Object.keys(enemyCatalog).length}`);
  console.log(`Raeume: ${DEFAULT_ROOM_DEFINITIONS.length}, Wellen: ${waveIds.length}`);
  console.log(`Godot-Module: ${GODOT_MIGRATION_MANIFEST.length}, Phasen: ${GODOT_MIGRATION_PHASES.length}`);
}
