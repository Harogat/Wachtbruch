export const EQUIPMENT_UNLOCK_SCHEMA = 'wachtbruch-equipment-unlocks';
export const EQUIPMENT_UNLOCK_VERSION = 1;

export const DISCOVERABLE_EQUIPMENT = Object.freeze([
  Object.freeze({
    id: 'helmet',
    displayName: 'Wachthelm von Ahnhoehe',
    assetId: 'wachthelm-ahnhoehe-mani-neufassung',
    inventoryIcon: 'hard-hat',
    equippable: true,
    autoEquip: false
  }),
  Object.freeze({
    id: 'hook',
    displayName: 'Enterhaken von Ahnhoehe',
    assetId: 'enterhaken-ahnhoehe',
    inventoryIcon: 'anchor',
    equippable: false,
    autoEquip: true
  }),
  Object.freeze({
    id: 'armband',
    displayName: 'Armband der unbaendigen Ahnenkraft',
    assetId: 'armband-ahnenkraft',
    inventoryIcon: 'hand',
    equippable: false,
    autoEquip: true
  })
]);

const EQUIPMENT_BY_ID = new Map(DISCOVERABLE_EQUIPMENT.map((definition) => [
  definition.id,
  definition
]));

export function equipmentUnlockDefinition(id) {
  return EQUIPMENT_BY_ID.get(id) ?? null;
}

export function createEquipmentProgress(candidate = {}) {
  const progress = {
    unlocked: new Set(),
    equipped: new Set()
  };
  hydrateEquipmentProgress(progress, candidate);
  return progress;
}

export function resetEquipmentProgress(progress) {
  progress.unlocked.clear();
  progress.equipped.clear();
  return progress;
}

export function unlockEquipment(progress, id) {
  const definition = equipmentUnlockDefinition(id);
  if (!definition) return { unlocked: false, newlyUnlocked: false, equipped: false, definition: null };
  const newlyUnlocked = !progress.unlocked.has(id);
  progress.unlocked.add(id);
  if (definition.autoEquip) progress.equipped.add(id);
  return {
    unlocked: true,
    newlyUnlocked,
    equipped: progress.equipped.has(id),
    definition
  };
}

export function isEquipmentUnlocked(progress, id) {
  return Boolean(equipmentUnlockDefinition(id) && progress.unlocked.has(id));
}

export function isEquipmentEquipped(progress, id) {
  return isEquipmentUnlocked(progress, id) && progress.equipped.has(id);
}

export function setEquipmentEquipped(progress, id, equipped) {
  const definition = equipmentUnlockDefinition(id);
  if (!definition?.equippable || !isEquipmentUnlocked(progress, id)) return false;
  if (equipped) progress.equipped.add(id);
  else progress.equipped.delete(id);
  return true;
}

export function toggleEquipmentEquipped(progress, id) {
  if (!isEquipmentUnlocked(progress, id)) return false;
  const next = !isEquipmentEquipped(progress, id);
  return setEquipmentEquipped(progress, id, next) ? next : false;
}

export function serializeEquipmentProgress(progress) {
  return {
    schema: EQUIPMENT_UNLOCK_SCHEMA,
    version: EQUIPMENT_UNLOCK_VERSION,
    unlocked: DISCOVERABLE_EQUIPMENT
      .filter((definition) => progress.unlocked.has(definition.id))
      .map((definition) => definition.id),
    equipped: DISCOVERABLE_EQUIPMENT
      .filter((definition) => progress.equipped.has(definition.id))
      .map((definition) => definition.id)
  };
}

export function hydrateEquipmentProgress(progress, candidate = {}) {
  resetEquipmentProgress(progress);
  const unlocked = Array.isArray(candidate?.unlocked) ? candidate.unlocked : [];
  const equipped = Array.isArray(candidate?.equipped) ? candidate.equipped : [];
  unlocked.forEach((id) => {
    if (equipmentUnlockDefinition(id)) progress.unlocked.add(id);
  });
  equipped.forEach((id) => {
    const definition = equipmentUnlockDefinition(id);
    if (definition?.equippable && progress.unlocked.has(id)) progress.equipped.add(id);
  });
  DISCOVERABLE_EQUIPMENT
    .filter((definition) => definition.autoEquip && progress.unlocked.has(definition.id))
    .forEach((definition) => progress.equipped.add(definition.id));
  return progress;
}

export function createGodotEquipmentUnlockCatalog() {
  return {
    schema: EQUIPMENT_UNLOCK_SCHEMA,
    version: EQUIPMENT_UNLOCK_VERSION,
    equipment: DISCOVERABLE_EQUIPMENT.map((definition) => ({ ...definition }))
  };
}

export function validateEquipmentUnlockCatalog(definitions = DISCOVERABLE_EQUIPMENT) {
  const failures = [];
  const ids = new Set();
  definitions.forEach((definition, index) => {
    const label = definition?.id || `Index ${index}`;
    if (!definition?.id || ids.has(definition.id)) failures.push(`Doppelte oder leere Ausruestungs-ID: ${label}.`);
    ids.add(definition?.id);
    if (!definition?.displayName) failures.push(`${label} besitzt keinen Anzeigenamen.`);
    if (!definition?.assetId) failures.push(`${label} besitzt keine Asset-ID.`);
    if (typeof definition?.equippable !== 'boolean') failures.push(`${label} besitzt keine Anlegeregel.`);
    if (typeof definition?.autoEquip !== 'boolean') failures.push(`${label} besitzt keine Automatikregel.`);
  });
  return failures;
}
