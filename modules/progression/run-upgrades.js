export const RUN_UPGRADE_SCHEMA = 'wachtbruch-run-upgrades';
export const RUN_UPGRADE_VERSION = 1;
export const SUPPLY_REROLL_COST = 2;

const ADDITIVE_EFFECT_KEYS = Object.freeze([
  'maxHealthBonus',
  'baseDamageBonus',
  'finisherDamageBonus',
  'waveHeal'
]);
const MULTIPLICATIVE_EFFECT_KEYS = Object.freeze([
  'attackSpeedMultiplier',
  'knockbackMultiplier',
  'impactMultiplier',
  'staminaRegenMultiplier',
  'magnetRadiusMultiplier',
  'dodgeCostMultiplier',
  'hookCooldownMultiplier'
]);

const RUN_PROGRESS_DEFAULTS = Object.freeze({
  maxHealthBonus: 0,
  baseDamageBonus: 0,
  attackSpeedMultiplier: 1,
  finisherDamageBonus: 0,
  knockbackMultiplier: 1,
  impactMultiplier: 1,
  staminaRegenMultiplier: 1,
  magnetRadiusMultiplier: 1,
  dodgeCostMultiplier: 1,
  hookCooldownMultiplier: 1,
  waveHeal: 0
});

function defineUpgrade({
  effects = {},
  ...definition
}) {
  return Object.freeze({
    ...definition,
    effects: Object.freeze({
      add: Object.freeze({ ...(effects.add ?? {}) }),
      multiply: Object.freeze({ ...(effects.multiply ?? {}) }),
      restoreHealth: Number(effects.restoreHealth) || 0
    })
  });
}

export const RUN_UPGRADES = Object.freeze([
  defineUpgrade({
    id: 'guardian-heart',
    name: 'Waechterherz',
    icon: 'heart',
    detail: '+1 maximales Leben und sofortige Heilung.',
    price: 8,
    maxStacks: 2,
    effects: { add: { maxHealthBonus: 1 }, restoreHealth: 2 }
  }),
  defineUpgrade({
    id: 'sharp-blade',
    name: 'Scharfe Klinge',
    icon: 'sword',
    detail: '+1 Schaden auf alle Waffenangriffe.',
    price: 8,
    maxStacks: 2,
    effects: { add: { baseDamageBonus: 1 } }
  }),
  defineUpgrade({
    id: 'quick-grip',
    name: 'Rascher Griff',
    icon: 'zap',
    detail: 'Waffenangriffe werden 10 Prozent schneller.',
    price: 6,
    maxStacks: 3,
    effects: { multiply: { attackSpeedMultiplier: 1.1 } }
  }),
  defineUpgrade({
    id: 'heavy-finisher',
    name: 'Wuchtzeichen',
    icon: 'badge-alert',
    detail: 'Finisher verursachen +1 Schaden und Treffer stossen staerker zurueck.',
    price: 7,
    maxStacks: 3,
    effects: {
      add: { finisherDamageBonus: 1 },
      multiply: { knockbackMultiplier: 1.12, impactMultiplier: 1.08 }
    }
  }),
  defineUpgrade({
    id: 'stamina-knot',
    name: 'Schildknoten',
    icon: 'shield',
    detail: 'Ausdauer regeneriert sich 25 Prozent schneller.',
    price: 5,
    maxStacks: 3,
    effects: { multiply: { staminaRegenMultiplier: 1.25 } }
  }),
  defineUpgrade({
    id: 'coin-call',
    name: 'Muenzenruf',
    icon: 'coins',
    detail: 'Der Sammelradius der Muenzen waechst um 35 Prozent.',
    price: 4,
    maxStacks: 3,
    effects: { multiply: { magnetRadiusMultiplier: 1.35 } }
  }),
  defineUpgrade({
    id: 'light-step',
    name: 'Leichter Schritt',
    icon: 'move-diagonal-2',
    detail: 'Ausweichen kostet 18 Prozent weniger Ausdauer.',
    price: 6,
    maxStacks: 2,
    effects: { multiply: { dodgeCostMultiplier: 0.82 } }
  }),
  defineUpgrade({
    id: 'hook-core',
    name: 'Hakenkern',
    icon: 'anchor',
    detail: 'Der Enterhaken ist 22 Prozent schneller wieder bereit.',
    price: 5,
    maxStacks: 2,
    effects: { multiply: { hookCooldownMultiplier: 0.78 } }
  }),
  defineUpgrade({
    id: 'battle-breath',
    name: 'Atem der Wacht',
    icon: 'sparkles',
    detail: 'Nach jeder bestandenen Welle heilt Ra 1 Leben.',
    price: 7,
    maxStacks: 2,
    effects: { add: { waveHeal: 1 } }
  })
]);

const RUN_UPGRADE_BY_ID = new Map(RUN_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));

export function createRunProgress() {
  return {
    upgrades: new Map(),
    ...RUN_PROGRESS_DEFAULTS
  };
}

export function resetRunProgress(progress) {
  if (!progress || typeof progress !== 'object') {
    throw new Error('RunProgress muss ein Objekt sein.');
  }
  if (progress.upgrades instanceof Map) progress.upgrades.clear();
  else progress.upgrades = new Map();
  Object.assign(progress, RUN_PROGRESS_DEFAULTS);
  return progress;
}

export function runUpgradeStackCount(progress, upgradeId) {
  if (!(progress?.upgrades instanceof Map)) return 0;
  return Math.max(0, Math.floor(Number(progress.upgrades.get(upgradeId)) || 0));
}

export function availableRunUpgrades(progress, definitions = RUN_UPGRADES) {
  return definitions.filter((upgrade) => runUpgradeStackCount(progress, upgrade.id) < upgrade.maxStacks);
}

export function rollRunUpgradeOffers(
  progress,
  { count = 3, random = Math.random, definitions = RUN_UPGRADES } = {}
) {
  const pool = [...availableRunUpgrades(progress, definitions)];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, Math.max(0, Math.floor(count))).map((upgrade) => upgrade.id);
}

export function applyRunUpgrade(progress, upgradeOrId) {
  if (!progress || typeof progress !== 'object') {
    return { applied: false, reason: 'invalid-progress', upgrade: null, stack: 0, restoreHealth: 0 };
  }
  const upgrade = typeof upgradeOrId === 'string'
    ? RUN_UPGRADE_BY_ID.get(upgradeOrId)
    : RUN_UPGRADE_BY_ID.get(upgradeOrId?.id);
  if (!upgrade) {
    return { applied: false, reason: 'unknown-upgrade', upgrade: null, stack: 0, restoreHealth: 0 };
  }
  if (!(progress.upgrades instanceof Map)) progress.upgrades = new Map();
  const currentStack = runUpgradeStackCount(progress, upgrade.id);
  if (currentStack >= upgrade.maxStacks) {
    return {
      applied: false,
      reason: 'max-stacks',
      upgrade,
      stack: currentStack,
      restoreHealth: 0
    };
  }

  Object.entries(upgrade.effects.add).forEach(([key, value]) => {
    progress[key] = Number(progress[key] ?? RUN_PROGRESS_DEFAULTS[key] ?? 0) + value;
  });
  Object.entries(upgrade.effects.multiply).forEach(([key, value]) => {
    progress[key] = Number(progress[key] ?? RUN_PROGRESS_DEFAULTS[key] ?? 1) * value;
  });
  const stack = currentStack + 1;
  progress.upgrades.set(upgrade.id, stack);
  return {
    applied: true,
    reason: null,
    upgrade,
    stack,
    restoreHealth: upgrade.effects.restoreHealth
  };
}

export function serializeRunProgress(progress) {
  const upgrades = progress?.upgrades instanceof Map
    ? Object.fromEntries([...progress.upgrades.entries()].sort(([left], [right]) => left.localeCompare(right)))
    : {};
  return {
    upgrades,
    ...Object.fromEntries(Object.keys(RUN_PROGRESS_DEFAULTS).map((key) => [
      key,
      Number(progress?.[key] ?? RUN_PROGRESS_DEFAULTS[key])
    ]))
  };
}

export function hydrateRunProgress(progress, candidate = {}) {
  resetRunProgress(progress);
  const upgrades = candidate?.upgrades && typeof candidate.upgrades === 'object'
    ? candidate.upgrades
    : {};
  Object.entries(upgrades).forEach(([upgradeId, stackValue]) => {
    const upgrade = RUN_UPGRADE_BY_ID.get(upgradeId);
    if (!upgrade) return;
    const stack = Math.min(
      upgrade.maxStacks,
      Math.max(0, Math.floor(Number(stackValue) || 0))
    );
    for (let index = 0; index < stack; index += 1) applyRunUpgrade(progress, upgrade);
  });
  return progress;
}

export function createGodotRunUpgradeCatalog() {
  return {
    schema: RUN_UPGRADE_SCHEMA,
    version: RUN_UPGRADE_VERSION,
    rerollCost: SUPPLY_REROLL_COST,
    upgrades: RUN_UPGRADES.map((upgrade) => ({
      id: upgrade.id,
      displayName: upgrade.name,
      icon: upgrade.icon,
      description: upgrade.detail,
      price: upgrade.price,
      maxStacks: upgrade.maxStacks,
      effects: {
        add: { ...upgrade.effects.add },
        multiply: { ...upgrade.effects.multiply },
        restoreHealth: upgrade.effects.restoreHealth
      }
    }))
  };
}

export function validateRunUpgradeCatalog(definitions = RUN_UPGRADES) {
  const failures = [];
  const ids = new Set();
  definitions.forEach((upgrade, index) => {
    const label = upgrade?.id || `Index ${index}`;
    if (!upgrade?.id || ids.has(upgrade.id)) failures.push(`Doppelte oder leere Upgrade-ID: ${label}.`);
    ids.add(upgrade?.id);
    if (!upgrade?.name || !upgrade?.detail || !upgrade?.icon) failures.push(`${label} besitzt unvollstaendige UI-Daten.`);
    if (!Number.isInteger(upgrade?.price) || upgrade.price < 0) failures.push(`${label} besitzt einen ungueltigen Preis.`);
    if (!Number.isInteger(upgrade?.maxStacks) || upgrade.maxStacks < 1) {
      failures.push(`${label} besitzt keine gueltige Stapelgrenze.`);
    }
    Object.keys(upgrade?.effects?.add ?? {}).forEach((key) => {
      if (!ADDITIVE_EFFECT_KEYS.includes(key)) failures.push(`${label} addiert den unbekannten Wert ${key}.`);
    });
    Object.keys(upgrade?.effects?.multiply ?? {}).forEach((key) => {
      if (!MULTIPLICATIVE_EFFECT_KEYS.includes(key)) failures.push(`${label} multipliziert den unbekannten Wert ${key}.`);
    });
  });
  return failures;
}
