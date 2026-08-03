import { createAssetCatalog } from '../catalog/assets.js';
import { createAttackSets } from '../catalog/attacks.js';
import { createEnemyCatalog } from '../catalog/enemies.js';
import { createDefaultRoomDefinitions } from '../catalog/rooms.js';
import { createGodotWeaponReboundProfile } from '../combat/weapon-rebound.js';
import { createGodotChestDropCatalog } from '../loot/chest-drops.js';
import { createGodotSaveSlotContract } from '../persistence/save-slots.js';
import { createGodotEquipmentUnlockCatalog } from '../progression/equipment-unlocks.js';
import { createGodotRunUpgradeCatalog } from '../progression/run-upgrades.js';
import { createGodotRoomBundle } from '../world/room-format.js';

export const GODOT_CONTENT_SCHEMA = 'wachtbruch-godot-core';
export const GODOT_CONTENT_VERSION = 4;

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGodotContentBundle({
  cellSize = 2.35,
  levelHeight = cellSize * 0.9,
  bossMaxHealth = 18,
  bossBodyRadius = 0.41 * 1.65
} = {}) {
  const enemies = createEnemyCatalog({ bossMaxHealth, bossBodyRadius });
  const assets = createAssetCatalog({ cellSize, enemyCatalog: enemies });
  const rooms = createDefaultRoomDefinitions().map((room) => ({
    ...room,
    placements: []
  }));
  return cloneSerializable({
    schema: GODOT_CONTENT_SCHEMA,
    version: GODOT_CONTENT_VERSION,
    units: {
      cellSize,
      levelHeight,
      gridSize: 16
    },
    assets,
    attacks: createAttackSets(cellSize),
    weaponRebound: createGodotWeaponReboundProfile({
      probeStart: 0.43 * 0.74,
      probeRadius: cellSize * 0.055,
      probeStep: cellSize * 0.05,
      recoilDistance: cellSize * 0.068
    }),
    enemies,
    rooms: createGodotRoomBundle(rooms),
    progression: createGodotRunUpgradeCatalog(),
    equipmentUnlocks: createGodotEquipmentUnlockCatalog(),
    chestDrops: createGodotChestDropCatalog(),
    saveSlots: createGodotSaveSlotContract()
  });
}

export function validateGodotContentBundle(bundle) {
  const failures = [];
  if (bundle?.schema !== GODOT_CONTENT_SCHEMA) failures.push('Godot-Kernpaket besitzt das falsche Schema.');
  if (bundle?.version !== GODOT_CONTENT_VERSION) failures.push('Godot-Kernpaket besitzt die falsche Version.');
  if (!Number.isFinite(bundle?.units?.cellSize) || bundle.units.cellSize <= 0) {
    failures.push('Godot-Kernpaket besitzt keine gueltige Zellgroesse.');
  }
  if (!Number.isFinite(bundle?.units?.levelHeight) || bundle.units.levelHeight <= 0) {
    failures.push('Godot-Kernpaket besitzt keine gueltige Ebenenhoehe.');
  }
  if (!bundle?.assets || !Object.keys(bundle.assets).length) failures.push('Godot-Kernpaket besitzt keine Assets.');
  if (!bundle?.attacks || !Object.keys(bundle.attacks).length) failures.push('Godot-Kernpaket besitzt keine Angriffe.');
  if (bundle?.weaponRebound?.schema !== 'wachtbruch-weapon-rebound') {
    failures.push('Godot-Kernpaket besitzt keinen Waffenabprall-Vertrag.');
  }
  if (!bundle?.enemies || !Object.keys(bundle.enemies).length) failures.push('Godot-Kernpaket besitzt keine Gegner.');
  if (!Array.isArray(bundle?.rooms?.rooms) || !bundle.rooms.rooms.length) failures.push('Godot-Kernpaket besitzt keine Raeume.');
  if (!Array.isArray(bundle?.progression?.upgrades) || !bundle.progression.upgrades.length) {
    failures.push('Godot-Kernpaket besitzt keine Lauf-Upgrades.');
  }
  if (!Array.isArray(bundle?.equipmentUnlocks?.equipment) || !bundle.equipmentUnlocks.equipment.length) {
    failures.push('Godot-Kernpaket besitzt keine freischaltbare Ausruestung.');
  }
  if (!Array.isArray(bundle?.chestDrops?.drops) || !bundle.chestDrops.drops.length) {
    failures.push('Godot-Kernpaket besitzt keine Truhen-Drops.');
  }
  if (bundle?.saveSlots?.schema !== 'wachtbruch-game-save' || bundle.saveSlots.slotCount !== 3) {
    failures.push('Godot-Kernpaket besitzt keinen Drei-Slot-Speichervertrag.');
  }
  return failures;
}
