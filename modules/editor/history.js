export const EDITOR_HISTORY_SCHEMA = 'wachtbruch-editor-history';
export const EDITOR_HISTORY_VERSION = 1;

function clampIndex(index, snapshotCount) {
  if (snapshotCount <= 0) return -1;
  const numeric = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : snapshotCount - 1;
  return Math.min(snapshotCount - 1, Math.max(0, numeric));
}

export function serializeEditorSnapshot(snapshot) {
  if (typeof snapshot === 'string') {
    return JSON.stringify(JSON.parse(snapshot));
  }
  if (snapshot === undefined) throw new TypeError('Editor-Snapshot darf nicht undefined sein.');
  return JSON.stringify(snapshot);
}

export function parseEditorSnapshot(snapshot) {
  return JSON.parse(serializeEditorSnapshot(snapshot));
}

export function createEditorHistoryState(initialSnapshot = null) {
  if (initialSnapshot === null) return { snapshots: [], index: -1 };
  return {
    snapshots: [serializeEditorSnapshot(initialSnapshot)],
    index: 0
  };
}

export function cloneEditorHistoryState(state) {
  const candidates = Array.isArray(state?.snapshots)
    ? state.snapshots
    : Array.isArray(state?.history)
      ? state.history
      : [];
  const snapshots = candidates.map(serializeEditorSnapshot);
  return {
    snapshots,
    index: clampIndex(state?.index, snapshots.length)
  };
}

export function currentEditorSnapshot(state) {
  const normalized = cloneEditorHistoryState(state);
  if (normalized.index < 0) return null;
  return parseEditorSnapshot(normalized.snapshots[normalized.index]);
}

export function canUndoEditorHistory(state) {
  return cloneEditorHistoryState(state).index > 0;
}

export function canRedoEditorHistory(state) {
  const normalized = cloneEditorHistoryState(state);
  return normalized.index >= 0 && normalized.index < normalized.snapshots.length - 1;
}

export function pushEditorSnapshot(state, snapshot) {
  const normalized = cloneEditorHistoryState(state);
  const serialized = serializeEditorSnapshot(snapshot);
  if (normalized.snapshots[normalized.index] === serialized) {
    return {
      state: normalized,
      snapshot: parseEditorSnapshot(serialized),
      changed: false
    };
  }

  const snapshots = normalized.snapshots.slice(0, normalized.index + 1);
  snapshots.push(serialized);
  return {
    state: {
      snapshots,
      index: snapshots.length - 1
    },
    snapshot: parseEditorSnapshot(serialized),
    changed: true
  };
}

export function moveEditorHistory(state, nextIndex) {
  const normalized = cloneEditorHistoryState(state);
  const targetIndex = Math.trunc(Number(nextIndex));
  if (!Number.isFinite(targetIndex)
    || targetIndex < 0
    || targetIndex >= normalized.snapshots.length
    || targetIndex === normalized.index) {
    return {
      state: normalized,
      snapshot: currentEditorSnapshot(normalized),
      direction: null,
      changed: false
    };
  }

  const direction = targetIndex > normalized.index ? 'redo' : 'undo';
  const nextState = {
    snapshots: normalized.snapshots,
    index: targetIndex
  };
  return {
    state: nextState,
    snapshot: parseEditorSnapshot(nextState.snapshots[targetIndex]),
    direction,
    changed: true
  };
}

export function createRoomHistoryStore() {
  return new Map();
}

export function storeRoomHistoryState(store, roomId, state) {
  if (!(store instanceof Map)) throw new TypeError('Raumverlauf benoetigt eine Map.');
  const key = String(roomId ?? '');
  if (!key) throw new TypeError('Raumverlauf benoetigt eine Raum-ID.');
  const normalized = cloneEditorHistoryState(state);
  store.set(key, normalized);
  return cloneEditorHistoryState(normalized);
}

export function restoreRoomHistoryState(store, roomId, fallbackSnapshot) {
  if (!(store instanceof Map)) throw new TypeError('Raumverlauf benoetigt eine Map.');
  const key = String(roomId ?? '');
  const stored = store.get(key);
  return stored
    ? cloneEditorHistoryState(stored)
    : createEditorHistoryState(fallbackSnapshot);
}

export function deleteRoomHistoryState(store, roomId) {
  return store instanceof Map && store.delete(String(roomId ?? ''));
}

export function clearRoomHistoryStore(store) {
  if (!(store instanceof Map)) throw new TypeError('Raumverlauf benoetigt eine Map.');
  store.clear();
}

export function createEditorHistoryBundle(store, activeRoomId = '') {
  if (!(store instanceof Map)) throw new TypeError('Raumverlauf benoetigt eine Map.');
  return {
    schema: EDITOR_HISTORY_SCHEMA,
    version: EDITOR_HISTORY_VERSION,
    activeRoomId: String(activeRoomId ?? ''),
    rooms: [...store.entries()].map(([roomId, state]) => {
      const normalized = cloneEditorHistoryState(state);
      return {
        roomId,
        index: normalized.index,
        snapshots: normalized.snapshots.map(parseEditorSnapshot)
      };
    })
  };
}

export function validateEditorHistoryBundle(bundle) {
  const failures = [];
  if (bundle?.schema !== EDITOR_HISTORY_SCHEMA) failures.push('Unbekanntes Editor-History-Schema.');
  if (bundle?.version !== EDITOR_HISTORY_VERSION) failures.push('Unbekannte Editor-History-Version.');
  if (!Array.isArray(bundle?.rooms)) {
    failures.push('Editor-History besitzt keine Raumliste.');
    return failures;
  }

  const ids = new Set();
  bundle.rooms.forEach((room, index) => {
    const roomId = String(room?.roomId ?? '');
    if (!roomId || ids.has(roomId)) failures.push(`Doppelte oder leere History-Raum-ID bei Index ${index}.`);
    ids.add(roomId);
    if (!Array.isArray(room?.snapshots) || room.snapshots.length === 0) {
      failures.push(`${roomId || index} besitzt keine History-Snapshots.`);
      return;
    }
    if (!Number.isInteger(room?.index) || room.index < 0 || room.index >= room.snapshots.length) {
      failures.push(`${roomId || index} besitzt einen ungueltigen History-Index.`);
    }
  });
  return failures;
}
