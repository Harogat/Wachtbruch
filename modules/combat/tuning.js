export const COMBAT_TUNING_SCHEMA = 'wachtbruch-combat-tuning';
export const COMBAT_TUNING_VERSION = 1;

export const COMBAT_TUNING_DEFAULTS = Object.freeze({
  impact: Object.freeze({
    hitStopScale: 1,
    slowMotionScale: 1,
    cameraShakeScale: 1
  }),
  meleeEnemy: Object.freeze({
    windup: 0.38,
    active: 0.4,
    recovery: 0.18,
    cooldown: 0.76,
    triggerRangeScale: 1,
    hitRangeScale: 1
  })
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizedNumber(value, fallback, min, max) {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : fallback, min, max);
}

export function createCombatTuning(candidate = {}) {
  const impact = candidate?.impact ?? {};
  const meleeEnemy = candidate?.meleeEnemy ?? {};
  return {
    impact: {
      hitStopScale: normalizedNumber(
        impact.hitStopScale,
        COMBAT_TUNING_DEFAULTS.impact.hitStopScale,
        0.35,
        1.8
      ),
      slowMotionScale: normalizedNumber(
        impact.slowMotionScale,
        COMBAT_TUNING_DEFAULTS.impact.slowMotionScale,
        0.35,
        1.8
      ),
      cameraShakeScale: normalizedNumber(
        impact.cameraShakeScale,
        COMBAT_TUNING_DEFAULTS.impact.cameraShakeScale,
        0,
        1.8
      )
    },
    meleeEnemy: {
      windup: normalizedNumber(
        meleeEnemy.windup,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.windup,
        0.12,
        0.9
      ),
      active: normalizedNumber(
        meleeEnemy.active,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.active,
        0.16,
        0.65
      ),
      recovery: normalizedNumber(
        meleeEnemy.recovery,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.recovery,
        0.08,
        0.75
      ),
      cooldown: normalizedNumber(
        meleeEnemy.cooldown,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.cooldown,
        0.1,
        1.8
      ),
      triggerRangeScale: normalizedNumber(
        meleeEnemy.triggerRangeScale,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.triggerRangeScale,
        0.75,
        1.45
      ),
      hitRangeScale: normalizedNumber(
        meleeEnemy.hitRangeScale,
        COMBAT_TUNING_DEFAULTS.meleeEnemy.hitRangeScale,
        0.75,
        1.45
      )
    }
  };
}

export function serializeCombatTuning(settings) {
  return createCombatTuning(settings);
}

export function createGodotCombatProfile({
  tuning,
  weapon,
  attackProfile,
  attackSpeed,
  attackFeel,
  comboPause
}) {
  const normalized = createCombatTuning(tuning);
  return {
    schema: COMBAT_TUNING_SCHEMA,
    version: COMBAT_TUNING_VERSION,
    exportedAt: new Date().toISOString(),
    playerAttack: {
      weapon,
      profile: attackProfile,
      animationSpeedMultiplier: Number(attackSpeed),
      rangeMultiplier: Number(attackFeel.rangeScale),
      hitWindow: {
        startRatio: Number(attackFeel.hitStart),
        endRatio: Number(attackFeel.hitEnd)
      },
      lungeMultiplier: Number(attackFeel.lungeScale),
      impactMultiplier: Number(attackFeel.impactScale),
      comboPauseSeconds: Number(comboPause)
    },
    impact: {
      hitStopMultiplier: normalized.impact.hitStopScale,
      slowMotionMultiplier: normalized.impact.slowMotionScale,
      cameraShakeMultiplier: normalized.impact.cameraShakeScale
    },
    meleeEnemy: {
      windupSeconds: normalized.meleeEnemy.windup,
      activeSeconds: normalized.meleeEnemy.active,
      recoverySeconds: normalized.meleeEnemy.recovery,
      cooldownSeconds: normalized.meleeEnemy.cooldown,
      triggerRangeMultiplier: normalized.meleeEnemy.triggerRangeScale,
      hitRangeMultiplier: normalized.meleeEnemy.hitRangeScale
    }
  };
}
