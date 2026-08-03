export const GAME_SAVE_SCHEMA = 'wachtbruch-game-save';
export const GAME_SAVE_VERSION = 1;
export const GAME_SAVE_SLOT_COUNT = 3;
export const GAME_SAVE_META_SCHEMA = 'wachtbruch-game-save-meta';
export const GAME_SAVE_META_VERSION = 1;

export const GAME_SAVE_CHECKPOINT_STATES = Object.freeze([
  'ready',
  'exit-ready',
  'victory'
]);

export const GAME_SAVE_AUTOSAVE_REASONS = Object.freeze([
  'new-game',
  'room-entry',
  'room-cleared',
  'reward-collected',
  'supply-complete',
  'equipment-changed',
  'return-title',
  'manual'
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function integer(value, fallback = 0, minimum = 0) {
  return Math.max(minimum, Math.floor(finiteNumber(value, fallback)));
}

function cloneSerializable(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizedTimestamp(value, fallback) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function normalizedPosition(candidate = {}) {
  return {
    x: finiteNumber(candidate.x),
    y: finiteNumber(candidate.y, 0.18),
    z: finiteNumber(candidate.z)
  };
}

function normalizedPendingCoins(values) {
  if (!Array.isArray(values)) return [];
  return values.slice(0, 256).map((entry) => ({
    position: normalizedPosition(entry?.position),
    value: integer(entry?.value, 1, 1)
  }));
}

export function normalizeGameSaveSlot(slot, fallback = 1) {
  const normalized = integer(slot, fallback, 1);
  return normalized <= GAME_SAVE_SLOT_COUNT ? normalized : fallback;
}

export function createGameSaveMeta({
  activeSlot = null,
  savedAt = new Date().toISOString()
} = {}) {
  const normalizedSlot = Number.isInteger(Number(activeSlot))
    && Number(activeSlot) >= 1
    && Number(activeSlot) <= GAME_SAVE_SLOT_COUNT
    ? Number(activeSlot)
    : null;
  return {
    schema: GAME_SAVE_META_SCHEMA,
    version: GAME_SAVE_META_VERSION,
    activeSlot: normalizedSlot,
    savedAt: normalizedTimestamp(savedAt, new Date().toISOString())
  };
}

export function createGameSave({
  slot = 1,
  createdAt = null,
  savedAt = new Date().toISOString(),
  reason = 'manual',
  playSeconds = 0,
  summary = {},
  checkpoint = {},
  player = {},
  progression = {},
  world = {}
} = {}) {
  const normalizedSavedAt = normalizedTimestamp(savedAt, new Date().toISOString());
  const normalizedCreatedAt = normalizedTimestamp(createdAt, normalizedSavedAt);
  const checkpointState = GAME_SAVE_CHECKPOINT_STATES.includes(checkpoint.state)
    ? checkpoint.state
    : 'ready';
  const equippedWeapon = player.equippedWeapon === 'spear' ? 'spear' : 'sword';
  const inventory = player.inventory ?? {};
  const health = integer(player.health, 1);
  const maxHealth = Math.max(1, integer(player.maxHealth, Math.max(1, health), 1));
  const coins = integer(inventory.coins);
  const roomId = String(checkpoint.roomId ?? summary.roomId ?? 'wachhof').trim() || 'wachhof';
  const roomName = String(summary.roomName ?? roomId).trim() || roomId;
  const level = integer(checkpoint.level ?? summary.level, 1, 1);

  return {
    schema: GAME_SAVE_SCHEMA,
    version: GAME_SAVE_VERSION,
    slot: normalizeGameSaveSlot(slot),
    createdAt: normalizedCreatedAt,
    savedAt: normalizedSavedAt,
    reason: GAME_SAVE_AUTOSAVE_REASONS.includes(reason) ? reason : 'manual',
    playSeconds: Math.max(0, finiteNumber(playSeconds)),
    summary: {
      roomId,
      roomName,
      level,
      checkpointLabel: String(summary.checkpointLabel ?? roomName).trim() || roomName,
      health: Math.min(health, maxHealth),
      maxHealth,
      coins
    },
    checkpoint: {
      roomId,
      level,
      state: checkpointState,
      position: normalizedPosition(checkpoint.position),
      rotationY: finiteNumber(checkpoint.rotationY, Math.PI)
    },
    player: {
      health: Math.min(health, maxHealth),
      maxHealth,
      stamina: Math.max(0, Math.min(1, finiteNumber(player.stamina, 1))),
      inventory: {
        coins,
        potions: integer(inventory.potions, 3)
      },
      equippedWeapon,
      swordEmpowered: equippedWeapon === 'sword' && Boolean(player.swordEmpowered)
    },
    progression: {
      run: cloneSerializable(progression.run),
      equipment: cloneSerializable(progression.equipment)
    },
    world: {
      completedRooms: uniqueStrings(world.completedRooms),
      openedRewardRooms: uniqueStrings(world.openedRewardRooms),
      defeatedBossRooms: uniqueStrings(world.defeatedBossRooms),
      pendingCoins: normalizedPendingCoins(world.pendingCoins)
    }
  };
}

export function validateGameSave(candidate, expectedSlot = null) {
  const failures = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return ['Spielstand ist kein Objekt.'];
  }
  if (candidate.schema !== GAME_SAVE_SCHEMA) failures.push('Spielstand besitzt das falsche Schema.');
  if (candidate.version !== GAME_SAVE_VERSION) failures.push('Spielstand besitzt die falsche Version.');
  const slot = Number(candidate.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > GAME_SAVE_SLOT_COUNT) {
    failures.push('Spielstand besitzt keinen gueltigen Slot.');
  }
  if (expectedSlot !== null && slot !== normalizeGameSaveSlot(expectedSlot)) {
    failures.push('Spielstand liegt im falschen Slot.');
  }
  if (!Number.isFinite(Date.parse(String(candidate.createdAt ?? '')))) {
    failures.push('Spielstand besitzt kein gueltiges Erstelldatum.');
  }
  if (!Number.isFinite(Date.parse(String(candidate.savedAt ?? '')))) {
    failures.push('Spielstand besitzt kein gueltiges Speicherdatum.');
  }
  if (!Number.isFinite(Number(candidate.playSeconds)) || Number(candidate.playSeconds) < 0) {
    failures.push('Spielstand besitzt keine gueltige Spielzeit.');
  }
  if (!candidate.summary?.roomId || !candidate.summary?.roomName) {
    failures.push('Spielstand besitzt keine Raumvorschau.');
  }
  if (!candidate.checkpoint?.roomId
    || !GAME_SAVE_CHECKPOINT_STATES.includes(candidate.checkpoint?.state)) {
    failures.push('Spielstand besitzt keinen gueltigen Checkpoint.');
  }
  const position = candidate.checkpoint?.position;
  if (!position || !['x', 'y', 'z'].every((axis) => Number.isFinite(Number(position[axis])))) {
    failures.push('Spielstand besitzt keine gueltige Spielerposition.');
  }
  if (!candidate.player?.inventory
    || !Number.isFinite(Number(candidate.player.inventory.coins))
    || !Number.isFinite(Number(candidate.player.inventory.potions))) {
    failures.push('Spielstand besitzt kein gueltiges Inventar.');
  }
  if (!candidate.progression?.run || !candidate.progression?.equipment) {
    failures.push('Spielstand besitzt keine Fortschrittsdaten.');
  }
  if (!candidate.world
    || !['completedRooms', 'openedRewardRooms', 'defeatedBossRooms']
      .every((key) => Array.isArray(candidate.world[key]))) {
    failures.push('Spielstand besitzt keinen gueltigen Weltfortschritt.');
  }
  const pendingCoins = candidate.world?.pendingCoins ?? [];
  if (!Array.isArray(pendingCoins)
    || pendingCoins.some((coin) => {
      const position = coin?.position;
      return !position
        || !['x', 'y', 'z'].every((axis) => Number.isFinite(Number(position[axis])))
        || !Number.isFinite(Number(coin.value))
        || Number(coin.value) < 1;
    })) {
    failures.push('Spielstand besitzt keine gueltigen ausstehenden Muenzen.');
  }
  return failures;
}

export function validateGameSaveMeta(candidate) {
  const failures = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return ['Spielstand-Metadaten sind kein Objekt.'];
  }
  if (candidate.schema !== GAME_SAVE_META_SCHEMA) failures.push('Spielstand-Metadaten besitzen das falsche Schema.');
  if (candidate.version !== GAME_SAVE_META_VERSION) failures.push('Spielstand-Metadaten besitzen die falsche Version.');
  if (candidate.activeSlot !== null) {
    const slot = Number(candidate.activeSlot);
    if (!Number.isInteger(slot) || slot < 1 || slot > GAME_SAVE_SLOT_COUNT) {
      failures.push('Spielstand-Metadaten besitzen keinen gueltigen aktiven Slot.');
    }
  }
  return failures;
}

export function formatGameSaveDuration(playSeconds) {
  const totalMinutes = Math.max(0, Math.floor(finiteNumber(playSeconds) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`;
}

export function createGodotSaveSlotContract() {
  return {
    schema: GAME_SAVE_SCHEMA,
    version: GAME_SAVE_VERSION,
    slotCount: GAME_SAVE_SLOT_COUNT,
    checkpointStates: [...GAME_SAVE_CHECKPOINT_STATES],
    autosaveReasons: [...GAME_SAVE_AUTOSAVE_REASONS],
    sections: {
      summary: ['roomId', 'roomName', 'level', 'checkpointLabel', 'health', 'maxHealth', 'coins'],
      checkpoint: ['roomId', 'level', 'state', 'position', 'rotationY'],
      player: ['health', 'maxHealth', 'stamina', 'inventory', 'equippedWeapon', 'swordEmpowered'],
      progression: ['run', 'equipment'],
      world: ['completedRooms', 'openedRewardRooms', 'defeatedBossRooms', 'pendingCoins']
    }
  };
}
