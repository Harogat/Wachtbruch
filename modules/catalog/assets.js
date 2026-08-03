const GROUP_ORDER = Object.freeze([
  'Boden',
  'Architektur',
  'Holz und Lager',
  'Ausstattung',
  'Figuren',
  'Gegner',
  'Systemmarker'
]);

const BASE_ASSETS = Object.freeze([
  { id: 'floor', label: 'Alter Steinboden', group: 'Boden', loadModel: true, walkable: true },
  { id: 'floor-detail', label: 'Verzierter Steinboden', group: 'Boden', loadModel: true, walkable: true },
  { id: 'dirt', label: 'Erdiger Inselgrund', group: 'Boden', loadModel: true },
  { id: 'stones', label: 'Lose Wegsteine', group: 'Boden', loadModel: true },
  { id: 'trap', label: 'Verborgene Bodenfalle', group: 'Boden', loadModel: true },
  { id: 'wall', label: 'Festungsmauer', group: 'Architektur', loadModel: true, solid: true, grapple: true },
  { id: 'wall-half', label: 'Niedrige Br\u00fcstung', group: 'Architektur', loadModel: true, solid: true },
  { id: 'wall-narrow', label: 'Schmaler Mauerrest', group: 'Architektur', loadModel: true, solid: true },
  { id: 'wall-opening', label: 'Durchbrochene Mauer', group: 'Architektur', loadModel: true, solid: true, grapple: true },
  { id: 'gate', label: 'Tor von Ahnhoehe', group: 'Architektur', loadModel: true, solid: true, grapple: true },
  { id: 'column', label: 'S\u00e4ule des Torhofs', group: 'Architektur', loadModel: true, solid: true, grapple: true },
  { id: 'stairs', label: 'Stufen zum Heiligtum', group: 'Architektur', loadModel: true },
  { id: 'wood-structure', label: 'H\u00f6lzerner Steg', group: 'Holz und Lager', loadModel: true, solid: true, walkable: true, grapple: true },
  { id: 'wood-support', label: 'Tragbalken', group: 'Holz und Lager', loadModel: true, solid: true, grapple: true },
  { id: 'barrel', label: 'Vorratsfass', group: 'Holz und Lager', loadModel: true, solid: true },
  { id: 'chest', label: 'Truhe am Quellhof', group: 'Holz und Lager', loadModel: true, solid: true },
  { id: 'banner', label: 'Banner der alten Wacht', group: 'Ausstattung', loadModel: true },
  { id: 'shield-rectangle', label: 'Schild der Turmwache', group: 'Ausstattung', loadModel: true },
  { id: 'shield-round', label: 'Rundschild', group: 'Ausstattung', loadModel: true },
  { id: 'weapon-spear', label: 'Speer der Torwache', group: 'Ausstattung', loadModel: true },
  { id: 'weapon-sword', label: 'Altes Schwert', group: 'Ausstattung', loadModel: true },
  { id: 'coin', label: 'Verlorene M\u00fcnzen', group: 'Ausstattung', loadModel: true },
  { id: 'rocks', label: 'Felsgruppe', group: 'Ausstattung', loadModel: true, solid: true },
  {
    id: 'wachtanker-ahnhoehe',
    label: 'Wachtanker von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Wachtanker_von_Ahnhoehe.glb',
    nativeScale: true,
    grapple: true
  },
  {
    id: 'enterhaken-ahnhoehe',
    label: 'Enterhaken von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Enterhaken_von_Ahnhoehe.glb',
    nativeScale: true
  },
  {
    id: 'wachthelm-ahnhoehe-mani-neufassung',
    label: 'Wachthelm von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Wachthelm_von_Ahnhoehe_Mani_Neufassung.glb',
    nativeScale: true,
    definition: {
      model: 'wachthelm-ahnhoehe-mani-neufassung',
      animations: ['Wachthelm_Rune_Pulse', 'Wachthelm_Rune_Pulse.001'],
      detail: 'Zweiteiliger Wachthelm mit synchron pulsierender Stirnrune'
    }
  },
  {
    id: 'wachtmal-ahnhoehe',
    label: 'Wachtmal von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Wachtmal_von_Ahnhoehe.glb',
    nativeScale: true,
    solid: true
  },
  {
    id: 'wachtfackel-ahnhoehe-gelb',
    label: 'Wachtflamme von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Wachtfackel_von_Ahnhoehe_Gelb.glb',
    nativeScale: true,
    definition: {
      model: 'wachtfackel-ahnhoehe-gelb',
      animation: 'Wachtfackel_Gelb_Loop',
      mountHeight: 0.96,
      detail: 'Warme, animierte Wandfackel der alten Wacht',
      torch: {
        variant: 'warm',
        color: '#ff922e',
        dayIntensity: 2.8,
        nightIntensity: 6.6,
        distanceCells: 2.15,
        flickerSpeed: 8.2,
        flickerAmount: 0.13,
        lightAnchor: 'LightAnchor_Gelb'
      }
    }
  },
  {
    id: 'wachtfackel-ahnhoehe-blau',
    label: 'Runenflamme von Ahnhoehe',
    group: 'Ausstattung',
    loadModel: true,
    source: './assets/wachtbruch/Wachtfackel_von_Ahnhoehe_Blau.glb',
    nativeScale: true,
    definition: {
      model: 'wachtfackel-ahnhoehe-blau',
      animation: 'Wachtfackel_Blau_Loop',
      mountHeight: 0.96,
      detail: 'Kuehle, animierte Runenfackel von Ahnhoehe',
      torch: {
        variant: 'rune',
        color: '#2fbfff',
        dayIntensity: 2.4,
        nightIntensity: 5.8,
        distanceCells: 2,
        flickerSpeed: 7.4,
        flickerAmount: 0.1,
        lightAnchor: 'LightAnchor_Blau'
      }
    }
  },
  { id: 'character-human', label: 'Wache von Ahnhoehe', group: 'Figuren', loadModel: true },
  { id: 'character-orc', label: 'Sp\u00e4her aus den Schattenlanden', group: 'Figuren', loadModel: true }
]);

function freezeDefinition(definition) {
  if (!definition) return null;
  if (definition.marker) {
    return Object.freeze({
      ...definition,
      marker: Object.freeze({
        ...definition.marker,
        settings: Object.freeze({ ...(definition.marker.settings ?? {}) })
      })
    });
  }
  if (definition.enemy) {
    return Object.freeze({ ...definition, enemy: Object.freeze({ ...definition.enemy }) });
  }
  return Object.freeze({
    ...definition,
    ...(Array.isArray(definition.animations)
      ? { animations: Object.freeze([...definition.animations]) }
      : {}),
    ...(definition.torch ? { torch: Object.freeze({ ...definition.torch }) } : {})
  });
}

function freezeEntry(entry) {
  return Object.freeze({
    ...entry,
    model: entry.model ?? entry.id,
    loadModel: Boolean(entry.loadModel),
    definition: freezeDefinition(entry.definition)
  });
}

export function createAssetCatalog({ cellSize, enemyCatalog = {} } = {}) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error('cellSize muss groesser als 0 sein.');

  const virtualAssets = [
    { id: 'fall-zone', label: 'Abgrundfeld', group: 'Boden', model: 'floor', definition: { model: 'floor', fallZone: true } },
    {
      id: 'grapple-anchor',
      label: 'Enterhakenanker',
      group: 'Ausstattung',
      model: 'wachtanker-ahnhoehe',
      definition: { model: 'wachtanker-ahnhoehe', scale: 1.08, grappleAnchor: true }
    },
    { id: 'marker-player-start', label: 'Spielerstart', group: 'Systemmarker', definition: { marker: { type: 'player-start', color: '#ffe36e', unique: true, settings: {} } } },
    { id: 'marker-combat-trigger', label: 'Kampftrigger', group: 'Systemmarker', definition: { marker: { type: 'combat-trigger', color: '#ff657a', unique: true, settings: { radius: cellSize * 0.95 } } } },
    { id: 'marker-exit', label: 'Raumausgang', group: 'Systemmarker', definition: { marker: { type: 'exit', color: '#54d8ff', unique: false, settings: { targetRoomId: '', condition: 'clear', radius: cellSize * 0.7 } } } },
    { id: 'marker-arrival', label: 'Ankunftspunkt', group: 'Systemmarker', definition: { marker: { type: 'arrival', color: '#6dff8c', unique: true, settings: {} } } }
  ];

  const enemyAssets = Object.values(enemyCatalog).map((enemy) => ({
    id: enemy.editorAssetId,
    label: enemy.editorLabel,
    group: 'Gegner',
    model: enemy.model,
    definition: {
      model: enemy.model,
      animation: enemy.animation,
      scale: enemy.scale,
      enemy: { catalogId: enemy.id, ...enemy.combat }
    }
  }));

  const entries = [...BASE_ASSETS, ...virtualAssets, ...enemyAssets].map(freezeEntry);
  const ids = new Set();
  entries.forEach((entry) => {
    if (!entry.id || ids.has(entry.id)) throw new Error(`Doppelte oder leere Asset-ID: ${entry.id}`);
    if (!GROUP_ORDER.includes(entry.group)) throw new Error(`Unbekannte Asset-Gruppe: ${entry.group}`);
    ids.add(entry.id);
  });
  return Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
}

export function createAssetViews(catalog) {
  const entries = Object.values(catalog);
  const modelNames = Object.freeze([...new Set(entries
    .filter((entry) => entry.loadModel)
    .map((entry) => entry.model))]);
  const modelSources = Object.freeze(Object.fromEntries(entries
    .filter((entry) => entry.loadModel && entry.source)
    .map((entry) => [entry.model, entry.source])));
  const nativeScaleModelIds = Object.freeze([...new Set(entries
    .filter((entry) => entry.loadModel && entry.nativeScale)
    .map((entry) => entry.model))]);
  const labels = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry.label])));
  const groups = Object.freeze(GROUP_ORDER.map((group) => Object.freeze([
    group,
    Object.freeze(entries.filter((entry) => entry.group === group).map((entry) => entry.id))
  ])).filter(([, ids]) => ids.length));
  const buildDefinitions = Object.freeze(Object.fromEntries(entries
    .filter((entry) => entry.definition)
    .map((entry) => [entry.id, entry.definition])));
  const solidAssetIds = Object.freeze(entries.filter((entry) => entry.solid).map((entry) => entry.id));
  const walkableAssetIds = Object.freeze(entries.filter((entry) => entry.walkable).map((entry) => entry.id));
  const grappleAssetIds = Object.freeze(entries.filter((entry) => entry.grapple).map((entry) => entry.id));

  return Object.freeze({
    modelNames,
    modelSources,
    nativeScaleModelIds,
    labels,
    groups,
    buildDefinitions,
    solidAssetIds,
    walkableAssetIds,
    grappleAssetIds
  });
}
