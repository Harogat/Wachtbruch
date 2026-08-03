export const WEAPON_REBOUND_SCHEMA = 'wachtbruch-weapon-rebound';
export const WEAPON_REBOUND_VERSION = 1;

export const WEAPON_REBOUND_SWEEPS_DEGREES = Object.freeze({
  block: Object.freeze([-14, 14]),
  attack1: Object.freeze([-62, 58]),
  attack2: Object.freeze([58, -62]),
  attack3: Object.freeze([0, 0]),
  attack4: Object.freeze([-78, 78]),
  attack5: Object.freeze([78, -78]),
  attack6: Object.freeze([0, 0])
});

export const WEAPON_REBOUND_DEFAULTS = Object.freeze({
  enabled: true,
  probeStart: 0.32,
  probeRadius: 0.13,
  probeStep: 0.12,
  raySpreadDegrees: 7,
  recoilSeconds: 0.16,
  recoilDistance: 0.16,
  recoverySeconds: 0.22,
  sparkCount: 9,
  impactScale: 0.78
});

function finiteClamped(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback));
}

export function createWeaponReboundProfile(overrides = {}) {
  return {
    enabled: overrides.enabled !== false,
    probeStart: finiteClamped(overrides.probeStart, WEAPON_REBOUND_DEFAULTS.probeStart, 0.05, 2),
    probeRadius: finiteClamped(overrides.probeRadius, WEAPON_REBOUND_DEFAULTS.probeRadius, 0.02, 0.6),
    probeStep: finiteClamped(overrides.probeStep, WEAPON_REBOUND_DEFAULTS.probeStep, 0.03, 0.5),
    raySpreadDegrees: finiteClamped(
      overrides.raySpreadDegrees,
      WEAPON_REBOUND_DEFAULTS.raySpreadDegrees,
      0,
      24
    ),
    recoilSeconds: finiteClamped(
      overrides.recoilSeconds,
      WEAPON_REBOUND_DEFAULTS.recoilSeconds,
      0.06,
      0.5
    ),
    recoilDistance: finiteClamped(
      overrides.recoilDistance,
      WEAPON_REBOUND_DEFAULTS.recoilDistance,
      0,
      0.8
    ),
    recoverySeconds: finiteClamped(
      overrides.recoverySeconds,
      WEAPON_REBOUND_DEFAULTS.recoverySeconds,
      0.08,
      0.8
    ),
    sparkCount: Math.round(finiteClamped(
      overrides.sparkCount,
      WEAPON_REBOUND_DEFAULTS.sparkCount,
      3,
      18
    )),
    impactScale: finiteClamped(
      overrides.impactScale,
      WEAPON_REBOUND_DEFAULTS.impactScale,
      0.35,
      1.5
    )
  };
}

function smoothUnit(value) {
  const progress = Math.min(1, Math.max(0, Number(value) || 0));
  return progress * progress * (3 - 2 * progress);
}

export function weaponSweepAngle({
  profile = 'attack1',
  windowProgress = 0.5
} = {}) {
  const sweep = WEAPON_REBOUND_SWEEPS_DEGREES[profile]
    ?? WEAPON_REBOUND_SWEEPS_DEGREES.attack1;
  const progress = smoothUnit(windowProgress);
  const degrees = sweep[0] + (sweep[1] - sweep[0]) * progress;
  return degrees * Math.PI / 180;
}

export function createWeaponProbeAngles({
  profile = 'attack1',
  windowProgress = 0.5,
  raySpreadDegrees = WEAPON_REBOUND_DEFAULTS.raySpreadDegrees
} = {}) {
  const center = weaponSweepAngle({ profile, windowProgress });
  const baseSpread = finiteClamped(
    raySpreadDegrees,
    WEAPON_REBOUND_DEFAULTS.raySpreadDegrees,
    0,
    24
  );
  const spreadDegrees = profile === 'attack3'
    ? Math.min(3.5, baseSpread)
    : profile === 'attack6'
      ? Math.max(12, baseSpread)
      : baseSpread;
  if (spreadDegrees <= 0) return [center];
  const spread = spreadDegrees * Math.PI / 180;
  return [center - spread, center, center + spread];
}

export function createWeaponProbeDistances({
  start = WEAPON_REBOUND_DEFAULTS.probeStart,
  range = 0,
  step = WEAPON_REBOUND_DEFAULTS.probeStep
} = {}) {
  const safeRange = Math.max(0, Number(range) || 0);
  if (safeRange <= 0) return [];
  const safeStart = Math.min(safeRange, Math.max(0, Number(start) || 0));
  const safeStep = Math.max(0.01, Number(step) || WEAPON_REBOUND_DEFAULTS.probeStep);
  const distances = [];
  for (let distance = safeStart; distance < safeRange; distance += safeStep) {
    distances.push(distance);
  }
  if (!distances.length || safeRange - distances.at(-1) > 0.0001) distances.push(safeRange);
  return distances;
}

export function createGodotWeaponReboundProfile(overrides = {}) {
  return {
    schema: WEAPON_REBOUND_SCHEMA,
    version: WEAPON_REBOUND_VERSION,
    profile: createWeaponReboundProfile(overrides),
    sweepDegrees: Object.fromEntries(
      Object.entries(WEAPON_REBOUND_SWEEPS_DEGREES)
        .map(([profile, sweep]) => [profile, [...sweep]])
    )
  };
}
