function freezeEnemy(enemy) {
  return Object.freeze({
    ...enemy,
    combat: Object.freeze({ ...enemy.combat })
  });
}

export function createEnemyCatalog({ bossMaxHealth, bossBodyRadius } = {}) {
  if (!Number.isFinite(bossMaxHealth) || bossMaxHealth <= 0) {
    throw new Error('bossMaxHealth muss groesser als 0 sein.');
  }
  if (!Number.isFinite(bossBodyRadius) || bossBodyRadius <= 0) {
    throw new Error('bossBodyRadius muss groesser als 0 sein.');
  }

  return Object.freeze({
    'orc-scout-sword': freezeEnemy({
      id: 'orc-scout-sword',
      editorAssetId: 'enemy-sword',
      editorLabel: 'Ork-Sp\u00e4her mit Schwert',
      model: 'character-orc',
      animation: 'idle',
      scale: 1,
      combat: {
        name: 'Ork-Sp\u00e4her',
        health: 2,
        coinReward: 3,
        weapon: 'weapon-sword',
        attackType: 'melee'
      }
    }),
    'orc-spear-thrower': freezeEnemy({
      id: 'orc-spear-thrower',
      editorAssetId: 'enemy-spear',
      editorLabel: 'Ork-Speerwerfer',
      model: 'character-orc',
      animation: 'idle',
      scale: 1,
      combat: {
        name: 'Ork-Speerwerfer',
        health: 2,
        coinReward: 4,
        weapon: 'weapon-spear',
        attackType: 'ranged'
      }
    }),
    'bruchhauptmann': freezeEnemy({
      id: 'bruchhauptmann',
      editorAssetId: 'enemy-boss',
      editorLabel: 'Bruchhauptmann der Schattenlande',
      model: 'character-orc',
      animation: 'idle',
      scale: 2,
      combat: {
        name: 'Bruchhauptmann',
        health: bossMaxHealth,
        coinReward: 16,
        weapon: 'weapon-spear',
        attackType: 'boss',
        boss: true,
        bodyRadius: bossBodyRadius
      }
    })
  });
}
