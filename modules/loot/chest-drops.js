export const CHEST_DROP_SCHEMA = 'wachtbruch-chest-drops';
export const CHEST_DROP_VERSION = 2;

export const CHEST_DROP_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'choice', displayName: 'Auswahlbelohnung', usesAmount: false }),
  Object.freeze({ id: 'coins', displayName: 'Muenzen', usesAmount: true }),
  Object.freeze({ id: 'sword', displayName: 'Schwert', usesAmount: false }),
  Object.freeze({ id: 'spear', displayName: 'Speer', usesAmount: false }),
  Object.freeze({ id: 'helmet', displayName: 'Wachthelm', usesAmount: false }),
  Object.freeze({ id: 'hook', displayName: 'Enterhaken', usesAmount: false }),
  Object.freeze({ id: 'healing', displayName: 'Heilung', usesAmount: false })
]);

export const CHEST_DROP_TYPES = Object.freeze(CHEST_DROP_DEFINITIONS.map((definition) => definition.id));
const CHEST_DROP_TYPE_SET = new Set(CHEST_DROP_TYPES);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeChestDrop(candidate = {}) {
  const type = CHEST_DROP_TYPE_SET.has(candidate.dropType)
    ? candidate.dropType
    : CHEST_DROP_TYPE_SET.has(candidate.type)
      ? candidate.type
      : 'choice';
  const requestedAmount = candidate.dropAmount ?? candidate.amount;
  const amount = clamp(Math.round(Number(requestedAmount) || 5), 1, 25);
  return { type, amount };
}

export function applyNormalizedChestDrop(settings = {}) {
  const drop = normalizeChestDrop(settings);
  settings.dropType = drop.type;
  settings.dropAmount = drop.amount;
  return drop;
}

export function createGodotChestDropCatalog() {
  return {
    schema: CHEST_DROP_SCHEMA,
    version: CHEST_DROP_VERSION,
    drops: CHEST_DROP_DEFINITIONS.map((definition) => ({ ...definition }))
  };
}

export function validateChestDropCatalog(definitions = CHEST_DROP_DEFINITIONS) {
  const failures = [];
  const ids = new Set();
  definitions.forEach((definition, index) => {
    const label = definition?.id || `Index ${index}`;
    if (!definition?.id || ids.has(definition.id)) failures.push(`Doppelte oder leere Truhen-Drop-ID: ${label}.`);
    ids.add(definition?.id);
    if (!definition?.displayName) failures.push(`${label} besitzt keinen Anzeigenamen.`);
    if (typeof definition?.usesAmount !== 'boolean') failures.push(`${label} besitzt keine Mengenregel.`);
  });
  return failures;
}
