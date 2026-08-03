import {
  createGameSave,
  createGameSaveMeta,
  GAME_SAVE_SLOT_COUNT,
  normalizeGameSaveSlot,
  validateGameSave,
  validateGameSaveMeta
} from './save-slots.js';

export const PERSISTENCE_KEYS = Object.freeze({
  legacyLayout: 'aethoria-setzsystem-v1',
  roomLibrary: 'wachtbruch-room-library-v1',
  roomLibraryBackup: 'wachtbruch-room-library-backup-v1',
  settings: 'wachtbruch-settings-v1',
  settingsBackup: 'wachtbruch-settings-backup-v1',
  equipment: 'wachtbruch-equipment-sockets-v4',
  equipmentLegacy: 'wachtbruch-equipment-sockets-v3',
  attackFx: 'wachtbruch-attack-fx-v2',
  attackSequence: 'wachtbruch-attack-sequence-v1',
  comboFlow: 'wachtbruch-combo-flow-v1',
  chargedAttack: 'wachtbruch-charged-attack-v1',
  weaponGlow: 'wachtbruch-weapon-charge-glow-v1',
  horizontalSweep: 'wachtbruch-horizontal-sweep-v1',
  attackSpeed: 'wachtbruch-attack-speed-v1',
  attackFeel: 'wachtbruch-attack-feel-v1',
  combatTuning: 'wachtbruch-combat-tuning-v1',
  gameSaveMeta: 'wachtbruch-game-save-meta-v1',
  gameSaveMetaBackup: 'wachtbruch-game-save-meta-backup-v1',
  gameSaveSlotPrefix: 'wachtbruch-game-save-slot-',
  gameSaveSlotBackupPrefix: 'wachtbruch-game-save-slot-backup-'
});

export const SETTINGS_FORMAT_VERSION = 1;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function settingsBundle(data) {
  return {
    version: SETTINGS_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    data: {
      equipment: data.equipment ?? null,
      attackFx: data.attackFx ?? null,
      attackSequence: data.attackSequence ?? null,
      comboFlow: data.comboFlow ?? null,
      chargedAttack: data.chargedAttack ?? null,
      weaponGlow: data.weaponGlow ?? null,
      horizontalSweep: data.horizontalSweep ?? null,
      attackSpeed: data.attackSpeed ?? null,
      attackFeel: data.attackFeel ?? null,
      combatTuning: data.combatTuning ?? null
    }
  };
}

export function createWachtbruchPersistence({
  storage = globalThis.localStorage,
  logger = globalThis.console
} = {}) {
  if (!storage?.getItem || !storage?.setItem) {
    throw new Error('Kein kompatibler Speicher verfuegbar.');
  }

  function readJson(key) {
    const raw = storage.getItem(key);
    if (raw === null) return { found: false, value: null, error: null };
    try {
      return { found: true, value: JSON.parse(raw), error: null };
    } catch (error) {
      return { found: true, value: null, error };
    }
  }

  function writeJson(key, value, backupKey = null, backupValidator = null) {
    const serialized = JSON.stringify(value);
    const previous = storage.getItem(key);
    if (backupKey && previous && previous !== serialized) {
      try {
        const parsedPrevious = JSON.parse(previous);
        if (!backupValidator || backupValidator(parsedPrevious)) storage.setItem(backupKey, previous);
      } catch {
        logger?.warn?.(`${key} war beschaedigt und wurde nicht als Sicherung uebernommen.`);
      }
    }
    storage.setItem(key, serialized);
    return serialized;
  }

  function validSettingsBundle(value) {
    return isObject(value)
      && value.version === SETTINGS_FORMAT_VERSION
      && isObject(value.data);
  }

  function validRoomBundle(value) {
    return isObject(value)
      && (value.version === 1
        || (Number.isInteger(value.version) && Array.isArray(value.rooms) && value.rooms.length > 0));
  }

  function gameSaveSlotKey(slot, backup = false) {
    const normalizedSlot = normalizeGameSaveSlot(slot);
    const prefix = backup
      ? PERSISTENCE_KEYS.gameSaveSlotBackupPrefix
      : PERSISTENCE_KEYS.gameSaveSlotPrefix;
    return `${prefix}${normalizedSlot}-v1`;
  }

  function validGameSaveBundle(value, slot) {
    return validateGameSave(value, slot).length === 0;
  }

  function validGameSaveMetaBundle(value) {
    return validateGameSaveMeta(value).length === 0;
  }

  function loadSettings() {
    const bundleCandidates = [
      { key: PERSISTENCE_KEYS.settings, label: 'Einstellungsstand' },
      { key: PERSISTENCE_KEYS.settingsBackup, label: 'Einstellungssicherung' }
    ];
    for (const candidate of bundleCandidates) {
      const result = readJson(candidate.key);
      if (!result.found) continue;
      if (result.error) {
        logger?.warn?.(`${candidate.label} ist kein gueltiges JSON.`, result.error);
        continue;
      }
      if (validSettingsBundle(result.value)) {
        return { ...result.value, source: candidate.label, migrated: false };
      }
      logger?.warn?.(`${candidate.label} besitzt eine unbekannte Version.`);
    }

    const readLegacy = (...keys) => {
      for (const key of keys) {
        const result = readJson(key);
        if (!result.found) continue;
        if (result.error) {
          logger?.warn?.(`Legacy-Einstellung ${key} ist kein gueltiges JSON.`, result.error);
          continue;
        }
        return result.value;
      }
      return null;
    };
    const legacyData = {
      equipment: readLegacy(PERSISTENCE_KEYS.equipment, PERSISTENCE_KEYS.equipmentLegacy),
      attackFx: readLegacy(PERSISTENCE_KEYS.attackFx),
      attackSequence: readLegacy(PERSISTENCE_KEYS.attackSequence),
      comboFlow: readLegacy(PERSISTENCE_KEYS.comboFlow),
      chargedAttack: readLegacy(PERSISTENCE_KEYS.chargedAttack),
      weaponGlow: readLegacy(PERSISTENCE_KEYS.weaponGlow),
      horizontalSweep: readLegacy(PERSISTENCE_KEYS.horizontalSweep),
      attackSpeed: readLegacy(PERSISTENCE_KEYS.attackSpeed),
      attackFeel: readLegacy(PERSISTENCE_KEYS.attackFeel),
      combatTuning: readLegacy(PERSISTENCE_KEYS.combatTuning)
    };
    const hasLegacyData = Object.values(legacyData).some((value) => value !== null);
    const bundle = settingsBundle(legacyData);
    if (hasLegacyData) writeJson(PERSISTENCE_KEYS.settings, bundle, PERSISTENCE_KEYS.settingsBackup);
    return {
      ...bundle,
      source: hasLegacyData ? 'Legacy-Einstellungen' : 'Standardwerte',
      migrated: hasLegacyData
    };
  }

  function saveSettings(data) {
    const bundle = settingsBundle(data);
    writeJson(
      PERSISTENCE_KEYS.settings,
      bundle,
      PERSISTENCE_KEYS.settingsBackup,
      validSettingsBundle
    );

    // Die Spiegelung haelt den letzten nicht modularisierten Projektstand lesbar.
    writeJson(PERSISTENCE_KEYS.equipment, bundle.data.equipment ?? {});
    writeJson(PERSISTENCE_KEYS.attackFx, bundle.data.attackFx ?? {});
    writeJson(PERSISTENCE_KEYS.attackSequence, bundle.data.attackSequence ?? {});
    writeJson(PERSISTENCE_KEYS.comboFlow, bundle.data.comboFlow ?? {});
    writeJson(PERSISTENCE_KEYS.chargedAttack, bundle.data.chargedAttack ?? {});
    writeJson(PERSISTENCE_KEYS.weaponGlow, bundle.data.weaponGlow ?? {});
    writeJson(PERSISTENCE_KEYS.horizontalSweep, bundle.data.horizontalSweep ?? {});
    writeJson(PERSISTENCE_KEYS.attackSpeed, bundle.data.attackSpeed ?? {});
    writeJson(PERSISTENCE_KEYS.attackFeel, bundle.data.attackFeel ?? {});
    writeJson(PERSISTENCE_KEYS.combatTuning, bundle.data.combatTuning ?? {});
    return bundle;
  }

  function saveRoomLibrary(payload) {
    return writeJson(
      PERSISTENCE_KEYS.roomLibrary,
      payload,
      PERSISTENCE_KEYS.roomLibraryBackup,
      validRoomBundle
    );
  }

  function loadRoomLibrary(applyPayload) {
    if (typeof applyPayload !== 'function') throw new Error('Raumpruefung fehlt.');
    const currentRoom = readJson(PERSISTENCE_KEYS.roomLibrary);
    const legacyRoom = currentRoom.found ? null : readJson(PERSISTENCE_KEYS.legacyLayout);
    const candidates = [
      { label: 'Lokalen Stand', result: currentRoom.found ? currentRoom : legacyRoom },
      { label: 'Sicherungsstand', result: readJson(PERSISTENCE_KEYS.roomLibraryBackup) }
    ].filter((candidate) => candidate.result?.found);

    if (!candidates.length) throw new Error('Noch kein lokaler Stand vorhanden');
    let lastError = null;
    for (const candidate of candidates) {
      try {
        if (candidate.result.error) throw candidate.result.error;
        applyPayload(candidate.result.value);
        return candidate.label;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error('Lokaler Stand konnte nicht geladen werden');
  }

  function loadGameSaveMeta() {
    const candidates = [
      { label: 'Spielstand-Auswahl', result: readJson(PERSISTENCE_KEYS.gameSaveMeta) },
      { label: 'Spielstand-Auswahlsicherung', result: readJson(PERSISTENCE_KEYS.gameSaveMetaBackup) }
    ].filter((candidate) => candidate.result.found);
    for (const candidate of candidates) {
      if (candidate.result.error) {
        logger?.warn?.(`${candidate.label} ist kein gueltiges JSON.`, candidate.result.error);
        continue;
      }
      if (validGameSaveMetaBundle(candidate.result.value)) return candidate.result.value;
      logger?.warn?.(`${candidate.label} besitzt eine unbekannte Version.`);
    }
    return createGameSaveMeta();
  }

  function saveGameSaveMeta(activeSlot = null) {
    const meta = createGameSaveMeta({ activeSlot });
    writeJson(
      PERSISTENCE_KEYS.gameSaveMeta,
      meta,
      PERSISTENCE_KEYS.gameSaveMetaBackup,
      validGameSaveMetaBundle
    );
    return meta;
  }

  function readGameSaveSlot(slot) {
    const normalizedSlot = normalizeGameSaveSlot(slot);
    const candidates = [
      {
        label: `Slot ${normalizedSlot}`,
        result: readJson(gameSaveSlotKey(normalizedSlot))
      },
      {
        label: `Sicherung Slot ${normalizedSlot}`,
        result: readJson(gameSaveSlotKey(normalizedSlot, true))
      }
    ].filter((candidate) => candidate.result.found);
    let lastError = null;
    for (const candidate of candidates) {
      if (candidate.result.error) {
        lastError = candidate.result.error;
        logger?.warn?.(`${candidate.label} ist kein gueltiges JSON.`, candidate.result.error);
        continue;
      }
      const failures = validateGameSave(candidate.result.value, normalizedSlot);
      if (!failures.length) {
        return {
          slot: normalizedSlot,
          found: true,
          save: candidate.result.value,
          source: candidate.label,
          recovered: candidate.label.startsWith('Sicherung')
        };
      }
      lastError = new Error(failures.join(' '));
      logger?.warn?.(`${candidate.label} ist ungueltig: ${failures.join(' ')}`);
    }
    return {
      slot: normalizedSlot,
      found: candidates.length > 0,
      save: null,
      source: null,
      recovered: false,
      error: lastError
    };
  }

  function listGameSaveSlots() {
    return Array.from({ length: GAME_SAVE_SLOT_COUNT }, (_, index) => readGameSaveSlot(index + 1));
  }

  function loadGameSaveSlot(slot) {
    const record = readGameSaveSlot(slot);
    if (record.save) return record;
    if (record.found) throw record.error ?? new Error(`Slot ${record.slot} ist beschaedigt.`);
    return null;
  }

  function saveGameSaveSlot(slot, payload) {
    const normalizedSlot = normalizeGameSaveSlot(slot);
    const save = createGameSave({ ...payload, slot: normalizedSlot });
    const failures = validateGameSave(save, normalizedSlot);
    if (failures.length) throw new Error(failures.join(' '));
    writeJson(
      gameSaveSlotKey(normalizedSlot),
      save,
      gameSaveSlotKey(normalizedSlot, true),
      (candidate) => validGameSaveBundle(candidate, normalizedSlot)
    );
    saveGameSaveMeta(normalizedSlot);
    return save;
  }

  function deleteGameSaveSlot(slot) {
    const normalizedSlot = normalizeGameSaveSlot(slot);
    storage.removeItem?.(gameSaveSlotKey(normalizedSlot));
    storage.removeItem?.(gameSaveSlotKey(normalizedSlot, true));
    const currentMeta = loadGameSaveMeta();
    if (currentMeta.activeSlot === normalizedSlot) saveGameSaveMeta(null);
    return normalizedSlot;
  }

  return Object.freeze({
    loadSettings,
    saveSettings,
    loadRoomLibrary,
    saveRoomLibrary,
    loadGameSaveMeta,
    saveGameSaveMeta,
    listGameSaveSlots,
    loadGameSaveSlot,
    saveGameSaveSlot,
    deleteGameSaveSlot
  });
}
