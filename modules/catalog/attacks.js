export const ATTACK_CATALOG = Object.freeze({
  sword: Object.freeze({
    id: 'sword',
    label: 'Schwert',
    steps: Object.freeze([
      Object.freeze({ id: 'sword-sweep', profile: 'attack1', damage: 1, knockback: 7.2, duration: 0.4, animation: 'attack-melee-right', animationSpeed: 1.38, hitStart: 0.29, hitEnd: 0.6, rangeCells: 0.86, cone: 0, lungeCells: 0.075, lungeStart: 0.14, lungeEnd: 0.52, chainAt: 0.78 }),
      Object.freeze({ id: 'sword-return', profile: 'attack2', damage: 1, knockback: 7.2, duration: 0.44, animation: 'attack-melee-left', animationSpeed: 1.28, hitStart: 0.31, hitEnd: 0.64, rangeCells: 0.94, cone: -0.06, lungeCells: 0.06, lungeStart: 0.18, lungeEnd: 0.56, chainAt: 0.79 }),
      Object.freeze({ id: 'sword-thrust', profile: 'attack3', damage: 1, destructibleDamage: 2, knockback: 7.2, finisher: true, empoweredDamageBonus: 1, duration: 0.52, animation: 'interact-right', animationSpeed: 1.22, hitStart: 0.39, hitEnd: 0.7, rangeCells: 1.08, cone: 0.76, lungeCells: 0.32, lungeStart: 0.25, lungeEnd: 0.68, chainAt: 0.83 }),
      Object.freeze({ id: 'sword-horizontal-four', profile: 'attack4', damage: 1, knockback: 7.2, horizontalSweep: true, sweepDirection: -1, armStartDeg: 18, armEndDeg: -66, duration: 0.56, animation: 'holding-right', animationSpeed: 1, hitStart: 0.25, hitEnd: 0.68, rangeCells: 1.18, cone: 0, lungeCells: 0.06, lungeStart: 0.2, lungeEnd: 0.66, chainAt: 0.76 }),
      Object.freeze({ id: 'sword-horizontal-five', profile: 'attack5', damage: 2, destructibleDamage: 2, knockback: 12.4, finisher: true, horizontalSweep: true, reverseSweep: true, sweepDirection: -1, armStartDeg: -66, armEndDeg: 18, duration: 0.58, animation: 'holding-right', animationSpeed: 1, hitStart: 0.23, hitEnd: 0.67, rangeCells: 1.2, cone: 0, lungeCells: 0.07, lungeStart: 0.18, lungeEnd: 0.66, chainAt: 0.76 }),
      Object.freeze({ id: 'sword-whirl', profile: 'attack6', damage: 1, knockback: 7.2, holdOnly: true, armStartDeg: -90, armEndDeg: -90, duration: 1.16, animation: 'attack-melee-right', chargeAnimation: 'holding-both', chargeEnd: 0.56, animationSpeed: 1.34, hitStart: 0.67, hitEnd: 0.9, rangeCells: 1.28, cone: -1 })
    ])
  }),
  spear: Object.freeze({
    id: 'spear',
    label: 'Speer',
    steps: Object.freeze([
      Object.freeze({ id: 'spear-sweep', profile: 'attack1', damage: 1, knockback: 9.4, duration: 0.47, animation: 'attack-melee-right', animationSpeed: 1.2, hitStart: 0.29, hitEnd: 0.6, rangeCells: 1.06, cone: 0.16, lungeCells: 0.08, lungeStart: 0.15, lungeEnd: 0.53, chainAt: 0.79 }),
      Object.freeze({ id: 'spear-return', profile: 'attack2', damage: 1, knockback: 9.4, duration: 0.52, animation: 'attack-melee-left', animationSpeed: 1.12, hitStart: 0.32, hitEnd: 0.65, rangeCells: 1.16, cone: 0.18, lungeCells: 0.08, lungeStart: 0.18, lungeEnd: 0.57, chainAt: 0.8 }),
      Object.freeze({ id: 'spear-thrust', profile: 'attack3', damage: 1, destructibleDamage: 2, knockback: 9.4, finisher: true, duration: 0.59, animation: 'interact-right', animationSpeed: 1.13, hitStart: 0.39, hitEnd: 0.7, rangeCells: 1.38, cone: 0.84, lungeCells: 0.44, lungeStart: 0.25, lungeEnd: 0.7, chainAt: 0.84 }),
      Object.freeze({ id: 'spear-horizontal-four', profile: 'attack4', damage: 1, knockback: 9.4, horizontalSweep: true, sweepDirection: -1, armStartDeg: 18, armEndDeg: -70, duration: 0.6, animation: 'holding-right', animationSpeed: 1, hitStart: 0.25, hitEnd: 0.68, rangeCells: 1.28, cone: 0, lungeCells: 0.08, lungeStart: 0.2, lungeEnd: 0.67, chainAt: 0.77 }),
      Object.freeze({ id: 'spear-horizontal-five', profile: 'attack5', damage: 2, destructibleDamage: 2, knockback: 12.4, finisher: true, horizontalSweep: true, reverseSweep: true, sweepDirection: -1, armStartDeg: -70, armEndDeg: 18, duration: 0.62, animation: 'holding-right', animationSpeed: 1, hitStart: 0.24, hitEnd: 0.68, rangeCells: 1.32, cone: 0, lungeCells: 0.09, lungeStart: 0.19, lungeEnd: 0.67, chainAt: 0.77 }),
      Object.freeze({ id: 'spear-whirl', profile: 'attack6', damage: 1, knockback: 9.4, holdOnly: true, armStartDeg: -90, armEndDeg: -90, duration: 1.24, animation: 'attack-melee-right', chargeAnimation: 'holding-both', chargeEnd: 0.58, animationSpeed: 1.2, hitStart: 0.69, hitEnd: 0.91, rangeCells: 1.46, cone: -1 })
    ])
  })
});

function validateAttackStep(weaponId, step, index) {
  const values = [step.damage, step.knockback, step.duration, step.animationSpeed, step.hitStart, step.hitEnd, step.rangeCells, step.cone];
  if (!step.id || !step.profile || !step.animation || !values.every(Number.isFinite)) {
    throw new Error(`Ungueltiger Angriff ${weaponId}[${index}]`);
  }
  if (step.damage <= 0 || step.knockback < 0 || step.hitStart < 0 || step.hitEnd > 1 || step.hitStart >= step.hitEnd || step.rangeCells <= 0) {
    throw new Error(`Ungueltiges Trefferfenster ${weaponId}[${index}]`);
  }
  if (step.destructibleDamage !== undefined
    && (!Number.isFinite(step.destructibleDamage) || step.destructibleDamage <= 0)) {
    throw new Error(`Ungueltiger Objektschaden ${weaponId}[${index}]`);
  }
  if (step.empoweredDamageBonus !== undefined
    && (!Number.isFinite(step.empoweredDamageBonus) || step.empoweredDamageBonus < 0)) {
    throw new Error(`Ungueltiger Verstaerkungsschaden ${weaponId}[${index}]`);
  }
  if (step.chargeAnimation
    && (!Number.isFinite(step.chargeEnd) || step.chargeEnd <= 0 || step.chargeEnd >= step.hitStart)) {
    throw new Error(`Ungueltige Aufladephase ${weaponId}[${index}]`);
  }
  if (step.horizontalSweep && ![-1, 1].includes(step.sweepDirection)) {
    throw new Error(`Ungueltige Schwungrichtung ${weaponId}[${index}]`);
  }
  if (step.horizontalSweep && ![step.armStartDeg, step.armEndDeg].every(Number.isFinite)) {
    throw new Error(`Fehlender Armwinkel ${weaponId}[${index}]`);
  }
  if ([step.armStartDeg, step.armEndDeg].some((value) => value !== undefined)
    && (![step.armStartDeg, step.armEndDeg].every(Number.isFinite)
      || Math.abs(step.armStartDeg) > 150
      || Math.abs(step.armEndDeg) > 150)) {
    throw new Error(`Ungueltiger Armwinkel ${weaponId}[${index}]`);
  }
  if (step.reverseSweep && !step.horizontalSweep) {
    throw new Error(`Ungueltiger Rueckschwung ${weaponId}[${index}]`);
  }
  const lungeValues = [step.lungeCells, step.lungeStart, step.lungeEnd, step.chainAt]
    .filter((value) => value !== undefined);
  if (!lungeValues.every(Number.isFinite)
    || (step.lungeCells ?? 0) < 0
    || (step.lungeStart ?? 0) < 0
    || (step.lungeEnd ?? 1) > 1
    || (step.lungeStart ?? 0) >= (step.lungeEnd ?? 1)
    || (step.chainAt ?? 1) < step.hitEnd
    || (step.chainAt ?? 1) > 1) {
    throw new Error(`Ungueltiger Bewegungs- oder Kettenwert ${weaponId}[${index}]`);
  }
}

export function createAttackSets(cellSize) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error('CELL muss groesser als 0 sein.');
  return Object.freeze(Object.fromEntries(Object.entries(ATTACK_CATALOG).map(([weaponId, weapon]) => {
    const attacks = weapon.steps.map((step, index) => {
      validateAttackStep(weaponId, step, index);
      return Object.freeze({
        ...step,
        range: cellSize * step.rangeCells,
        lunge: cellSize * (step.lungeCells ?? 0)
      });
    });
    return [weaponId, Object.freeze(attacks)];
  })));
}
