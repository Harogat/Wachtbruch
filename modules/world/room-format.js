export const ROOM_LAYOUT_SCHEMA = 'wachtbruch-room-layout';
export const ROOM_LAYOUT_VERSION = 2;
export const ROOM_LIBRARY_SCHEMA = 'wachtbruch-room-library';
export const ROOM_LIBRARY_VERSION = 3;
export const ROOM_GRID_SIZE = 16;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

export function clonePlacements(placements) {
  return cloneJson(Array.isArray(placements) ? placements : [], []);
}

export function cloneRoomWaves(waves) {
  return cloneJson(Array.isArray(waves) ? waves : [], []);
}

export function normalizeStableId(value, fallback) {
  const sanitized = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, '-');
  return sanitized || fallback;
}

export function normalizeRoomWaves(
  roomId,
  candidates,
  placements = [],
  { isBossPlacement = (placement) => placement?.name === 'enemy-boss' } = {}
) {
  const source = Array.isArray(candidates) ? candidates : [];
  const usedIds = new Set();
  const waves = source.map((candidate, index) => {
    const fallback = `${roomId}-welle-${index + 1}`;
    const baseId = normalizeStableId(candidate?.id, fallback);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${fallback}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return {
      id,
      name: String(candidate?.name || `Welle ${index + 1}`).trim() || `Welle ${index + 1}`,
      intermission: clamp(Number(candidate?.intermission) || 1.5, 0.4, 12),
      rewardCoins: clamp(Math.round(Number(candidate?.rewardCoins) || 0), 0, 25),
      boss: Boolean(candidate?.boss)
    };
  });
  if (!waves.length) {
    const hasBoss = placements.some(isBossPlacement);
    waves.push({
      id: `${roomId}-welle-1`,
      name: hasBoss ? 'Bosswelle' : 'Welle 1',
      intermission: 1.5,
      rewardCoins: 0,
      boss: hasBoss
    });
  }
  return waves;
}

export function normalizePlacementWaveAssignments(
  placements,
  waves,
  {
    isEnemyPlacement = () => false,
    isBossPlacement = (placement) => placement?.name === 'enemy-boss'
  } = {}
) {
  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeWaves = Array.isArray(waves) ? waves : [];
  const waveIds = new Set(safeWaves.map((wave) => wave.id));
  const fallbackWave = safeWaves[0];
  const bossWave = safeWaves.find((wave) => wave.boss) ?? fallbackWave;
  safePlacements.forEach((placement) => {
    if (!isEnemyPlacement(placement)) return;
    placement.settings = { ...(placement.settings ?? {}) };
    if (!waveIds.has(placement.settings.waveId)) {
      placement.settings.waveId = isBossPlacement(placement)
        ? bossWave?.id ?? ''
        : fallbackWave?.id ?? '';
    }
    placement.settings.spawnDelay = clamp(Number(placement.settings.spawnDelay) || 0, 0, 20);
  });
  return safePlacements;
}

export function createRoomLayoutPayload({
  placements = [],
  waves = [],
  grid = ROOM_GRID_SIZE
} = {}) {
  return {
    version: ROOM_LAYOUT_VERSION,
    grid,
    placements: clonePlacements(placements),
    waves: cloneRoomWaves(waves)
  };
}

export function createRoomLibraryPayload({
  activeRoomId = '',
  rooms = [],
  grid = ROOM_GRID_SIZE
} = {}) {
  return {
    version: ROOM_LIBRARY_VERSION,
    grid,
    activeRoomId,
    rooms: rooms.map((room) => ({
      id: String(room?.id ?? ''),
      name: String(room?.name ?? ''),
      waves: cloneRoomWaves(room?.waves),
      placements: clonePlacements(room?.placements)
    }))
  };
}

export function validateRoomLayoutPayload(payload) {
  const failures = [];
  if (!payload || ![1, ROOM_LAYOUT_VERSION].includes(payload.version)) {
    failures.push('Unbekannte Layout-Version.');
  }
  if (!Array.isArray(payload?.placements)) failures.push('Layout besitzt keine Placement-Liste.');
  if (payload?.version >= 2 && !Array.isArray(payload?.waves)) failures.push('Layout besitzt keine Wellenliste.');
  return failures;
}

export function validateRoomLibraryPayload(payload) {
  const failures = [];
  if (!payload || ![2, ROOM_LIBRARY_VERSION].includes(payload.version)) {
    failures.push('Unbekannte Raumsammlungs-Version.');
  }
  if (!Array.isArray(payload?.rooms) || !payload.rooms.length) {
    failures.push('Raumsammlung besitzt keine Raeume.');
    return failures;
  }
  const ids = new Set();
  payload.rooms.forEach((room, index) => {
    const label = room?.id || `Index ${index}`;
    if (!room?.id || ids.has(room.id)) failures.push(`Doppelte oder leere Raum-ID: ${label}.`);
    ids.add(room?.id);
    if (!room?.name) failures.push(`${label} besitzt keinen Namen.`);
    if (!Array.isArray(room?.placements)) failures.push(`${label} besitzt keine Placements.`);
    if (!Array.isArray(room?.waves)) failures.push(`${label} besitzt keine Wellen.`);
  });
  return failures;
}

export function createGodotRoomBundle(rooms = []) {
  return {
    schema: ROOM_LIBRARY_SCHEMA,
    version: ROOM_LIBRARY_VERSION,
    grid: ROOM_GRID_SIZE,
    rooms: createRoomLibraryPayload({ rooms }).rooms
  };
}
