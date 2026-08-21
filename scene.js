import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRoomMusicController } from './modules/audio/music-manager.js?v=music-states-3';
import { createAssetCatalog, createAssetViews } from './modules/catalog/assets.js?v=wacht-assets-10';
import { createAttackSets } from './modules/catalog/attacks.js';
import { createEnemyCatalog } from './modules/catalog/enemies.js';
import {
  COMBAT_TUNING_DEFAULTS,
  createCombatTuning,
  createGodotCombatProfile,
  serializeCombatTuning
} from './modules/combat/tuning.js';
import { resolvePlayerHitReaction } from './modules/combat/hit-reactions.js?v=1';
import {
  createWeaponProbeAngles,
  createWeaponProbeDistances,
  createWeaponReboundProfile
} from './modules/combat/weapon-rebound.js?v=weapon-rebound-1';
import { createDefaultRoomDefinitions } from './modules/catalog/rooms.js';
import { createDeveloperModeController } from './modules/editor/developer-mode.js';
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  clearRoomHistoryStore,
  createEditorHistoryState,
  createRoomHistoryStore,
  deleteRoomHistoryState,
  moveEditorHistory,
  pushEditorSnapshot,
  restoreRoomHistoryState,
  storeRoomHistoryState
} from './modules/editor/history.js';
import {
  applyNormalizedChestDrop,
  CHEST_DROP_TYPES as CHEST_DROP_TYPE_IDS
} from './modules/loot/chest-drops.js';
import {
  createGameSave,
  formatGameSaveDuration,
  normalizeGameSaveSlot
} from './modules/persistence/save-slots.js?v=save-slots-1';
import { createWachtbruchPersistence } from './modules/persistence/storage.js?v=save-slots-1';
import {
  createEquipmentProgress,
  hydrateEquipmentProgress,
  isEquipmentEquipped,
  isEquipmentUnlocked,
  resetEquipmentProgress,
  serializeEquipmentProgress,
  setEquipmentEquipped,
  unlockEquipment
} from './modules/progression/equipment-unlocks.js?v=equipment-chest-2';
import {
  applyRunUpgrade as applyRunUpgradeToProgress,
  availableRunUpgrades as availableRunUpgradeDefinitions,
  createRunProgress,
  hydrateRunProgress,
  resetRunProgress,
  rollRunUpgradeOffers,
  RUN_UPGRADES,
  runUpgradeStackCount,
  serializeRunProgress,
  SUPPLY_REROLL_COST
} from './modules/progression/run-upgrades.js';
import {
  cloneRoomWaves,
  createRoomLayoutPayload,
  createRoomLibraryPayload,
  normalizePlacementWaveAssignments as normalizeRoomPlacementWaveAssignments,
  normalizeRoomWaves,
  ROOM_GRID_SIZE,
  ROOM_LIBRARY_VERSION
} from './modules/world/room-format.js';
import {
  createStairCollisionDimensions,
  stairFlankMoveBlocked,
  stairFlankOverlapDepthLocal
} from './modules/world/stair-collision.js';

const MODEL_ROOT = './vendor/kenney-mini-dungeon/Models/GLB%20format/';
const CELL = 2.35;
const LEVEL_HEIGHT = CELL * 0.9;
const persistence = createWachtbruchPersistence();
const persistedSettings = persistence.loadSettings();
const combatTuningSettings = createCombatTuning(persistedSettings.data.combatTuning);

const canvas = document.getElementById('scene-canvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const startScreen = document.getElementById('start-screen');
const startGameButton = document.getElementById('start-game');
const startNewGameButton = document.getElementById('start-new-game');
const startDeleteSlotButton = document.getElementById('start-delete-slot');
const startSaveStatus = document.getElementById('start-save-status');
const saveSlotButtons = [...document.querySelectorAll('[data-save-slot]')];
const startWorkshopButton = document.getElementById('start-workshop');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverContinueButton = document.getElementById('game-over-continue');
const gameOverTitleButton = document.getElementById('game-over-title-button');
const selectedName = document.getElementById('selected-name');
const selectedDetail = document.getElementById('selected-detail');
const buildPanel = document.getElementById('build-panel');
const buildToggle = document.getElementById('build-toggle');
const buildStatus = document.getElementById('build-status');
const assetSelect = document.getElementById('asset-select');
const roomSelect = document.getElementById('room-select');
const roomCount = document.getElementById('room-count');
const objectTransform = document.getElementById('object-transform');
const transformObjectName = document.getElementById('transform-object-name');
const transformOffsetX = document.getElementById('transform-offset-x');
const transformOffsetZ = document.getElementById('transform-offset-z');
const transformRotation = document.getElementById('transform-rotation');
const transformScale = document.getElementById('transform-scale');
const transformInputs = [transformOffsetX, transformOffsetZ, transformRotation, transformScale];
const entranceLandscapeToggle = document.getElementById('entrance-landscape-toggle');
const diagnosticsToggle = document.getElementById('diagnostics-toggle');
const diagnosticsLegend = document.getElementById('diagnostics-legend');
const markerProperties = document.getElementById('marker-properties');
const markerKind = document.getElementById('marker-kind');
const markerTargetField = document.getElementById('marker-target-field');
const markerTargetRoom = document.getElementById('marker-target-room');
const markerConditionField = document.getElementById('marker-condition-field');
const markerCondition = document.getElementById('marker-condition');
const markerSignalField = document.getElementById('marker-signal-field');
const markerSignal = document.getElementById('marker-signal');
const markerModusField = document.getElementById('marker-modus-field');
const markerModus = document.getElementById('marker-modus');
const markerGewichtField = document.getElementById('marker-gewicht-field');
const markerGewicht = document.getElementById('marker-gewicht');
const markerWirkungField = document.getElementById('marker-wirkung-field');
const markerWirkung = document.getElementById('marker-wirkung');
const markerRadiusField = document.getElementById('marker-radius-field');
const markerRadius = document.getElementById('marker-radius');
const rewardChestField = document.getElementById('reward-chest-field');
const rewardChestToggle = document.getElementById('reward-chest-toggle');
const chestDropSettings = document.getElementById('chest-drop-settings');
const chestDropType = document.getElementById('chest-drop-type');
const chestDropAmountField = document.getElementById('chest-drop-amount-field');
const chestDropAmount = document.getElementById('chest-drop-amount');
const trapSettingsField = document.getElementById('trap-settings');
const trapDamageInput = document.getElementById('trap-damage');
const trapTargetsInput = document.getElementById('trap-targets');
const trapRadiusInput = document.getElementById('trap-radius');
const trapWarningInput = document.getElementById('trap-warning');
const trapCooldownInput = document.getElementById('trap-cooldown');
const buildEditorView = document.getElementById('build-editor-view');
const waveEditorView = document.getElementById('wave-editor-view');
const waveList = document.getElementById('wave-list');
const waveEditorSummary = document.getElementById('wave-editor-summary');
const waveNameInput = document.getElementById('wave-name');
const waveIntermissionInput = document.getElementById('wave-intermission');
const waveRewardCoinsInput = document.getElementById('wave-reward-coins');
const waveBossInput = document.getElementById('wave-boss');
const enemyWaveSettings = document.getElementById('enemy-wave-settings');
const enemyWaveSelect = document.getElementById('enemy-wave-select');
const enemySpawnDelayInput = document.getElementById('enemy-spawn-delay');
const layerOutput = document.getElementById('layer-output');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');
const playToggle = document.getElementById('play-toggle');
const gameMenuToggle = document.getElementById('game-menu-toggle');
const gameMenu = document.getElementById('game-menu');
const gameMenuClose = document.getElementById('game-menu-close');
const gameMenuMusicStatus = document.getElementById('game-menu-music-status');
const gameMenuFullscreenStatus = document.getElementById('game-menu-fullscreen-status');
const gameMenuSaveButton = document.getElementById('game-menu-save');
const gameMenuSaveStatus = document.getElementById('game-menu-save-status');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const combatHud = document.getElementById('combat-hud');
const enemyHud = document.getElementById('enemy-hud');
const combatActions = document.getElementById('combat-actions');
const combatMessage = document.getElementById('combat-message');
const levelTransitionOverlay = document.getElementById('level-transition');
const waveLabel = document.getElementById('wave-label');
const waveCount = document.getElementById('wave-count');
const playerHealthFill = document.getElementById('player-health-fill');
const playerHealthText = document.getElementById('player-health-text');
const playerStaminaFill = document.getElementById('player-stamina-fill');
const enemyHealthFill = document.getElementById('enemy-health-fill');
const enemyHealthText = document.getElementById('enemy-health-text');
const enemyName = document.getElementById('enemy-name');
const combatStick = document.getElementById('combat-stick');
const combatStickKnob = document.getElementById('combat-stick-knob');
const inventoryToggle = document.getElementById('inventory-toggle');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryClose = document.getElementById('inventory-close');
const inventoryItemName = document.getElementById('inventory-item-name');
const inventoryItemDetail = document.getElementById('inventory-item-detail');
const potionSlot = document.getElementById('potion-slot');
const potionCount = document.getElementById('potion-count');
const coinCount = document.getElementById('coin-count');
const coinReadout = document.getElementById('coin-readout');
const inventoryCoinCount = document.getElementById('inventory-coin-count');
const swordInventorySlot = document.getElementById('sword-inventory-slot');
const spearInventorySlot = document.getElementById('spear-inventory-slot');
const swordSlotState = document.getElementById('sword-slot-state');
const swordSlotName = document.getElementById('sword-slot-name');
const hookInventorySlot = document.getElementById('hook-inventory-slot');
const hookSlotState = document.getElementById('hook-slot-state');
const helmetInventorySlot = document.getElementById('helmet-inventory-slot');
const helmetSlotState = document.getElementById('helmet-slot-state');
const equipmentOpenButton = document.getElementById('equipment-open');
const equipmentPanel = document.getElementById('equipment-panel');
const equipmentCloseButton = document.getElementById('equipment-close');
const equipmentStatus = document.getElementById('equipment-status');
const equipmentAnimationSelect = document.getElementById('equipment-animation');
const equipmentPreviewToggle = document.getElementById('equipment-preview-toggle');
const equipmentFrameSlider = document.getElementById('equipment-frame');
const equipmentFrameOutput = document.getElementById('equipment-frame-output');
const equipmentAttackState = document.getElementById('equipment-attack-state');
const equipmentAttackStateLabel = document.getElementById('equipment-attack-state-label');
const equipmentAttackEnabledInput = document.getElementById('equipment-attack-enabled');
const comboFlowSection = document.getElementById('combo-flow-section');
const comboModeSelect = document.getElementById('combo-mode');
const comboPauseInput = document.getElementById('combo-pause');
const comboPauseOutput = document.getElementById('combo-pause-output');
const comboOrderOutput = document.getElementById('combo-order-output');
const comboMoveEarlierButton = document.getElementById('combo-move-earlier');
const comboMoveLaterButton = document.getElementById('combo-move-later');
const horizontalSweepSection = document.getElementById('horizontal-sweep-section');
const sweepArmStartInput = document.getElementById('sweep-arm-start');
const sweepArmStartOutput = document.getElementById('sweep-arm-start-output');
const sweepArmEndInput = document.getElementById('sweep-arm-end');
const sweepArmEndOutput = document.getElementById('sweep-arm-end-output');
const attackSpeedSection = document.getElementById('attack-speed-section');
const attackSpeedInput = document.getElementById('attack-speed');
const attackSpeedOutput = document.getElementById('attack-speed-output');
const attackFeelSection = document.getElementById('attack-feel-section');
const attackFxSection = document.getElementById('attack-fx-section');
const attackFxEnabledInput = document.getElementById('attack-fx-enabled');
const attackFxColorInput = document.getElementById('attack-fx-color');
const weaponGlowSection = document.getElementById('weapon-glow-section');
const weaponGlowLabel = document.getElementById('weapon-glow-label');
const weaponGlowEnabledInput = document.getElementById('weapon-glow-enabled');
const weaponGlowStartInput = document.getElementById('weapon-glow-start');
const weaponGlowEndInput = document.getElementById('weapon-glow-end');
const weaponGlowIntensityInput = document.getElementById('weapon-glow-intensity');
const rewardPanel = document.getElementById('reward-panel');
const supplyPanel = document.getElementById('supply-panel');
const supplyOptions = document.getElementById('supply-options');
const supplyCoinCount = document.getElementById('supply-coin-count');
const supplyStatus = document.getElementById('supply-status');
const supplyRerollButton = document.getElementById('supply-reroll');
const supplyContinueButton = document.getElementById('supply-continue');
const interactionPrompt = document.getElementById('interaction-prompt');
const interactionPromptKey = interactionPrompt.querySelector('kbd');
const interactionPromptLabel = interactionPrompt.querySelector('span');
const attackButton = document.getElementById('attack-button');
const shieldButton = document.getElementById('shield-button');
const hookButton = document.getElementById('hook-button');
const shaderToggle = document.getElementById('shader-toggle');
const musicToggle = document.getElementById('music-toggle');
const developerToggle = document.getElementById('developer-toggle');
const qaToggle = document.getElementById('qa-toggle');
const qaPanel = document.getElementById('qa-panel');
const qaClose = document.getElementById('qa-close');
const qaInvulnerableInput = document.getElementById('qa-invulnerable');
const qaRoomSelect = document.getElementById('qa-room');
const qaWaveSelect = document.getElementById('qa-wave');
const qaStatus = document.getElementById('qa-status');
const qaLabState = document.getElementById('qa-lab-state');
const qaLabToggle = document.getElementById('qa-lab-toggle');
const qaLabResetDuel = document.getElementById('qa-lab-reset-duel');
const qaLabAttackSelect = document.getElementById('qa-lab-attack');
const qaLabMetrics = document.getElementById('qa-lab-metrics');
const qaLabPlayerInputs = [...document.querySelectorAll('[data-combat-lab-player]')];
const qaLabImpactInputs = [...document.querySelectorAll('[data-combat-lab-impact]')];
const qaLabEnemyInputs = [...document.querySelectorAll('[data-combat-lab-enemy]')];
const roomMusic = createRoomMusicController({ toggleButton: musicToggle });

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#819ba4');
scene.fog = new THREE.FogExp2('#819ba4', 0.0145);
const diagnosticsGroup = new THREE.Group();
diagnosticsGroup.name = 'EditorDiagnostics';
diagnosticsGroup.visible = false;
scene.add(diagnosticsGroup);
const elevationBoundaryGroup = new THREE.Group();
elevationBoundaryGroup.name = 'DerivedElevationBoundaries';
scene.add(elevationBoundaryGroup);
const elevationBarriers = [];

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 240);

const aethoriaLightShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: {
      value: new THREE.Vector2(
        window.innerWidth * renderer.getPixelRatio(),
        window.innerHeight * renderer.getPixelRatio()
      )
    },
    nightMix: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float nightMix;
    varying vec2 vUv;

    float screenNoise(vec2 pixel) {
      return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
    }

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 color = source.rgb;
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float warmth = smoothstep(-0.04, 0.20, color.r - color.b);

      vec3 coolTint = mix(vec3(0.98, 0.99, 1.02), vec3(0.95, 0.98, 1.05), nightMix);
      vec3 warmTint = mix(vec3(1.03, 1.01, 0.97), vec3(1.10, 1.04, 0.90), nightMix);
      vec3 coolGrade = color * coolTint;
      vec3 warmGrade = color * warmTint;
      vec3 graded = mix(coolGrade, warmGrade, warmth);

      float shadowMask = 1.0 - smoothstep(0.11, 0.64, luminance);
      graded *= mix(vec3(1.0), vec3(0.94, 0.97, 1.05), shadowMask * (0.08 + nightMix * 0.12));

      float warmHighlight = smoothstep(0.52, 1.15, max(max(color.r, color.g), color.b)) * warmth;
      graded += vec3(0.075, 0.032, -0.008) * warmHighlight * (0.45 + nightMix * 0.55);
      graded *= 1.015 + nightMix * 0.02;

      vec2 pixel = floor(vUv * resolution * 0.5);
      float levels = mix(42.0, 28.0, nightMix);
      float dither = (screenNoise(pixel) - 0.5) / (levels * 1.35);
      vec3 perceptual = sqrt(max(graded, 0.0));
      perceptual = floor((clamp(perceptual, 0.0, 1.28) + dither) * levels + 0.5) / levels;
      graded = perceptual * perceptual;

      vec2 vignetteUv = (vUv - 0.5) * vec2(1.0, 0.78);
      float vignette = smoothstep(0.72, 0.24, length(vignetteUv));
      graded *= mix(0.98 - nightMix * 0.02, 1.0, vignette);

      gl_FragColor = vec4(max(graded, 0.0), source.a);
    }
  `
};

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const aethoriaLightPass = new ShaderPass(aethoriaLightShader);
composer.addPass(aethoriaLightPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.15, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 62;
controls.maxPolarAngle = Math.PI * 0.48;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;

const hemisphere = new THREE.HemisphereLight('#dbe7e8', '#30453a', 1.85);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight('#ffe1a0', 3.35);
sun.position.set(-19, 27, 13);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 75;
sun.shadow.bias = -0.00035;
scene.add(sun);

const rimLight = new THREE.DirectionalLight('#76a6c7', 1.3);
rimLight.position.set(18, 13, -20);
scene.add(rimLight);

const loader = new GLTFLoader();
const assets = new Map();
const mixers = [];
const movingActors = [];
const pickableRoots = [];
const editableRoots = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const buildPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let modelScale = 1;
let night = false;
let rainEnabled = false;
let shaderEnabled = true;
let rain;
let water;
let entranceLandscapeRoot = null;
let entranceLandscapeVisible = true;
let cameraTween = 1;
let cameraWasMoved = false;
let buildMode = true;
let developerMode = null;
let editorMode = 'place';
let selectedAsset = 'wall';
let selectedRoot = null;
let ghostRoot = null;
let gridHelper = null;
let selectionHelper = null;
let diagnosticsEnabled = false;
let diagnosticRayLine = null;
const diagnosticBindings = [];
let currentLayer = 0;
let placementRotation = 0;
let pointerDownPosition = null;
let dragRoot = null;
let editorHistoryState = createEditorHistoryState();
let initialLayout = null;
let activeEditorRoomId = 'wachhof';
let activeEditorWaveId = 'wachhof-welle-1';
let activeEditorView = 'build';
let roomSequence = 3;
let waveSequence = 6;
let roomDefinitions = createDefaultRoomDefinitions();
const roomHistoryStates = createRoomHistoryStore();
const initialRoomLayouts = new Map();
const initialRoomWaves = new Map();
const wavePreviewHelpers = [];
let gameMode = false;
let saveSlotRecords = persistence.listGameSaveSlots();
const storedGameSaveMeta = persistence.loadGameSaveMeta();
let selectedSaveSlot = normalizeGameSaveSlot(
  storedGameSaveMeta.activeSlot
    ?? saveSlotRecords.find((record) => record.save)?.slot
    ?? 1
);
let activeSaveSlot = null;
let activeSaveCreatedAt = null;
let activeSavePlaySeconds = 0;
let activeSaveSessionStartedAt = 0;
let armedSaveSlotAction = null;
let armedSaveSlotTimer = 0;
const completedRoomIds = new Set();
const openedRewardRoomIds = new Set();
const defeatedBossRoomIds = new Set();
let startScreenOpen = false;
let gameOverOpen = false;
let gameOverTimer = 0;
let gameOverRoomId = 'wachhof';
let gameOverReadyFocused = false;
let startScreenCloseTimer = 0;
let gameMenuOpen = false;
let gameMenuCloseTimer = 0;
let qaPanelOpen = false;
let qaInvulnerable = false;
let combatLabActive = false;
let combatLabEnemy = null;
let combatLabRespawnTimer = 0;
const combatLabStats = {
  attacks: 0,
  hits: 0,
  received: 0
};
let guidedNavigationLatch = 0;
let guidedInputArmed = false;
let guidedInputNeutralTimer = 0;
let inventoryOpen = false;
let equipmentOpen = false;
let selectedEquipmentPart = 'sword';
let selectedEquipmentView = 'front';
let selectedEquipmentAnimation = 'idle';
let equipmentPreviewBaseRotation = 0;
let equipmentPreviewPlaying = true;
let equipmentPreviewFxTriggered = false;
let equipmentPreviewFxLastProgress = 0;
let equipmentSelectionHelper = null;
let equipmentBackdrop = null;
const equipmentSceneVisibility = new Map();
let rewardOpen = false;
let supplyOpen = false;
let supplyPurchased = false;
let supplyOfferIds = [];
let playerRoot = null;
let playerWeapon = null;
let playerSpear = null;
let playerShield = null;
let playerHelmet = null;
let playerFaceRig = null;
let playerFaceHitTimer = 0;
const equipmentSockets = new Map();
const hookEquipmentSockets = new Map();
let hookEquipmentRig = null;
let playerEquipmentStowedForHook = false;
let playerHookStowedWeapon = null;
let playerHealth = 6;
let playerStamina = 1;
let playerInvulnerability = 0;
let playerHurtTimer = 0;
const playerKnockback = new THREE.Vector3();
let playerAttackTimer = 0;
let playerAttackActiveDuration = 0;
let playerAttackSpeedMultiplier = 1;
let playerAttackCooldown = 0;
let playerShieldBashCooldown = 0;
let playerAttackStep = 0;
let playerSpecialAttack = null;
let playerComboTimer = 0;
let playerAttackQueued = false;
let playerAttackEffectSpawned = false;
let playerAttackTransitionTimer = 0;
let playerAttackPendingStep = -1;
let playerAttackLungeRemaining = 0;
let playerAttackTotalLunge = 0;
let playerChargeReleaseTriggered = false;
let playerChargeEffectSpawned = false;
let playerAttackBaseRotation = 0;
let playerAttackWorldContactResolved = false;
let playerAttackReboundTimer = 0;
let playerAttackReboundDuration = 0;
let playerAttackReboundDistanceRemaining = 0;
let playerAttackReboundSide = 1;
let playerAttackReboundWeapon = 'sword';
const playerAttackReboundDirection = new THREE.Vector3();
let playerAttackInputHeld = false;
let playerAttackHoldTimer = 0;
let playerAttackCharging = false;
let playerAttackChargeRatio = 0;
let playerAttackChargeFullSignaled = false;
let playerIdleVariantIndex = 0;
let playerIdleVariantTimer = 2.8;
let playerIdleVariantElapsed = 0;
let playerIdleActive = false;
let playerProceduralHeadYaw = 0;
let playerProceduralHeadPitch = 0;
let playerProceduralTorsoPitch = 0;
let playerProceduralTorsoYaw = 0;
let playerProceduralTorsoRoll = 0;
let playerDodgeTimer = 0;
let playerShielding = false;
let playerHookTimer = 0;
let playerHookCooldown = 0;
let playerHookTarget = null;
let playerHookTargetRoot = null;
let playerHookStartY = 0.18;
let playerHookLandingY = 0.18;
let playerFallTimer = 0;
let playerFallDuration = 0.62;
let playerFallMode = 'none';
let playerFallDropHeight = 0;
let playerFallArcHeight = 0;
let playerLandingTimer = 0;
let playerLandingDuration = 0;
let playerLandingStrength = 0;
let playerLandingPoseStored = false;
let playerRecoveryStunTimer = 0;
let playerBlinkVisible = true;
let playerDropIntentTimer = 0;
const playerFallStartPosition = new THREE.Vector3();
const playerFallLandingPosition = new THREE.Vector3();
const playerLandingBaseScale = new THREE.Vector3(1, 1, 1);
const playerDropIntentDirection = new THREE.Vector3();
const playerLastSafePosition = new THREE.Vector3(0, 0.18, 4 * CELL);
let hookLine = null;
let hookTip = null;
let hookChainRoot = null;
const hookChainLinks = [];
let arenaGate = null;
let rewardChest = null;
let chestBeacon = null;
let exitBeacon = null;
let rewardChestMotionTime = -1;
let rewardChestResolveTimer = 0;
let rewardPanelRevealTimer = 0;
let combatMessageTimer = 0;
let equippedWeapon = 'sword';
let swordEmpowered = false;
let audioContext = null;
let swordWhooshBuffer = null;
let coinSoundStep = 0;
let lastCoinSoundAt = 0;
let lastMoveDirection = new THREE.Vector3(0, 0, -1);
let dodgeDirection = new THREE.Vector3(0, 0, -1);
let playerDustTimer = 0;
let playerDustStepSide = 1;
let activeGamepadIndex = null;
let gamepadButtonState = [];
let gamepadShieldHeld = false;
let gamepadMovementArmed = false;
let gamepadNeutralReady = false;
let gamepadNeutralTimer = 0;
const gamepadMoveVector = new THREE.Vector2();
const GAMEPAD_DEADZONE = 0.14;
const GAMEPAD_NEUTRAL_THRESHOLD = 0.1;
const GAMEPAD_NEUTRAL_HOLD_TIME = 0.45;
const GAMEPAD_REARM_THRESHOLD = 0.34;
const GUIDED_INPUT_NEUTRAL_HOLD_TIME = 0.18;
const GAMEPAD_INPUT_DISABLED = new URLSearchParams(window.location.search).has('no-gamepad');
const pressedKeys = new Set();
const touchMoveVector = new THREE.Vector2();
const combatEnemies = [];
const combatDestructibles = [];
const combatTraps = [];
const combatEffects = [];
const lootDrops = [];
let combatNavigationGraph = null;
const roomOneSceneryRoots = [];
const roomTwoSceneryRoots = [];
const playerAttackHits = new Set();
let combatHitStop = 0;
let combatImpactSlowTimer = 0;
let combatImpactTimeScale = 1;
let cameraShake = 0;
const WAVE_STATES = Object.freeze({
  READY: 'ready',
  ACTIVE: 'active',
  BETWEEN: 'between-waves',
  CLEARED: 'cleared',
  REWARD: 'reward',
  SUPPLY: 'supply',
  EXIT_READY: 'exit-ready',
  TRANSITION: 'transition',
  VICTORY: 'victory',
  DEAD: 'dead'
});
const waveDirector = {
  state: WAVE_STATES.READY,
  wave: 1,
  currentWaveIndex: 0,
  pendingSpawns: [],
  completionKind: 'exit',
  gateClosed: false,
  gateTargetY: 0,
  rewardUnlockTimer: 0,
  nextWaveTimer: 0
};
const combatFormation = {
  meleeLead: null,
  previousMeleeLead: null
};
const levelDirector = {
  room: 1,
  phase: 'idle',
  timer: 0,
  exitLockTimer: 0,
  exitLockMarkers: new Set(),
  targetRoomId: null
};
const ARENA_TRIGGER_Z = CELL * 2.85;
const LEVEL_FADE_OUT_TIME = 0.48;
const LEVEL_TRANSITION_HOLD_TIME = 0.28;
const LEVEL_FADE_IN_TIME = 0.64;
const LEVEL_EXIT_LOCK_TIME = 0.45;
const ACTOR_GROUND_OFFSET = 0.18;
const COMBAT_SURFACE_STEP = CELL * 0.3;
const COMBAT_NAV_MIN_LEVEL = 0;
const COMBAT_NAV_MAX_LEVEL = 2;
const COMBAT_HEIGHT_TOLERANCE = LEVEL_HEIGHT * 0.38;
const COMBAT_NAV_REPATH_TIME = 0.42;
const ENEMY_STAIR_CENTERING_STRENGTH = 0.72;
const EXIT_PROMPT_HEIGHT_TOLERANCE = LEVEL_HEIGHT * 0.34;
const PLAYER_VOID_FALL_TIME = 0.62;
const PLAYER_DROP_HOLD_TIME = 0.34;
const PLAYER_DROP_MIN_DAMAGE_HEIGHT = CELL * 0.62;
const PLAYER_DROP_FORWARD_DISTANCE = CELL * 0.66;
const PLAYER_DROP_ARC_HEIGHT = CELL * 0.42;
const PLAYER_LANDING_MIN_HOLD = 0.13;
const PLAYER_LANDING_MAX_HOLD = 0.27;
const PLAYER_FACING_SMOOTH_SPEED = 14.5;
const PLAYER_VOID_RECOVERY_STUN_TIME = 0.62;
const PLAYER_VOID_RECOVERY_STEP_IN = CELL * 0.46;
const GAME_OVER_REVEAL_TIME = 1.55;
const SHIELD_BASH_COOLDOWN = 0.78;
const SHIELD_BASH_STAMINA_COST = 0.22;
const PLAYER_ATTACK_HOLD_THRESHOLD = 0.28;
const PLAYER_ATTACK_FULL_CHARGE_TIME = 0.94;
const PLAYER_ATTACK_CHARGE_COLOR_START = new THREE.Color('#ffd759');
const PLAYER_ATTACK_CHARGE_COLOR_END = new THREE.Color('#64d9ff');
const SHIELD_BASH_ATTACK = Object.freeze({
  id: 'shield-bash',
  profile: 'block',
  damage: 1,
  knockback: 9.8,
  impactScale: 1,
  duration: 0.36,
  animation: 'holding-left',
  animationSpeed: 1.35,
  hitStart: 0.22,
  hitEnd: 0.52,
  range: CELL * 0.66,
  cone: 0.46
});
const PLAYER_IDLE_VARIANTS = Object.freeze([
  Object.freeze({ id: 'calm', minDuration: 2.8, maxDuration: 4.6 }),
  Object.freeze({ id: 'breathe', minDuration: 2.4, maxDuration: 4.1 }),
  Object.freeze({ id: 'look', minDuration: 2.2, maxDuration: 3.8 })
]);
const PLAYER_FACE_HIT_DURATION = 0.44;
const PLAYER_KNOCKBACK_IMPULSE_SCALE = 5.8;
const PLAYER_KNOCKBACK_DAMPING = 9;
const PLAYER_KNOCKBACK_STOP_SPEED = 0.16;
const ARENA_GATE_Z = CELL * 3.55;
const ARENA_GATE_HALF_WIDTH = CELL * 1.15;
const ARENA_GATE_COLLISION_HALF_DEPTH = CELL * 0.16;
const ARENA_GATE_OPEN_Y = CELL * 1.22;
const COIN_MAGNET_RADIUS = CELL * 2.8;
const COIN_COLLECT_RADIUS = 0.48;
const PLAYER_BODY_RADIUS = 0.43;
const ENEMY_BODY_RADIUS = 0.41;
const BARREL_BODY_RADIUS = CELL * 0.28;
const BARREL_MAX_HEALTH = 2;
const BODY_CONTACT_GAP = 0.06;
const WEAPON_REBOUND_PROFILE = Object.freeze(createWeaponReboundProfile({
  probeStart: PLAYER_BODY_RADIUS * 0.74,
  probeRadius: CELL * 0.055,
  probeStep: CELL * 0.05,
  recoilDistance: CELL * 0.068
}));
const TRAP_DEFAULTS = Object.freeze({
  damage: 1,
  targets: 'both',
  radius: CELL * 0.36,
  warning: 0.5,
  active: 0.18,
  cooldown: 1.6,
  playerKnockback: 1.4,
  enemyKnockback: 6.4
});
const ENEMY_ATTACK_TRIGGER_RANGE = PLAYER_BODY_RADIUS + ENEMY_BODY_RADIUS + 0.62;
const ENEMY_ATTACK_HIT_RANGE = PLAYER_BODY_RADIUS + ENEMY_BODY_RADIUS + 0.68;
const ENEMY_MELEE_SUPPORT_RADIUS = CELL * 0.9;
const ENEMY_MELEE_ORBIT_SPEED = 0.34;
const ENEMY_RANGED_ATTACK_RANGE = CELL * 3.75;
const ENEMY_RANGED_PREFERRED_RANGE = CELL * 2.25;
const ENEMY_RANGED_RETREAT_RANGE = CELL * 1.35;
const ENEMY_RANGED_ATTACK_TOTAL = 1.24;
const ENEMY_RANGED_ATTACK_STRIKE_AT = 0.62;
const ENEMY_RANGED_ATTACK_RECOVERY_AT = 0.2;
const ENEMY_SPEAR_SPEED = CELL * 5.35;
const BOSS_BODY_RADIUS = ENEMY_BODY_RADIUS * 1.65;
const BOSS_MAX_HEALTH = 18;
const BOSS_STOMP_RADIUS = CELL * 1.18;
const BOSS_CHARGE_SPEED = CELL * 4.15;
const BOSS_CHARGE_HIT_RANGE = BOSS_BODY_RADIUS + PLAYER_BODY_RADIUS + 0.72;
const BOSS_PHASE_COLORS = Object.freeze(['#ffb13b', '#ff6738', '#d85cff']);
const EQUIPMENT_DEFAULTS = Object.freeze({
  sword: Object.freeze({ position: [-0.37, 0.02, 0.05], rotation: [0, 8, 180], scale: 1 }),
  spear: Object.freeze({ position: [-0.235, 0, 0.02], rotation: [-92, -29, 180], scale: 1 }),
  shield: Object.freeze({ position: [0.27, 0.09, 0.025], rotation: [-170, 0, -180], scale: 1 })
});
const HOOK_STOW_TRANSFORMS = Object.freeze({
  sword: Object.freeze({ position: [-0.34, 0.76, -0.35], rotation: [0, 0, 28], scale: 1 }),
  spear: Object.freeze({ position: [-0.24, 0.58, -0.32], rotation: [4, -8, -32], scale: 0.94 }),
  shield: Object.freeze({ position: [0.13, 0.62, -0.3], rotation: [0, 180, 0], scale: 1.02 })
});
const ATTACK_FX_PROFILE_KEYS = Object.freeze(['attack1', 'attack2', 'attack3', 'attack4', 'attack5', 'attack6']);
const ATTACK_FX_DEFAULTS = Object.freeze({
  sword: Object.freeze({
    attack1: Object.freeze({ enabled: true, color: '#ffbf32', position: [0, 0.02, 0.12], rotation: -6, scale: 1, opacity: 0.92, duration: 0.22, gravity: -1.2, drift: 0.65, fadeIn: 0.02, fadeOut: 0.07 }),
    attack2: Object.freeze({ enabled: true, color: '#ff7a32', position: [0, 0.08, 0.18], rotation: -18, scale: 1.04, opacity: 0.92, duration: 0.24, gravity: -1.6, drift: 0.85, fadeIn: 0.02, fadeOut: 0.08 }),
    attack3: Object.freeze({ enabled: true, color: '#ffd84a', position: [0, 0.02, 0.3], rotation: 0, scale: 0.94, opacity: 0.94, duration: 0.2, gravity: -0.35, drift: 0.55, fadeIn: 0.01, fadeOut: 0.06 }),
    attack4: Object.freeze({ enabled: true, color: '#fff06a', position: [0, 0.1, 0.12], rotation: -9, scale: 1.18, opacity: 0.9, duration: 0.28, gravity: -1.05, drift: 0.95, fadeIn: 0.02, fadeOut: 0.1 }),
    attack5: Object.freeze({ enabled: true, color: '#ffd45c', position: [0, 0.1, 0.12], rotation: 9, scale: 1.2, opacity: 0.92, duration: 0.3, gravity: -0.85, drift: 1.05, fadeIn: 0.018, fadeOut: 0.11 }),
    attack6: Object.freeze({ enabled: true, color: '#fff4a3', position: [0, 0.04, 0.08], rotation: 0, scale: 1.34, opacity: 0.94, duration: 0.36, gravity: -0.55, drift: 1.22, fadeIn: 0.018, fadeOut: 0.13 })
  }),
  spear: Object.freeze({
    attack1: Object.freeze({ enabled: true, color: '#35cfff', position: [0, 0.04, 0.2], rotation: -5, scale: 1.08, opacity: 0.88, duration: 0.24, gravity: -0.8, drift: 0.75, fadeIn: 0.02, fadeOut: 0.08 }),
    attack2: Object.freeze({ enabled: true, color: '#20a8ff', position: [0, 0.1, 0.26], rotation: -16, scale: 1.12, opacity: 0.88, duration: 0.26, gravity: -1.1, drift: 0.95, fadeIn: 0.02, fadeOut: 0.09 }),
    attack3: Object.freeze({ enabled: true, color: '#6ce8ff', position: [0, 0.02, 0.46], rotation: 0, scale: 1.04, opacity: 0.92, duration: 0.23, gravity: -0.2, drift: 0.8, fadeIn: 0.01, fadeOut: 0.07 }),
    attack4: Object.freeze({ enabled: true, color: '#b7f4ff', position: [0, 0.12, 0.2], rotation: -11, scale: 1.2, opacity: 0.88, duration: 0.3, gravity: -0.9, drift: 1.05, fadeIn: 0.02, fadeOut: 0.1 }),
    attack5: Object.freeze({ enabled: true, color: '#74ddff', position: [0, 0.12, 0.2], rotation: 11, scale: 1.24, opacity: 0.9, duration: 0.32, gravity: -0.7, drift: 1.14, fadeIn: 0.018, fadeOut: 0.11 }),
    attack6: Object.freeze({ enabled: true, color: '#dcfbff', position: [0, 0.06, 0.12], rotation: 0, scale: 1.46, opacity: 0.9, duration: 0.4, gravity: -0.48, drift: 1.34, fadeIn: 0.018, fadeOut: 0.14 })
  })
});
const WEAPON_CHARGE_GLOW_DEFAULTS = Object.freeze({
  sword: Object.freeze({ enabled: true, startColor: '#ffd759', endColor: '#64d9ff', intensity: 2.1 }),
  spear: Object.freeze({ enabled: true, startColor: '#dff8ff', endColor: '#42bfff', intensity: 2.25 })
});
const EQUIPMENT_PROFILE_KEYS = Object.freeze(['base', 'block', 'hook', 'attack1', 'attack2', 'attack3', 'attack4', 'attack5', 'attack6']);
const EQUIPMENT_ANIMATION_PROFILES = Object.freeze({
  idle: 'base',
  'idle-breathe': 'base',
  'idle-look': 'base',
  walk: 'base',
  sprint: 'base',
  'holding-left': 'block',
  hook: 'hook',
  'attack-melee-right': 'attack1',
  'attack-melee-left': 'attack2',
  'interact-right': 'attack3',
  attack4: 'attack4',
  attack5: 'attack5',
  attack6: 'attack6'
});
const EQUIPMENT_ANIMATION_CLIPS = Object.freeze({
  'idle-breathe': 'idle',
  'idle-look': 'idle',
  hook: 'jump',
  attack4: 'holding-right',
  attack5: 'holding-right',
  attack6: 'attack-melee-right'
});
const EQUIPMENT_PROFILE_LABELS = Object.freeze({
  base: 'Grundgriff',
  block: 'Blocken',
  hook: 'Enterhaken - Ruecken',
  attack1: 'Angriff 1',
  attack2: 'Angriff 2',
  attack3: 'Angriff 3',
  attack4: 'Horizontal 4 · Links nach rechts',
  attack5: 'Horizontal 5 · Rechts nach links',
  attack6: 'Auflade-Rundumschlag'
});
const EQUIPMENT_LABELS = Object.freeze({ sword: 'Schwert', spear: 'Speer', shield: 'Schild' });
const EQUIPMENT_VIEW_OFFSETS = Object.freeze({
  front: new THREE.Vector3(0, 1.45, 5.6),
  left: new THREE.Vector3(-5.6, 1.45, 0),
  back: new THREE.Vector3(0, 1.45, -5.6),
  right: new THREE.Vector3(5.6, 1.45, 0)
});
function cloneEquipmentTransform(transform) {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: transform.scale
  };
}
function createEquipmentProfiles(transform, part = null) {
  const profiles = Object.fromEntries(
    EQUIPMENT_PROFILE_KEYS.map((profile) => [profile, cloneEquipmentTransform(transform)])
  );
  if (part && HOOK_STOW_TRANSFORMS[part]) {
    profiles.hook = cloneEquipmentTransform(HOOK_STOW_TRANSFORMS[part]);
  }
  return profiles;
}
function cloneEquipmentDefaults() {
  return Object.fromEntries(Object.entries(EQUIPMENT_DEFAULTS)
    .map(([part, transform]) => [part, createEquipmentProfiles(transform, part)]));
}
function normalizedEquipmentTransform(candidate) {
  if (!candidate || !Array.isArray(candidate.position) || !Array.isArray(candidate.rotation)) return null;
  if (candidate.position.length !== 3 || candidate.rotation.length !== 3) return null;
  const values = [...candidate.position, ...candidate.rotation, candidate.scale].map(Number);
  if (!values.every(Number.isFinite)) return null;
  return {
    position: candidate.position.map(Number),
    rotation: candidate.rotation.map(Number),
    scale: THREE.MathUtils.clamp(Number(candidate.scale), 0.55, 1.45)
  };
}
function loadEquipmentTransforms() {
  const defaults = cloneEquipmentDefaults();
  try {
    const saved = persistedSettings.data.equipment ?? {};
    Object.keys(defaults).forEach((part) => {
      const candidate = saved[part];
      const legacyTransform = normalizedEquipmentTransform(candidate);
      if (legacyTransform) {
        defaults[part] = createEquipmentProfiles(legacyTransform, part);
        return;
      }
      const legacyAttackFive = normalizedEquipmentTransform(candidate?.attack5);
      const hasSeparatedCharge = Boolean(normalizedEquipmentTransform(candidate?.attack6));
      EQUIPMENT_PROFILE_KEYS.forEach((profile) => {
        if (!hasSeparatedCharge && ['attack5', 'attack6'].includes(profile)) return;
        const transform = normalizedEquipmentTransform(candidate?.[profile]);
        if (transform) defaults[part][profile] = transform;
      });
      if (!hasSeparatedCharge && legacyAttackFive) {
        defaults[part].attack6 = legacyAttackFive;
        defaults[part].attack5 = cloneEquipmentTransform(defaults[part].attack4);
      }
    });
  } catch (error) {
    console.warn('Ausrüstungs-Sockets konnten nicht geladen werden.', error);
  }
  return defaults;
}
const equipmentTransforms = loadEquipmentTransforms();
function cloneAttackFxConfig(config) {
  return {
    enabled: config.enabled,
    color: config.color,
    position: [...config.position],
    rotation: config.rotation,
    scale: config.scale,
    opacity: config.opacity,
    duration: config.duration,
    gravity: config.gravity,
    drift: config.drift,
    fadeIn: config.fadeIn,
    fadeOut: config.fadeOut
  };
}
function cloneAttackFxDefaults() {
  return Object.fromEntries(Object.entries(ATTACK_FX_DEFAULTS).map(([weapon, profiles]) => [
    weapon,
    Object.fromEntries(Object.entries(profiles).map(([profile, config]) => [profile, cloneAttackFxConfig(config)]))
  ]));
}
function normalizedAttackFxConfig(candidate, fallback) {
  if (!candidate || !Array.isArray(candidate.position) || candidate.position.length !== 3) return null;
  const values = [...candidate.position, candidate.rotation, candidate.scale, candidate.opacity, candidate.duration]
    .map(Number);
  if (!values.every(Number.isFinite)) return null;
  const numberOrFallback = (value, fallbackValue) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallbackValue;
  };
  return {
    enabled: candidate.enabled !== false,
    color: /^#[0-9a-f]{6}$/i.test(candidate.color) ? candidate.color : fallback.color,
    position: [
      THREE.MathUtils.clamp(Number(candidate.position[0]), -1.5, 1.5),
      THREE.MathUtils.clamp(Number(candidate.position[1]), -1, 1.5),
      THREE.MathUtils.clamp(Number(candidate.position[2]), -1, 2)
    ],
    rotation: THREE.MathUtils.clamp(Number(candidate.rotation), -180, 180),
    scale: THREE.MathUtils.clamp(Number(candidate.scale), 0.3, 3),
    opacity: THREE.MathUtils.clamp(Number(candidate.opacity), 0.1, 1),
    duration: THREE.MathUtils.clamp(Number(candidate.duration), 0.12, 0.5),
    gravity: THREE.MathUtils.clamp(numberOrFallback(candidate.gravity, fallback.gravity), -20, 20),
    drift: THREE.MathUtils.clamp(numberOrFallback(candidate.drift, fallback.drift), 0, 6),
    fadeIn: THREE.MathUtils.clamp(numberOrFallback(candidate.fadeIn, fallback.fadeIn), 0, 0.4),
    fadeOut: THREE.MathUtils.clamp(numberOrFallback(candidate.fadeOut, fallback.fadeOut), 0, 0.4)
  };
}
function loadAttackFxSettings() {
  const defaults = cloneAttackFxDefaults();
  try {
    const saved = persistedSettings.data.attackFx ?? {};
    Object.keys(defaults).forEach((weapon) => {
      const hasSeparatedCharge = Boolean(saved?.[weapon]?.attack6);
      ATTACK_FX_PROFILE_KEYS.forEach((profile) => {
        if (!hasSeparatedCharge && ['attack5', 'attack6'].includes(profile)) return;
        const config = normalizedAttackFxConfig(saved?.[weapon]?.[profile], defaults[weapon][profile]);
        if (config) defaults[weapon][profile] = config;
      });
      if (!hasSeparatedCharge && saved?.[weapon]?.attack5) {
        const legacyCharge = normalizedAttackFxConfig(
          saved[weapon].attack5,
          ATTACK_FX_DEFAULTS[weapon].attack6
        );
        if (legacyCharge) defaults[weapon].attack6 = legacyCharge;
        defaults[weapon].attack5 = cloneAttackFxConfig(defaults[weapon].attack4);
        defaults[weapon].attack5.rotation *= -1;
      }
    });
  } catch (error) {
    console.warn('Schwungeffekt-Einstellungen konnten nicht geladen werden.', error);
  }
  return defaults;
}
const attackFxSettings = loadAttackFxSettings();
function normalizedWeaponChargeGlow(candidate, fallback) {
  const validColor = (value, fallbackColor) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackColor;
  return {
    enabled: candidate?.enabled !== false,
    startColor: validColor(candidate?.startColor, fallback.startColor),
    endColor: validColor(candidate?.endColor, fallback.endColor),
    intensity: THREE.MathUtils.clamp(Number(candidate?.intensity) || fallback.intensity, 0.25, 4)
  };
}
function loadWeaponChargeGlowSettings() {
  const settings = Object.fromEntries(Object.entries(WEAPON_CHARGE_GLOW_DEFAULTS)
    .map(([weapon, config]) => [weapon, { ...config }]));
  try {
    const saved = persistedSettings.data.weaponGlow ?? {};
    Object.keys(settings).forEach((weapon) => {
      settings[weapon] = normalizedWeaponChargeGlow(saved?.[weapon], WEAPON_CHARGE_GLOW_DEFAULTS[weapon]);
    });
  } catch (error) {
    console.warn('Waffenleuchten konnte nicht geladen werden.', error);
  }
  return settings;
}
const weaponChargeGlowSettings = loadWeaponChargeGlowSettings();
const COMBO_PROFILE_KEYS = Object.freeze(['attack1', 'attack2', 'attack3', 'attack4', 'attack5']);
const ATTACK_SEQUENCE_DEFAULTS = Object.freeze({
  sword: Object.freeze({ attack2: true, attack3: true, attack4: true, attack5: true }),
  spear: Object.freeze({ attack2: true, attack3: true, attack4: true, attack5: true })
});

function loadAttackSequenceSettings() {
  const settings = Object.fromEntries(Object.entries(ATTACK_SEQUENCE_DEFAULTS).map(([weapon, profiles]) => [
    weapon,
    { ...profiles }
  ]));
  try {
    const saved = persistedSettings.data.attackSequence ?? {};
    Object.keys(settings).forEach((weapon) => {
      const profiles = ['attack2', 'attack3', 'attack4'];
      if (persistedSettings.data.comboFlow?.[weapon]) profiles.push('attack5');
      profiles.forEach((profile) => {
        if (typeof saved?.[weapon]?.[profile] === 'boolean') settings[weapon][profile] = saved[weapon][profile];
      });
    });
  } catch (error) {
    console.warn('Kombo-Einstellungen konnten nicht geladen werden.', error);
  }
  return settings;
}

const attackSequenceSettings = loadAttackSequenceSettings();
const COMBO_FLOW_DEFAULTS = Object.freeze({
  sword: Object.freeze({
    mode: 'fixed',
    order: Object.freeze([...COMBO_PROFILE_KEYS]),
    pauses: Object.freeze({ attack1: 0.04, attack2: 0.05, attack3: 0.07, attack4: 0.1, attack5: 0.08 })
  }),
  spear: Object.freeze({
    mode: 'fixed',
    order: Object.freeze([...COMBO_PROFILE_KEYS]),
    pauses: Object.freeze({ attack1: 0.05, attack2: 0.06, attack3: 0.08, attack4: 0.11, attack5: 0.09 })
  })
});

function loadComboFlowSettings() {
  const saved = persistedSettings.data.comboFlow ?? {};
  return Object.fromEntries(Object.entries(COMBO_FLOW_DEFAULTS).map(([weapon, fallback]) => {
    const candidate = saved?.[weapon] ?? {};
    const order = Array.isArray(candidate.order)
      ? candidate.order.filter((profile) => COMBO_PROFILE_KEYS.includes(profile))
      : [];
    const completeOrder = [...new Set([...order, ...COMBO_PROFILE_KEYS])];
    const pauses = Object.fromEntries(COMBO_PROFILE_KEYS.map((profile) => [
      profile,
      THREE.MathUtils.clamp(
        Number.isFinite(Number(candidate.pauses?.[profile]))
          ? Number(candidate.pauses[profile])
          : fallback.pauses[profile],
        0,
        0.45
      )
    ]));
    return [weapon, {
      mode: candidate.mode === 'random' ? 'random' : 'fixed',
      order: completeOrder,
      pauses
    }];
  }));
}

const comboFlowSettings = loadComboFlowSettings();
const CHARGED_ATTACK_DEFAULTS = Object.freeze({ sword: true, spear: true });

function loadChargedAttackSettings() {
  const settings = { ...CHARGED_ATTACK_DEFAULTS };
  try {
    const saved = persistedSettings.data.chargedAttack ?? {};
    const legacySequence = persistedSettings.data.attackSequence ?? {};
    Object.keys(settings).forEach((weapon) => {
      if (typeof saved?.[weapon] === 'boolean') settings[weapon] = saved[weapon];
      else if (typeof legacySequence?.[weapon]?.attack6 === 'boolean'
        || typeof legacySequence?.[weapon]?.attack5 === 'boolean') {
        settings[weapon] = legacySequence[weapon].attack6
          ?? legacySequence[weapon].attack5;
      }
    });
  } catch (error) {
    console.warn('Auflade-Angriff konnte nicht geladen werden.', error);
  }
  return settings;
}

const chargedAttackSettings = loadChargedAttackSettings();
const ATTACK_SETS = createAttackSets(CELL);
const PLAYER_ATTACKS = ATTACK_SETS.sword;
const SPEAR_ATTACKS = ATTACK_SETS.spear;
const HORIZONTAL_SWEEP_PROFILE_KEYS = Object.freeze(['attack4', 'attack5', 'attack6']);
const HORIZONTAL_SWEEP_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(ATTACK_SETS).map(([weapon, attacks]) => [
    weapon,
    Object.freeze(Object.fromEntries(attacks
      .filter((attack) => Number.isFinite(attack.armStartDeg) && Number.isFinite(attack.armEndDeg))
      .map((attack) => [
        attack.profile,
        Object.freeze({ startDeg: attack.armStartDeg, endDeg: attack.armEndDeg })
      ])))
  ])
));

function normalizedHorizontalSweepConfig(candidate, fallback) {
  const startDeg = Number(candidate?.startDeg);
  const endDeg = Number(candidate?.endDeg);
  return {
    startDeg: THREE.MathUtils.clamp(Number.isFinite(startDeg) ? startDeg : fallback.startDeg, -150, 150),
    endDeg: THREE.MathUtils.clamp(Number.isFinite(endDeg) ? endDeg : fallback.endDeg, -150, 150)
  };
}

function loadHorizontalSweepSettings() {
  const saved = persistedSettings.data.horizontalSweep ?? {};
  return Object.fromEntries(Object.entries(HORIZONTAL_SWEEP_DEFAULTS).map(([weapon, profiles]) => [
    weapon,
    Object.fromEntries(Object.entries(profiles).map(([profile, fallback]) => [
      profile,
      normalizedHorizontalSweepConfig(saved?.[weapon]?.[profile], fallback)
    ]))
  ]));
}

const horizontalSweepSettings = loadHorizontalSweepSettings();
const ATTACK_SPEED_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(ATTACK_SETS).map(([weapon, attacks]) => [
    weapon,
    Object.freeze(Object.fromEntries(attacks.map((attack) => [attack.profile, 1])))
  ])
));

function loadAttackSpeedSettings() {
  const saved = persistedSettings.data.attackSpeed ?? {};
  return Object.fromEntries(Object.entries(ATTACK_SPEED_DEFAULTS).map(([weapon, profiles]) => [
    weapon,
    Object.fromEntries(Object.entries(profiles).map(([profile, fallback]) => {
      const candidate = Number(saved?.[weapon]?.[profile]);
      return [profile, THREE.MathUtils.clamp(Number.isFinite(candidate) ? candidate : fallback, 0.55, 1.6)];
    }))
  ]));
}

const attackSpeedSettings = loadAttackSpeedSettings();
const ATTACK_FEEL_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(ATTACK_SETS).map(([weapon, attacks]) => [
    weapon,
    Object.freeze(Object.fromEntries(attacks.map((attack) => [
      attack.profile,
      Object.freeze({
        rangeScale: 1,
        hitStart: attack.profile === 'attack6' ? 0.2 : attack.hitStart,
        hitEnd: attack.profile === 'attack6' ? 0.78 : attack.hitEnd,
        lungeScale: 1,
        impactScale: 1
      })
    ])))
  ])
));

function normalizedAttackFeelConfig(candidate, fallback) {
  const rangeScale = Number(candidate?.rangeScale);
  const lungeScale = Number(candidate?.lungeScale);
  const impactScale = Number(candidate?.impactScale);
  const rawHitStart = Number(candidate?.hitStart);
  const rawHitEnd = Number(candidate?.hitEnd);
  const hitStart = THREE.MathUtils.clamp(Number.isFinite(rawHitStart) ? rawHitStart : fallback.hitStart, 0.05, 0.85);
  const hitEnd = THREE.MathUtils.clamp(
    Number.isFinite(rawHitEnd) ? rawHitEnd : fallback.hitEnd,
    hitStart + 0.08,
    0.95
  );
  return {
    rangeScale: THREE.MathUtils.clamp(Number.isFinite(rangeScale) ? rangeScale : fallback.rangeScale, 0.7, 1.45),
    hitStart,
    hitEnd,
    lungeScale: THREE.MathUtils.clamp(Number.isFinite(lungeScale) ? lungeScale : fallback.lungeScale, 0, 1.6),
    impactScale: THREE.MathUtils.clamp(Number.isFinite(impactScale) ? impactScale : fallback.impactScale, 0.6, 1.8)
  };
}

function loadAttackFeelSettings() {
  const saved = persistedSettings.data.attackFeel ?? {};
  return Object.fromEntries(Object.entries(ATTACK_FEEL_DEFAULTS).map(([weapon, profiles]) => [
    weapon,
    Object.fromEntries(Object.entries(profiles).map(([profile, fallback]) => [
      profile,
      normalizedAttackFeelConfig(saved?.[weapon]?.[profile], fallback)
    ]))
  ]));
}

const attackFeelSettings = loadAttackFeelSettings();
const EQUIPMENT_PREVIEW_ANIMATIONS = new Set([
  'idle', 'idle-breathe', 'idle-look', 'walk', 'holding-left', 'hook', 'emote-no',
  'attack-melee-right', 'attack-melee-left', 'interact-right', 'attack4', 'attack5', 'attack6'
]);
const inventoryState = { potions: 3, coins: 0 };
const runProgress = createRunProgress();
const equipmentProgress = createEquipmentProgress();

function playerMaxHealth() {
  return 6 + runProgress.maxHealthBonus;
}

function resetRunProgression() {
  resetRunProgress(runProgress);
  supplyOfferIds = [];
  supplyPurchased = false;
}

function upgradeStackCount(upgradeId) {
  return runUpgradeStackCount(runProgress, upgradeId);
}

function availableRunUpgrades() {
  return availableRunUpgradeDefinitions(runProgress);
}

function rollSupplyOffers() {
  supplyOfferIds = rollRunUpgradeOffers(runProgress);
}

function applyRunUpgrade(upgrade) {
  const result = applyRunUpgradeToProgress(runProgress, upgrade);
  if (result.applied && result.restoreHealth > 0) {
    playerHealth = Math.min(playerMaxHealth(), playerHealth + result.restoreHealth);
  }
  return result.applied;
}
const playerStart = new THREE.Vector3(0, 0.18, 4.0 * CELL);
const followOffset = new THREE.Vector3(11.5, 12.5, 14.5);
const combatCameraFocus = new THREE.Vector3();
const combatCameraLead = new THREE.Vector3();
const COMBAT_CAMERA_TARGET_OFFSET = new THREE.Vector3(0, 0.72, 0);
const COMBAT_CAMERA_FOCUS_SPEED = 8.5;
const COMBAT_CAMERA_LEAD_DISTANCE = CELL * 0.72;
const COMBAT_CAMERA_IDLE_LEAD_DISTANCE = CELL * 0.34;
const COMBAT_CAMERA_LEAD_SPEED = 5.8;

function defaultCameraPose() {
  const portrait = camera.aspect < 0.8;
  return {
    position: portrait ? new THREE.Vector3(39, 31, 44) : new THREE.Vector3(22, 18, 25),
    target: portrait ? new THREE.Vector3(0, 0.5, 0) : new THREE.Vector3(0, 1.15, 0)
  };
}

function applyDefaultCamera() {
  const pose = defaultCameraPose();
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
}

applyDefaultCamera();

const ENEMY_CATALOG = createEnemyCatalog({
  bossMaxHealth: BOSS_MAX_HEALTH,
  bossBodyRadius: BOSS_BODY_RADIUS
});
const ASSET_CATALOG = createAssetCatalog({ cellSize: CELL, enemyCatalog: ENEMY_CATALOG });
const {
  modelNames: MODEL_NAMES,
  modelSources: MODEL_SOURCES = {},
  nativeScaleModelIds = [],
  labels: assetLabels,
  groups: ASSET_GROUPS,
  buildDefinitions: BUILD_ASSET_DEFINITIONS,
  solidAssetIds,
  walkableAssetIds,
  grappleAssetIds
} = createAssetViews(ASSET_CATALOG);
const NATIVE_SCALE_MODELS = new Set(nativeScaleModelIds);
const SOLID_ASSETS = new Set(solidAssetIds);
const WALKABLE_SURFACE_ASSETS = new Set(walkableAssetIds);
const GRAPPLE_ASSETS = new Set(grappleAssetIds);
const ELEVATED_STONE_SURFACES = new Set(['floor', 'floor-detail']);
const ELEVATION_BOUNDARY_DEPTH = CELL * 0.13;
const STAIR_COLLISION_DIMENSIONS = createStairCollisionDimensions(CELL);
const STAIR_WALKABLE_HALF_WIDTH = STAIR_COLLISION_DIMENSIONS.walkableHalfWidth;
const STAIR_COLLISION_HALF_LENGTH = STAIR_COLLISION_DIMENSIONS.collisionHalfLength;
const STAIR_FLANK_HALF_THICKNESS = STAIR_COLLISION_DIMENSIONS.flankHalfThickness;
const elevationWallGeometry = new RoundedBoxGeometry(
  CELL * 0.98,
  LEVEL_HEIGHT * 0.92,
  ELEVATION_BOUNDARY_DEPTH,
  2,
  0.055
);
const elevationCapGeometry = new RoundedBoxGeometry(
  CELL * 1.03,
  CELL * 0.13,
  ELEVATION_BOUNDARY_DEPTH * 1.45,
  2,
  0.045
);
const elevationButtressGeometry = new RoundedBoxGeometry(
  CELL * 0.12,
  LEVEL_HEIGHT * 0.82,
  ELEVATION_BOUNDARY_DEPTH * 1.55,
  2,
  0.04
);
const elevationWallMaterial = new THREE.MeshStandardMaterial({
  color: '#7f8e99',
  roughness: 0.92,
  metalness: 0
});
const elevationTrimMaterial = new THREE.MeshStandardMaterial({
  color: '#aab6bf',
  roughness: 0.86,
  metalness: 0
});

function buildAssetModelName(name) {
  return BUILD_ASSET_DEFINITIONS[name]?.model ?? name;
}

function isKnownBuildAsset(name) {
  return MODEL_NAMES.includes(name) || Boolean(BUILD_ASSET_DEFINITIONS[name]);
}

const HELFER_PRAEFIXE = Object.freeze(['COLLIDER_', 'TRIGGER_', 'SNAP_', 'SOCKET_', 'DIRECTION_']);

function prepareModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    let colliderNode = child;
    let hiddenCollider = false;
    // Hilfsknoten aus den Modellen: Kollider, Ausloeser, Rast- und Steckpunkte.
    // Sie beschreiben Verhalten und duerfen nie sichtbar sein.
    while (colliderNode && colliderNode !== root.parent) {
      if (HELFER_PRAEFIXE.some((praefix) => colliderNode.name?.startsWith(praefix))) {
        hiddenCollider = true;
        break;
      }
      colliderNode = colliderNode.parent;
    }
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    if (hiddenCollider || sourceMaterials.some((material) => material?.name === 'Collision_Invisible')) {
      child.visible = false;
      child.castShadow = false;
      child.receiveShadow = false;
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
    const usesMaterialArray = Array.isArray(child.material);
    const materials = usesMaterialArray ? child.material : [child.material];
    const opaqueMaterials = materials.map((material) => {
      const copy = material.clone();
      copy.transparent = false;
      copy.opacity = 1;
      copy.depthWrite = true;
      if (copy.map) {
        copy.map = copy.map.clone();
        copy.map.colorSpace = THREE.SRGBColorSpace;
        copy.map.magFilter = THREE.NearestFilter;
        copy.map.minFilter = THREE.NearestMipmapNearestFilter;
        copy.map.needsUpdate = true;
      }
      return copy;
    });
    child.material = usesMaterialArray ? opaqueMaterials : opaqueMaterials[0];
  });
}

async function loadAssets() {
  let complete = 0;
  THREE.Cache.enabled = true;
  await new THREE.TextureLoader().loadAsync(`${MODEL_ROOT}Textures/colormap.png`).catch(() => null);
  await Promise.all(MODEL_NAMES.map(async (name) => {
    const source = MODEL_SOURCES[name] ?? `${MODEL_ROOT}${name}.glb`;
    const gltf = await loader.loadAsync(source);
    assets.set(name, gltf);
    complete += 1;
    const progress = (complete / MODEL_NAMES.length) * 100;
    loadingProgress.style.width = `${progress}%`;
    loadingProgress.parentElement?.setAttribute('aria-valuenow', String(Math.round(progress)));
  }));

  const floor = SkeletonUtils.clone(assets.get('floor').scene);
  const bounds = new THREE.Box3().setFromObject(floor);
  const size = bounds.getSize(new THREE.Vector3());
  modelScale = CELL / Math.max(size.x, size.z);
}

function playActorAnimation(root, name, options = {}) {
  const actions = root?.userData.actions;
  if (!actions?.size) return;
  const requested = name.toLowerCase();
  const action = actions.get(requested)
    ?? [...actions.entries()].find(([key]) => key.includes(requested))?.[1];
  if (!action) return;
  if (root.userData.currentAction === action && !options.restart) return;

  const previous = root.userData.currentAction;
  if (previous && previous !== action) previous.fadeOut(options.fade ?? 0.1);
  action.reset();
  action.enabled = true;
  action.clampWhenFinished = Boolean(options.once);
  action.setLoop(options.once ? THREE.LoopOnce : THREE.LoopRepeat, options.once ? 1 : Infinity);
  action.setEffectiveTimeScale(options.speed ?? 1);
  action.fadeIn(options.fade ?? 0.1).play();
  root.userData.currentAction = action;
  root.userData.currentAnimation = requested;
}

function stopNamedAnimation(root, name) {
  const requested = String(name).toLowerCase();
  const action = root?.userData.actions?.get(requested)
    ?? [...(root?.userData.actions?.entries() ?? [])]
      .find(([key]) => key.includes(requested))?.[1];
  if (!action) return;
  action.stop();
  if (root.userData.currentAction === action) {
    root.userData.currentAction = null;
    root.userData.currentAnimation = null;
  }
}

function setWachtankerTargeted(root, targeted) {
  if (!root?.userData.wachtanker) return;
  const active = Boolean(targeted);
  const halo = root.getObjectByName('Target_Halo_Targeted');
  if (halo) halo.visible = active;
  if (root.userData.wachtankerTargeted === active) return;
  root.userData.wachtankerTargeted = active;
  if (active) {
    playActorAnimation(root, 'wachtanker_target_pulse', {
      restart: true,
      speed: 0.92,
      fade: 0.08
    });
  } else {
    stopNamedAnimation(root, 'wachtanker_target_pulse');
  }
}

function configureWachtankerRoot(root) {
  root.userData.wachtanker = true;
  root.userData.wachtankerTargeted = null;
  setWachtankerTargeted(root, false);
}

function setWachtmalAwakened(root, awakened, options = {}) {
  if (!root?.userData.wachtmal) return;
  const active = Boolean(awakened);
  root.getObjectByName('Core_Assembly_Awake')?.traverse((child) => {
    child.visible = active;
  });
  root.getObjectByName('Runes_Awake')?.traverse((child) => {
    child.visible = active;
  });
  if (root.userData.wachtmalLight) {
    root.userData.wachtmalLight.visible = active;
    root.userData.wachtmalLight.intensity = active ? 2.1 : 0;
  }
  if (root.userData.wachtmalAwakened === active && !options.restart) return;
  root.userData.wachtmalAwakened = active;
  root.userData.wachtmalTime = 0;
  if (active) {
    playActorAnimation(root, 'wachtmal_awaken_idle', {
      restart: true,
      speed: 0.82,
      fade: options.immediate ? 0 : 0.22
    });
  } else {
    stopNamedAnimation(root, 'wachtmal_awaken_idle');
  }
}

function configureWachtmalRoot(root) {
  root.userData.wachtmal = true;
  root.userData.wachtmalAwakened = null;
  root.userData.wachtmalTime = 0;
  const light = new THREE.PointLight('#64e7e2', 0, 5.8, 2);
  light.position.set(0, 1.3, 0);
  light.visible = false;
  root.add(light);
  root.userData.wachtmalLight = light;
  setWachtmalAwakened(root, false, { immediate: true });
}

function configureWachtfackelRoot(root, profile) {
  const lights = [];
  root.traverse((child) => {
    if (child.isPointLight) lights.push(child);
  });
  if (!lights.length) {
    const light = new THREE.PointLight(
      profile.color,
      profile.dayIntensity,
      CELL * profile.distanceCells,
      2
    );
    const anchor = root.getObjectByName(profile.lightAnchor);
    (anchor ?? root).add(light);
    lights.push(light);
  }
  lights.forEach((light) => {
    light.color.set(profile.color);
    light.distance = CELL * profile.distanceCells;
    light.decay = 2;
    light.castShadow = false;
  });
  root.userData.wachtfackel = profile;
  root.userData.wachtfackelLights = lights;
  root.userData.wachtfackelPhase = Math.abs(
    root.position.x * 0.37 + root.position.z * 0.53
  ) % (Math.PI * 2);
}

function configureSpecialAssetRoot(root, modelName) {
  if (modelName === 'wachtanker-ahnhoehe') configureWachtankerRoot(root);
  if (modelName === 'wachtmal-ahnhoehe') configureWachtmalRoot(root);
  const torchProfile = BUILD_ASSET_DEFINITIONS[root.userData.assetName]?.torch;
  if (torchProfile) configureWachtfackelRoot(root, torchProfile);
}

function roomWachtmale(roomId) {
  return editableRootsForRoom(roomId).filter((root) => root.userData.wachtmal);
}

function setRoomWachtmaleAwakened(roomId, awakened, options = {}) {
  roomWachtmale(roomId).forEach((root) => setWachtmalAwakened(root, awakened, options));
}

function awakenRoomWachtmale(roomId) {
  const roots = roomWachtmale(roomId);
  roots.forEach((root) => {
    setWachtmalAwakened(root, true, { restart: true });
    spawnHitImpact(root.position.clone().add(new THREE.Vector3(0, 1.05, 0)), true);
  });
  if (roots.length) playRewardChime('sword');
}

function updateWachtmalEffects(delta) {
  pickableRoots.forEach((root) => {
    if (!root.userData.wachtmalAwakened || !root.userData.wachtmalLight) return;
    root.userData.wachtmalTime += delta;
    const pulse = 0.5 + Math.sin(root.userData.wachtmalTime * 2.8) * 0.5;
    root.userData.wachtmalLight.intensity = 1.8 + pulse * 1.35;
  });
}

function updateWachtfackelEffects(elapsed) {
  pickableRoots.forEach((root) => {
    const profile = root.userData.wachtfackel;
    const lights = root.userData.wachtfackelLights;
    if (!profile || !lights?.length) return;
    const phase = root.userData.wachtfackelPhase ?? 0;
    const flutter = Math.sin(elapsed * profile.flickerSpeed + phase) * 0.62
      + Math.sin(elapsed * profile.flickerSpeed * 1.71 + phase * 0.43) * 0.38;
    const base = night ? profile.nightIntensity : profile.dayIntensity;
    const intensity = base * (1 + flutter * profile.flickerAmount);
    lights.forEach((light) => {
      light.intensity = intensity;
    });
  });
}

function clearProceduralActorPose(root) {
  const offsets = root?.userData.proceduralBoneOffsets;
  const bones = root?.userData.bones;
  if (!offsets?.size || !bones) return;
  offsets.forEach((offset, boneName) => {
    const bone = bones[boneName];
    if (bone) bone.quaternion.multiply(offset.clone().invert());
  });
  offsets.clear();
}

function applyProceduralBoneRotation(root, boneName, x, y, z) {
  const bone = root?.userData.bones?.[boneName];
  if (!bone) return;
  const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
  bone.quaternion.multiply(offset);
  root.userData.proceduralBoneOffsets.set(boneName, offset);
}

function blendProceduralBoneToward(root, boneName, x, y, z, weight) {
  const bone = root?.userData.bones?.[boneName];
  const blend = THREE.MathUtils.clamp(weight, 0, 1);
  if (!bone || blend <= 0) return;
  const base = bone.quaternion.clone();
  const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
  bone.quaternion.slerp(target, blend);
  const offset = base.clone().invert().multiply(bone.quaternion);
  root.userData.proceduralBoneOffsets.set(boneName, offset);
}

function createFacePlane(width, height, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function createChamferedFacePlane(width, height, chamfer, color) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const cut = Math.min(chamfer, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + cut, -halfHeight);
  shape.lineTo(halfWidth - cut, -halfHeight);
  shape.lineTo(halfWidth, -halfHeight + cut);
  shape.lineTo(halfWidth, halfHeight - cut);
  shape.lineTo(halfWidth - cut, halfHeight);
  shape.lineTo(-halfWidth + cut, halfHeight);
  shape.lineTo(-halfWidth, halfHeight - cut);
  shape.lineTo(-halfWidth, -halfHeight + cut);
  shape.closePath();

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
}

function createPlayerFaceRig(root) {
  const head = root?.userData.bones?.head;
  if (!head) return null;

  const rig = new THREE.Group();
  rig.name = 'Ra_face_rig';

  const mouth = createChamferedFacePlane(0.094, 0.074, 0.015, '#281515');
  mouth.name = 'Ra_mouth';
  mouth.position.set(0, 0.105, 0.207);
  mouth.visible = false;
  rig.add(mouth);

  const mouthInner = createChamferedFacePlane(0.057, 0.032, 0.008, '#9b4941');
  mouthInner.name = 'Ra_mouth_inner';
  mouthInner.position.set(0, 0.093, 0.209);
  mouthInner.visible = false;
  rig.add(mouthInner);

  const leftBrow = createFacePlane(0.068, 0.015, '#5f3024');
  leftBrow.name = 'Ra_brow_left';
  leftBrow.position.set(-0.086, 0.247, 0.208);
  leftBrow.visible = false;
  rig.add(leftBrow);

  const rightBrow = createFacePlane(0.068, 0.015, '#5f3024');
  rightBrow.name = 'Ra_brow_right';
  rightBrow.position.set(0.086, 0.247, 0.208);
  rightBrow.visible = false;
  rig.add(rightBrow);

  head.add(rig);
  return { rig, mouth, mouthInner, leftBrow, rightBrow };
}

function createPlayerHelmetRig(root) {
  const head = root?.userData.bones?.head;
  const gltf = assets.get('wachthelm-ahnhoehe-mani-neufassung');
  if (!head || !gltf?.scene) return null;

  const helmetModel = SkeletonUtils.clone(gltf.scene);
  prepareModel(helmetModel);
  const helmetRoot = new THREE.Group();
  helmetRoot.name = 'Ra_Wachthelm_von_Ahnhoehe';
  helmetRoot.add(helmetModel);
  head.add(helmetRoot);
  helmetRoot.position.set(0, 0, 0);
  helmetRoot.rotation.set(0, 0, 0);
  helmetRoot.scale.setScalar(1);
  helmetRoot.visible = false;

  if (gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(helmetModel);
    gltf.animations
      .filter((clip) => clip.name.startsWith('Wachthelm_Rune_Pulse'))
      .forEach((clip) => mixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat, Infinity).play());
    mixers.push(mixer);
    helmetRoot.userData.mixer = mixer;
  }
  return helmetRoot;
}

function previewFaceProgress() {
  if (!equipmentOpen) return null;
  const action = currentEquipmentPreviewAction();
  const duration = action?.getClip().duration ?? 0;
  if (!duration) return null;
  return THREE.MathUtils.clamp(action.time / duration, 0, 1);
}

function attackFaceStrength() {
  let progress = null;
  if (equipmentOpen && EQUIPMENT_ANIMATION_PROFILES[selectedEquipmentAnimation]?.startsWith('attack')) {
    progress = previewFaceProgress();
  } else if (!equipmentOpen && playerAttackTimer > 0) {
    const attack = currentPlayerAttack();
    progress = attack ? currentPlayerAttackProgress(attack) : null;
  }
  if (progress === null) return 0;
  const phase = THREE.MathUtils.clamp((progress - 0.04) / 0.9, 0, 1);
  return Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 0.62);
}

function updatePlayerFace(delta) {
  if (!playerFaceRig) return;
  playerFaceHitTimer = Math.max(0, playerFaceHitTimer - delta);

  const previewProgress = selectedEquipmentAnimation === 'emote-no' ? previewFaceProgress() : null;
  const previewHit = previewProgress === null
    ? 0
    : Math.pow(Math.max(0, Math.sin(previewProgress * Math.PI)), 0.58);
  const hitStrength = Math.max(
    THREE.MathUtils.clamp(playerFaceHitTimer / PLAYER_FACE_HIT_DURATION, 0, 1),
    previewHit
  );
  const mouthStrength = Math.max(attackFaceStrength() * 0.92, hitStrength);
  const mouthVisible = mouthStrength > 0.035 && playerHealth > 0;

  playerFaceRig.mouth.visible = mouthVisible;
  playerFaceRig.mouthInner.visible = mouthStrength > 0.38 && playerHealth > 0;
  if (mouthVisible) {
    playerFaceRig.mouth.scale.set(
      THREE.MathUtils.lerp(0.76, 1.12, mouthStrength),
      THREE.MathUtils.lerp(0.12, 1, mouthStrength),
      1
    );
    playerFaceRig.mouth.position.y = 0.105 - mouthStrength * 0.008;
    playerFaceRig.mouthInner.scale.set(
      THREE.MathUtils.lerp(0.82, 1.04, mouthStrength),
      THREE.MathUtils.lerp(0.22, 1, mouthStrength),
      1
    );
  }

  const browsVisible = hitStrength > 0.025 && playerHealth > 0;
  playerFaceRig.leftBrow.visible = browsVisible;
  playerFaceRig.rightBrow.visible = browsVisible;
  if (browsVisible) {
    const lift = THREE.MathUtils.smoothstep(hitStrength, 0, 0.9);
    playerFaceRig.leftBrow.position.y = 0.247 + lift * 0.052;
    playerFaceRig.rightBrow.position.y = 0.247 + lift * 0.052;
    playerFaceRig.leftBrow.rotation.z = 0.08 + lift * 0.2;
    playerFaceRig.rightBrow.rotation.z = -0.08 - lift * 0.2;
  }
}

function selectNextPlayerIdleVariant() {
  const offset = 1 + Math.floor(Math.random() * (PLAYER_IDLE_VARIANTS.length - 1));
  playerIdleVariantIndex = (playerIdleVariantIndex + offset) % PLAYER_IDLE_VARIANTS.length;
  const variant = PLAYER_IDLE_VARIANTS[playerIdleVariantIndex];
  playerIdleVariantTimer = THREE.MathUtils.lerp(variant.minDuration, variant.maxDuration, Math.random());
  playerIdleVariantElapsed = 0;
}

function nearestIdleLookTarget() {
  if (!gameMode || !playerRoot) return null;
  return combatEnemies
    .filter((enemy) => enemy.active && enemy.alive
      && Math.abs(enemy.root.position.y - playerRoot.position.y) <= LEVEL_HEIGHT * 0.72)
    .map((enemy) => ({
      enemy,
      distance: horizontalDistanceBetween(enemy.root, playerRoot)
    }))
    .filter((candidate) => candidate.distance <= CELL * 5.5)
    .sort((a, b) => a.distance - b.distance)[0]?.enemy ?? null;
}

function previewIdleVariantId() {
  if (selectedEquipmentAnimation === 'idle-breathe') return 'breathe';
  if (selectedEquipmentAnimation === 'idle-look') return 'look';
  return selectedEquipmentAnimation === 'idle' ? 'calm' : null;
}

function hasArmSweepAngles(attack) {
  return Number.isFinite(attack?.armStartDeg) && Number.isFinite(attack?.armEndDeg);
}

function playerSickleMotionState() {
  if (!playerRoot) return null;
  if (equipmentOpen && HORIZONTAL_SWEEP_PROFILE_KEYS.includes(selectedEquipmentAnimation)
    && ['sword', 'spear'].includes(selectedEquipmentPart)) {
    const attack = ATTACK_SETS[selectedEquipmentPart]
      ?.find((entry) => entry.profile === selectedEquipmentAnimation);
    const action = currentEquipmentPreviewAction();
    const duration = action?.getClip().duration ?? 0;
    if (!attack || !duration) return null;
    return {
      progress: THREE.MathUtils.clamp(action.time / duration, 0, 1),
      direction: attack.sweepDirection ?? 1,
      reverse: Boolean(attack.reverseSweep),
      flach: Boolean(attack.horizontalSweep),
      einsatz: attack.chargeEnd ?? 0.04,
      profile: attack.profile,
      weapon: selectedEquipmentPart
    };
  }
  if (!equipmentOpen && playerAttackTimer > 0) {
    const attack = currentPlayerAttack();
    if (!hasArmSweepAngles(attack)) return null;
    return {
      progress: currentPlayerAttackProgress(attack),
      direction: attack.sweepDirection ?? 1,
      reverse: Boolean(attack.reverseSweep),
      flach: Boolean(attack.horizontalSweep),
      einsatz: attack.chargeEnd ?? 0.04,
      profile: attack.profile,
      weapon: equippedWeapon
    };
  }
  return null;
}

function sickleSweepProgress(progress, reverse = false) {
  const sweep = THREE.MathUtils.smoothstep(progress, 0.12, 0.88);
  return reverse ? 1 - sweep : sweep;
}

function updatePlayerProceduralPose(delta, elapsed) {
  if (!playerRoot?.userData.bones?.head) return;
  const previewVariant = equipmentOpen ? previewIdleVariantId() : null;
  const gameplayIdle = gameMode && !equipmentOpen && playerHealth > 0
    && playerRoot.userData.currentAnimation === 'idle'
    && playerAttackTimer <= 0 && playerDodgeTimer <= 0 && playerHookTimer <= 0
    && playerFallTimer <= 0 && playerLandingTimer <= 0 && playerRecoveryStunTimer <= 0
    && playerHurtTimer <= 0;
  const idle = Boolean(previewVariant || gameplayIdle);

  if (gameplayIdle) {
    if (!playerIdleActive) {
      playerIdleActive = true;
      playerIdleVariantIndex = 0;
      playerIdleVariantTimer = 2.4;
      playerIdleVariantElapsed = 0;
    }
    playerIdleVariantTimer -= delta;
    playerIdleVariantElapsed += delta;
    if (playerIdleVariantTimer <= 0) selectNextPlayerIdleVariant();
  } else if (!previewVariant) {
    playerIdleActive = false;
  }

  const variantId = previewVariant
    ?? (gameplayIdle ? PLAYER_IDLE_VARIANTS[playerIdleVariantIndex].id : null);
  let targetHeadYaw = 0;
  let targetHeadPitch = 0;
  let targetTorsoPitch = 0;
  let targetTorsoYaw = 0;
  let targetTorsoRoll = 0;
  let rightArmSweep = null;
  const sickleMotion = playerSickleMotionState();

  if (sickleMotion) {
    const swing = sickleSweepProgress(sickleMotion.progress, sickleMotion.reverse);
    const armProgress = THREE.MathUtils.smoothstep(sickleMotion.progress, 0.12, 0.88);
    const armConfig = horizontalSweepSettings[sickleMotion.weapon]?.[sickleMotion.profile];
    // Start und Ende beide auf 0 heisst: der Arm bleibt bei der Animation.
    const armAimed = Boolean(armConfig) && (armConfig.startDeg !== 0 || armConfig.endDeg !== 0);
    const armYaw = armAimed
      ? THREE.MathUtils.lerp(armConfig.startDeg, armConfig.endDeg, armProgress)
      : 0;
    // Beim Aufladeangriff faehrt der Arm erst nach der Aufladephase aus.
    const einsatz = sickleMotion.einsatz ?? 0.04;
    const reach = THREE.MathUtils.smoothstep(sickleMotion.progress, einsatz, einsatz + 0.12)
      * (1 - THREE.MathUtils.smoothstep(sickleMotion.progress, 0.9, 1));
    if (sickleMotion.flach) {
      targetTorsoYaw = sickleMotion.direction * THREE.MathUtils.lerp(-0.42, 0.5, swing);
      targetTorsoPitch = -Math.sin(swing * Math.PI) * 0.045;
      targetTorsoRoll = sickleMotion.direction * Math.sin(swing * Math.PI) * -0.075;
      targetHeadYaw = -targetTorsoYaw * 0.38;
    }
    if (armAimed) {
      rightArmSweep = {
        pitch: -0.08,
        yaw: THREE.MathUtils.degToRad(armYaw),
        roll: 0,
        weight: reach
      };
    }
  } else if (idle && variantId === 'calm') {
    targetHeadPitch = Math.sin(elapsed * 1.45) * 0.018;
    targetTorsoPitch = Math.sin(elapsed * 1.45 + 0.55) * 0.012;
  } else if (idle && variantId === 'breathe') {
    targetHeadYaw = Math.sin(elapsed * 0.72) * 0.055;
    targetHeadPitch = Math.sin(elapsed * 1.2 + 0.4) * 0.025;
    targetTorsoPitch = Math.sin(elapsed * 1.2) * 0.032;
    targetTorsoRoll = Math.sin(elapsed * 0.66) * 0.022;
  } else if (idle && variantId === 'look') {
    const target = nearestIdleLookTarget();
    if (target) {
      const toTarget = target.root.position.clone().sub(playerRoot.position);
      const targetFacing = Math.atan2(toTarget.x, toTarget.z);
      const relativeFacing = Math.atan2(
        Math.sin(targetFacing - playerRoot.rotation.y),
        Math.cos(targetFacing - playerRoot.rotation.y)
      );
      targetHeadYaw = THREE.MathUtils.clamp(relativeFacing, -0.62, 0.62);
      targetHeadPitch = THREE.MathUtils.clamp(toTarget.y * -0.08, -0.12, 0.12);
    } else {
      targetHeadYaw = Math.sin(elapsed * 0.82) * 0.46;
      targetHeadPitch = Math.sin(elapsed * 0.48 + 0.7) * 0.045;
    }
    targetTorsoRoll = Math.sin(elapsed * 0.55) * 0.012;
  }

  const blendSpeed = sickleMotion ? 10 : variantId === 'look' ? 5.4 : 3.8;
  const blend = 1 - Math.exp(-delta * blendSpeed);
  playerProceduralHeadYaw = THREE.MathUtils.lerp(playerProceduralHeadYaw, targetHeadYaw, blend);
  playerProceduralHeadPitch = THREE.MathUtils.lerp(playerProceduralHeadPitch, targetHeadPitch, blend);
  playerProceduralTorsoPitch = THREE.MathUtils.lerp(playerProceduralTorsoPitch, targetTorsoPitch, blend);
  playerProceduralTorsoYaw = THREE.MathUtils.lerp(playerProceduralTorsoYaw, targetTorsoYaw, blend);
  playerProceduralTorsoRoll = THREE.MathUtils.lerp(playerProceduralTorsoRoll, targetTorsoRoll, blend);

  applyProceduralBoneRotation(
    playerRoot,
    'head',
    playerProceduralHeadPitch,
    playerProceduralHeadYaw,
    0
  );
  applyProceduralBoneRotation(
    playerRoot,
    'torso',
    playerProceduralTorsoPitch,
    playerProceduralTorsoYaw,
    playerProceduralTorsoRoll
  );
  if (rightArmSweep) {
    blendProceduralBoneToward(
      playerRoot,
      'arm-right',
      rightArmSweep.pitch,
      rightArmSweep.yaw,
      rightArmSweep.roll,
      rightArmSweep.weight
    );
  }
}

function markerSettingsFor(name, roomId, supplied = {}) {
  const definition = BUILD_ASSET_DEFINITIONS[name]?.marker;
  const settings = { ...(definition?.settings ?? {}), ...(supplied ?? {}) };
  if (definition?.type === 'exit' && !settings.targetRoomId) {
    const currentIndex = roomDefinitions.findIndex((room) => room.id === roomId);
    settings.targetRoomId = roomDefinitions[currentIndex + 1]?.id
      ?? roomDefinitions.find((room) => room.id !== roomId)?.id
      ?? roomId;
  }
  return settings;
}

function spawnSystemMarker(name, x, z, y = 0, options = {}) {
  const definition = BUILD_ASSET_DEFINITIONS[name]?.marker;
  const roomId = options.roomId ?? activeEditorRoomId;
  const color = definition?.color ?? '#ffffff';
  const opacity = options.ghost ? 0.34 : 0.84;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const frame = new THREE.Group();
  const scale = Number(options.scale) || 1;
  const offsetX = THREE.MathUtils.clamp(Number(options.offsetX) || 0, -0.5, 0.5);
  const offsetZ = THREE.MathUtils.clamp(Number(options.offsetZ) || 0, -0.5, 0.5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.055, 8, 28), material);
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.07;
  frame.add(ring);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), material.clone());
  stem.position.y = 0.42;
  frame.add(stem);

  if (definition?.type === 'player-start' || definition?.type === 'exit') {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 4), material.clone());
    arrow.rotation.x = Math.PI * 0.5;
    arrow.position.set(0, 0.48, 0.27);
    frame.add(arrow);
  } else if (definition?.type === 'combat-trigger') {
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), material.clone());
    diamond.position.y = 0.83;
    frame.add(diamond);
  } else if (definition?.type === 'druckplatte') {
    const platte = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.09, 12), material.clone());
    platte.position.y = 0.13;
    frame.add(platte);
  } else if (definition?.type === 'schloss') {
    const riegel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.16), material.clone());
    riegel.position.y = 0.86;
    frame.add(riegel);
  } else {
    const arrival = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), material.clone());
    arrival.position.y = 0.82;
    frame.add(arrival);
  }

  const holder = new THREE.Group();
  holder.add(frame);
  frame.scale.setScalar(scale);
  holder.position.set((x + offsetX) * CELL, y, (z + offsetZ) * CELL);
  holder.rotation.y = options.rotation ?? 0;
  holder.renderOrder = 130;
  holder.userData.assetName = name;
  holder.userData.roomId = roomId;
  holder.userData.label = options.label ?? assetLabels[name] ?? name;
  holder.userData.detail = options.detail ?? 'Systemmarker - im Spiel unsichtbar';
  holder.userData.frame = frame;
  holder.userData.systemMarker = definition?.type ?? true;
  holder.userData.placement = {
    name,
    x,
    z,
    y,
    offsetX,
    offsetZ,
    rotation: options.rotation ?? 0,
    scale,
    label: options.label ?? null,
    detail: options.detail ?? null,
    animation: null,
    settings: markerSettingsFor(name, roomId, options.settings)
  };
  scene.add(holder);

  if (options.ghost) {
    holder.userData.isGhost = true;
    return holder;
  }

  holder.userData.editable = true;
  holder.visible = !gameMode && buildMode && roomId === activeEditorRoomId;
  pickableRoots.push(holder);
  editableRoots.push(holder);
  return holder;
}

function spawnModel(name, x, z, y = 0, options = {}) {
  const placementName = options.placementName ?? name;
  const gltf = assets.get(name);
  if (!gltf?.scene) throw new Error(`Modell nicht geladen: ${name}`);
  const model = SkeletonUtils.clone(gltf.scene);
  prepareModel(model);

  const holder = new THREE.Group();
  const frame = new THREE.Group();
  const scale = Number(options.scale) || 1;
  const offsetX = THREE.MathUtils.clamp(Number(options.offsetX) || 0, -0.5, 0.5);
  const offsetZ = THREE.MathUtils.clamp(Number(options.offsetZ) || 0, -0.5, 0.5);
  const baseModelScale = NATIVE_SCALE_MODELS.has(name) ? 1 : modelScale;
  // Achsenkorrektur, damit ein Bauteil auf ganze Zellen passt, ohne dass die
  // Editorskalierung ihre Bedeutung verliert.
  const achsen = options.achsen ?? BUILD_ASSET_DEFINITIONS[placementName]?.achsen ?? null;
  frame.add(model);
  const grund = baseModelScale * scale;
  if (achsen) {
    frame.scale.set(grund * (achsen.x ?? 1), grund * (achsen.y ?? 1), grund * (achsen.z ?? 1));
  } else {
    frame.scale.setScalar(grund);
  }
  holder.add(frame);
  scene.add(holder);
  holder.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(holder);
  const center = bounds.getCenter(new THREE.Vector3());
  const modelSize = bounds.getSize(new THREE.Vector3());
  const mountHeight = Number(options.mountHeight) || 0;
  frame.position.set(-center.x, -bounds.min.y, -center.z);
  frame.position.y += mountHeight;
  const gehflaeche = BUILD_ASSET_DEFINITIONS[placementName]?.begehbar;
  if (gehflaeche?.deckIstBoden) {
    frame.position.y -= gehflaeche.hoehe * grund * (achsen?.y ?? 1);
  }
  holder.position.set((x + offsetX) * CELL, y, (z + offsetZ) * CELL);
  holder.rotation.y = options.rotation ?? 0;
  holder.userData.assetName = placementName;
  holder.userData.roomId = options.roomId ?? activeEditorRoomId;
  holder.userData.label = options.label ?? assetLabels[placementName] ?? assetLabels[name] ?? placementName;
  holder.userData.detail = options.detail ?? 'Kenney Mini Dungeon - CC0';
  holder.userData.frame = frame;
  holder.userData.modelHeight = modelSize.y;
  holder.userData.baseModelHeight = modelSize.y / scale;
  holder.userData.baseModelScale = baseModelScale;
  holder.userData.mountHeight = mountHeight;
  holder.userData.bones = {
    head: model.getObjectByName('head') ?? null,
    torso: model.getObjectByName('torso') ?? null,
    'arm-right': model.getObjectByName('arm-right') ?? null
  };
  holder.userData.proceduralBoneOffsets = new Map();
  holder.userData.placement = {
    name: placementName,
    x,
    z,
    y,
    offsetX,
    offsetZ,
    rotation: options.rotation ?? 0,
    scale,
    label: options.label ?? null,
    detail: options.detail ?? null,
    animation: options.animation ?? null,
    settings: { ...(options.settings ?? {}) }
  };

  if (options.ghost) {
    holder.traverse((child) => {
      if (child.isLight) {
        child.visible = false;
        return;
      }
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.42;
        material.depthWrite = false;
        material.emissive?.set('#e7c56c');
        if (material.emissiveIntensity !== undefined) material.emissiveIntensity = 0.18;
      });
    });
    holder.userData.isGhost = true;
    return holder;
  }

  pickableRoots.push(holder);
  const editable = options.editable ?? !options.path;
  holder.userData.editable = editable;
  if (editable) {
    editableRoots.push(holder);
    holder.visible = holder.userData.roomId === activeEditorRoomId;
  }

  if (gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(model);
    const preferred = options.animation ?? 'idle';
    const simultaneousAnimations = Array.isArray(options.animations) ? options.animations : [];
    holder.userData.actions = new Map();
    gltf.animations.forEach((clip) => {
      holder.userData.actions.set(clip.name.toLowerCase(), mixer.clipAction(clip));
    });
    mixers.push(mixer);
    holder.userData.mixer = mixer;
    if (simultaneousAnimations.length) {
      simultaneousAnimations.forEach((name) => {
        const requested = String(name).toLowerCase();
        const action = holder.userData.actions.get(requested)
          ?? [...holder.userData.actions.entries()].find(([key]) => key.includes(requested))?.[1];
        if (!action) return;
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      });
    } else {
      playActorAnimation(holder, preferred);
    }
  }

  configureSpecialAssetRoot(holder, name);

  if (options.path) {
    movingActors.push({
      holder,
      path: options.path.map(([px, pz]) => new THREE.Vector3(px * CELL, y, pz * CELL)),
      speed: options.speed ?? 0.12,
      phase: options.phase ?? 0
    });
  }
  if (name === 'barrel') registerCombatDestructible(holder);
  if (name === 'trap') registerCombatTrap(holder);
  return holder;
}

function spawnBuildAsset(name, x, z, y = 0, options = {}) {
  const definition = BUILD_ASSET_DEFINITIONS[name];
  if (definition?.marker) return spawnSystemMarker(name, x, z, y, options);
  const root = spawnModel(buildAssetModelName(name), x, z, y, {
    ...options,
    placementName: name,
    scale: options.scale ?? definition?.scale,
    animation: options.animation ?? definition?.animation,
    animations: options.animations ?? definition?.animations,
    mountHeight: options.mountHeight ?? definition?.mountHeight,
    detail: options.detail ?? definition?.detail
  });
  if (definition?.grappleAnchor) root.userData.grappleAnchor = true;
  if (definition?.fallZone) {
    root.userData.fallZone = true;
    root.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach((material) => {
        material.color?.set('#17222a');
        material.emissive?.set('#071016');
        if (material.emissiveIntensity !== undefined) material.emissiveIntensity = 0.28;
      });
    });
  }
  if (!options.ghost && definition?.enemy) {
    const enemy = definition.enemy;
    const waves = roomWaves(root.userData.roomId);
    root.userData.placement.settings ??= {};
    if (!waves.some((wave) => wave.id === root.userData.placement.settings.waveId)) {
      root.userData.placement.settings.waveId = enemy.boss
        ? waves.find((wave) => wave.boss)?.id ?? waves[0]?.id
        : waves[0]?.id;
    }
    root.userData.placement.settings.spawnDelay = THREE.MathUtils.clamp(
      Number(root.userData.placement.settings.spawnDelay) || 0,
      0,
      20
    );
    registerCombatEnemy(root, enemy.name, enemy.health, enemy.coinReward, enemy.weapon, enemy.attackType, enemy);
  }
  return root;
}

function elevationStairHighPoint(root) {
  root.updateMatrixWorld(true);
  const highPoint = new THREE.Vector3(0, 0, -CELL * 0.54);
  root.localToWorld(highPoint);
  highPoint.y = root.position.y + LEVEL_HEIGHT;
  return highPoint;
}

function elevationEdgeHasStairOpening(edgeCenter, surfaceY, stairs) {
  return stairs.some((stair) => {
    const highPoint = elevationStairHighPoint(stair);
    return Math.abs(highPoint.y - surfaceY) <= LEVEL_HEIGHT * 0.28
      && Math.hypot(highPoint.x - edgeCenter.x, highPoint.z - edgeCenter.z) <= CELL * 0.58;
  });
}

function elevationSurfaceHasNeighbor(surface, direction, surfaces) {
  const expectedX = surface.position.x + direction.x * CELL;
  const expectedZ = surface.position.z + direction.z * CELL;
  return surfaces.some((candidate) => candidate !== surface
    && Math.abs(candidate.position.y - surface.position.y) <= LEVEL_HEIGHT * 0.12
    && Math.hypot(candidate.position.x - expectedX, candidate.position.z - expectedZ) <= CELL * 0.3);
}

function elevationSurfaceBaseY(surface, surfaces) {
  const below = surfaces
    .filter((candidate) => candidate !== surface
      && candidate.position.y < surface.position.y - LEVEL_HEIGHT * 0.35
      && Math.hypot(
        candidate.position.x - surface.position.x,
        candidate.position.z - surface.position.z
      ) <= CELL * 0.28)
    .sort((first, second) => second.position.y - first.position.y)[0];
  return below?.position.y ?? 0;
}

function addElevationBoundary(surface, direction, lowerY) {
  const upperY = surface.position.y - 0.07;
  const height = Math.max(CELL * 0.2, upperY - lowerY);
  const edgeCenter = new THREE.Vector3(
    surface.position.x + direction.x * CELL * 0.5,
    0,
    surface.position.z + direction.z * CELL * 0.5
  );
  const segment = new THREE.Group();
  segment.name = 'AhnhoeheStuetzmauer';
  segment.position.set(edgeCenter.x, 0, edgeCenter.z);
  segment.rotation.y = direction.x ? Math.PI * 0.5 : 0;
  segment.userData.roomId = surface.userData.roomId;
  segment.userData.derivedElevationBoundary = true;

  const panel = new THREE.Mesh(elevationWallGeometry, elevationWallMaterial);
  panel.position.y = lowerY + height * 0.5;
  panel.scale.y = height / (LEVEL_HEIGHT * 0.92);
  panel.castShadow = true;
  panel.receiveShadow = true;
  segment.add(panel);

  const cap = new THREE.Mesh(elevationCapGeometry, elevationTrimMaterial);
  cap.position.y = upperY - CELL * 0.035;
  cap.castShadow = true;
  cap.receiveShadow = true;
  segment.add(cap);

  [-0.38, 0.38].forEach((offset) => {
    const buttress = new THREE.Mesh(elevationButtressGeometry, elevationTrimMaterial);
    buttress.position.set(CELL * offset, lowerY + height * 0.46, 0);
    buttress.scale.y = height / LEVEL_HEIGHT;
    buttress.castShadow = true;
    buttress.receiveShadow = true;
    segment.add(buttress);
  });

  elevationBoundaryGroup.add(segment);
  elevationBarriers.push({
    roomId: surface.userData.roomId,
    x: edgeCenter.x,
    z: edgeCenter.z,
    minY: lowerY - 0.02,
    maxY: upperY,
    halfX: direction.x ? ELEVATION_BOUNDARY_DEPTH * 0.58 : CELL * 0.51,
    halfZ: direction.x ? CELL * 0.51 : ELEVATION_BOUNDARY_DEPTH * 0.58,
    visual: segment
  });
}

function setElevationBoundaryVisibility(roomId) {
  elevationBoundaryGroup.children.forEach((root) => {
    root.visible = root.userData.roomId === roomId;
  });
}

function rebuildElevationBoundaries() {
  elevationBoundaryGroup.clear();
  elevationBarriers.length = 0;
  const surfaces = editableRoots.filter((root) => ELEVATED_STONE_SURFACES.has(root.userData.assetName));
  const elevatedSurfaces = surfaces.filter((root) => root.position.y >= LEVEL_HEIGHT * 0.55);
  const directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];

  elevatedSurfaces.forEach((surface) => {
    const roomSurfaces = surfaces.filter((root) => root.userData.roomId === surface.userData.roomId);
    const stairs = editableRoots.filter((root) => root.userData.roomId === surface.userData.roomId
      && root.userData.assetName === 'stairs');
    const lowerY = elevationSurfaceBaseY(surface, roomSurfaces);
    directions.forEach((direction) => {
      if (elevationSurfaceHasNeighbor(surface, direction, roomSurfaces)) return;
      const edgeCenter = new THREE.Vector3(
        surface.position.x + direction.x * CELL * 0.5,
        surface.position.y,
        surface.position.z + direction.z * CELL * 0.5
      );
      if (elevationEdgeHasStairOpening(edgeCenter, surface.position.y, stairs)) return;
      addElevationBoundary(surface, direction, lowerY);
    });
  });

  setElevationBoundaryVisibility(gameMode ? roomIdForLevel(levelDirector.room) : activeEditorRoomId);
}

function elevationBoundaryBlocksPosition(position, radius, actorHeight, roomId) {
  const actorMinY = position.y;
  const actorMaxY = actorMinY + actorHeight;
  return elevationBarriers.some((barrier) => {
    if (barrier.roomId !== roomId || !barrier.visual.visible) return false;
    if (actorMaxY <= barrier.minY + 0.03 || actorMinY >= barrier.maxY - 0.03) return false;
    const closestX = Math.max(barrier.x - barrier.halfX, Math.min(position.x, barrier.x + barrier.halfX));
    const closestZ = Math.max(barrier.z - barrier.halfZ, Math.min(position.z, barrier.z + barrier.halfZ));
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  });
}

function addFloorPlan() {
  for (let z = -4; z <= 4; z += 1) {
    for (let x = -6; x <= 6; x += 1) {
      const cornerCut = Math.abs(x) + Math.abs(z) > 9;
      const streamCut = x >= 2 && x <= 3 && z >= -4 && z <= -1;
      if (cornerCut || streamCut) continue;
      const guidanceTile = x === 0 && z % 2 === 0;
      const detail = guidanceTile || (x + z * 2) % 7 === 0;
      spawnModel(detail ? 'floor-detail' : 'floor', x, z, 0, {
        rotation: detail ? Math.PI * 0.5 : 0,
        label: detail ? assetLabels['floor-detail'] : assetLabels.floor
      });
    }
  }

  for (let z = -3; z <= -1; z += 1) {
    for (let x = -2; x <= 1; x += 1) {
      spawnModel('floor', x, z, LEVEL_HEIGHT);
    }
  }

  for (let x = -6; x <= 6; x += 1) {
    if (x !== 0) spawnModel(x % 3 === 0 ? 'wall-opening' : 'wall', x, -5, 0, { rotation: Math.PI });
    if (x !== 0) spawnModel(x % 2 === 0 ? 'wall-half' : 'wall', x, 5, 0);
  }
  for (let z = -4; z <= 4; z += 1) {
    spawnModel(z % 2 === 0 ? 'wall-narrow' : 'wall', -7, z, 0, { rotation: Math.PI * 0.5 });
    spawnModel(z % 2 === 0 ? 'wall-half' : 'wall', 7, z, 0, { rotation: -Math.PI * 0.5 });
  }
}

function addArchitecture() {
  arenaGate = spawnModel('gate', 0, 5, 0, {
    rotation: Math.PI,
    detail: 'Südlicher Zugang zur Inselruine',
    editable: false
  });
  spawnModel('stairs', 0, 0, 0, { detail: 'Verbindet den Hof mit der erhöhten Plattform' });

  [[-2.5, -3.5], [1.5, -3.5], [-2.5, -0.5], [1.5, -0.5]].forEach(([x, z]) => {
    spawnModel('column', x, z, LEVEL_HEIGHT);
  });

  spawnModel('banner', -2.5, -3.45, LEVEL_HEIGHT + CELL * 0.36, { rotation: Math.PI });
  spawnModel('shield-rectangle', 1.48, -3.43, LEVEL_HEIGHT + CELL * 0.1, { rotation: Math.PI });
  spawnModel('shield-round', -2.48, -0.48, LEVEL_HEIGHT, { rotation: Math.PI * 0.5 });

  for (let z = -4; z <= -1; z += 1) {
    if (z === -2) continue;
    spawnModel('wood-structure', 2.5, z, -0.18, { rotation: Math.PI * 0.5 });
    spawnModel('wood-support', 2.5, z, -1.55, { rotation: Math.PI * 0.5 });
  }
  spawnBuildAsset('fall-zone', 2, -2, -0.42, { detail: 'Unterbrechung im alten Steg' });
  spawnBuildAsset('fall-zone', 3, -2, -0.42, { detail: 'Unterbrechung im alten Steg' });
  spawnBuildAsset('grapple-anchor', 4.35, -2, 0.72, {
    rotation: -Math.PI * 0.5,
    detail: 'Fester Zielpunkt fuer den Enterhaken'
  });
}

function createDefaultRoomLayout(baseLayout, roomId) {
  if (roomId === 'wachtschlucht') return createWachtschluchtLayout();
  const placements = JSON.parse(JSON.stringify(baseLayout));
  if (roomId === 'tiefe-wacht') {
    const roomOneDecor = new Set(['banner', 'shield-rectangle', 'shield-round']);
    return placements.filter((placement) => !roomOneDecor.has(placement.name));
  }
  if (roomId !== 'bruchkammer') return placements;

  const verticalArchitecture = new Set([
    'stairs',
    'column',
    'banner',
    'shield-rectangle',
    'shield-round',
    'wood-structure',
    'wood-support',
    'fall-zone',
    'grapple-anchor'
  ]);
  const arena = placements.filter((placement) => {
    if (verticalArchitecture.has(placement.name)) return false;
    return !(placement.name === 'floor' && Number(placement.y) > LEVEL_HEIGHT * 0.5);
  });
  for (let z = -4; z <= -1; z += 1) {
    for (let x = 2; x <= 3; x += 1) {
      arena.push({
        name: 'floor',
        x,
        z,
        y: 0,
        offsetX: 0,
        offsetZ: 0,
        rotation: 0,
        scale: 1,
        label: assetLabels.floor,
        detail: null,
        animation: null,
        settings: {}
      });
    }
  }
  return arena;
}

function createRoomPlacement(name, x, z, y = 0, options = {}) {
  return {
    name,
    x,
    z,
    y,
    offsetX: Number(options.offsetX) || 0,
    offsetZ: Number(options.offsetZ) || 0,
    rotation: Number(options.rotation) || 0,
    scale: Number(options.scale) || 1,
    label: options.label ?? assetLabels[name] ?? name,
    detail: options.detail ?? null,
    animation: options.animation ?? null,
    settings: { ...(options.settings ?? {}) }
  };
}

function createWachtschluchtLayout() {
  const placements = [];
  const add = (name, x, z, y = 0, options = {}) => {
    placements.push(createRoomPlacement(name, x, z, y, options));
  };

  for (let z = 1; z <= 4; z += 1) {
    for (let x = -5; x <= 5; x += 1) {
      const detail = (x === 0 && z % 2 === 0) || (x + z * 3) % 9 === 0;
      add(detail ? 'floor-detail' : 'floor', x, z, 0, {
        rotation: detail ? Math.PI * 0.5 : 0
      });
    }
  }

  for (let z = -4; z <= -1; z += 1) {
    for (let x = -5; x <= 5; x += 1) {
      const detail = (x === 0 && z % 2 === 0) || (x - z * 2) % 8 === 0;
      add(detail ? 'floor-detail' : 'floor', x, z, LEVEL_HEIGHT, {
        rotation: detail ? Math.PI * 0.5 : 0
      });
    }
  }

  for (let x = -5; x <= 5; x += 1) {
    add('fall-zone', x, 0, -LEVEL_HEIGHT * 1.15, {
      detail: 'Tiefe Schlucht zwischen den beiden Wachthoefen'
    });
  }

  for (let z = -4; z <= 4; z += 1) {
    const height = z <= -1 ? LEVEL_HEIGHT : 0;
    add(z % 2 === 0 ? 'wall-narrow' : 'wall', -6, z, height, {
      rotation: Math.PI * 0.5
    });
    add(z % 2 === 0 ? 'wall-half' : 'wall', 6, z, height, {
      rotation: -Math.PI * 0.5
    });
  }

  for (let x = -5; x <= 5; x += 1) {
    add(x === 0 ? 'wall-opening' : (x % 3 === 0 ? 'wall-half' : 'wall'), x, 5, 0);
    add(x === 0 ? 'wall-opening' : (x % 3 === 0 ? 'wall-half' : 'wall'), x, -5, LEVEL_HEIGHT, {
      rotation: Math.PI
    });
  }

  add('column', -3.15, 1.15, 0.12);
  add('column', 3.15, 1.15, 0.12);
  add('rocks', -4.35, 0.92, 0.04, { rotation: 0.42 });
  add('rocks', 4.35, 0.92, 0.04, { rotation: -0.38 });
  add('column', -3.15, -1.2, LEVEL_HEIGHT + 0.12);
  add('column', 3.15, -1.2, LEVEL_HEIGHT + 0.12);
  add('banner', -3.15, -4.72, LEVEL_HEIGHT + CELL * 1.08, { rotation: Math.PI });
  add('banner', 3.15, -4.72, LEVEL_HEIGHT + CELL * 1.08, { rotation: Math.PI });
  add('grapple-anchor', 0, -1.18, LEVEL_HEIGHT + 0.08, {
    rotation: Math.PI,
    scale: 1.08,
    detail: 'Wachtanker ueber der Schlucht - einziger Weg zum oberen Hof'
  });
  add('stones', -1.65, 2.25, 0.04, { rotation: 0.35 });
  add('stones', 1.75, -2.65, LEVEL_HEIGHT + 0.04, { rotation: -0.42 });
  add('barrel', -4.2, -3.1, LEVEL_HEIGHT + 0.15, { rotation: 0.2 });
  add('barrel', -3.55, -3.05, LEVEL_HEIGHT + 0.15, { rotation: -0.18 });

  return placements;
}

function addRoomTwoScenery() {
  const add = (name, x, z, y = 0, options = {}) => {
    const root = spawnBuildAsset(name, x, z, y, { ...options, roomId: 'tiefe-wacht' });
    roomTwoSceneryRoots.push(root);
  };
  add('wall-half', -4.8, 0.35, 0, { rotation: Math.PI * 0.5 });
  add('wall-half', 4.8, -0.25, 0, { rotation: Math.PI * 0.5 });
  add('column', -3.1, -2.45, 0.16);
  add('column', 3.1, -2.45, 0.16);
  add('wood-structure', 0, -2.75, -0.18, { rotation: Math.PI * 0.5 });
  add('rocks', -4.45, 1.35, 0.05, { rotation: -0.45 });
  add('barrel', -4.65, -1.8, 0.15, { rotation: -0.22 });
  add('barrel', -4.05, -1.75, 0.15, { rotation: 0.18 });
  add('stones', 4.65, 2.65, 0.05, { rotation: 0.4 });
  add('trap', 3.85, 0.4, 0.12, { rotation: Math.PI * 0.5 });
  add('banner', 0, -4.7, CELL * 1.08, { rotation: Math.PI });
  add('shield-rectangle', -3.08, -2.42, CELL * 0.82, { rotation: Math.PI * 0.5 });
  add('shield-round', 3.08, -2.42, CELL * 0.76, { rotation: -Math.PI * 0.5 });
}

function addRoomThreeScenery() {
  const add = (name, x, z, y = 0, options = {}) => spawnBuildAsset(name, x, z, y, {
    ...options,
    roomId: 'bruchkammer'
  });
  add('wall-half', -3.8, 0.2, 0, { rotation: Math.PI * 0.5 });
  add('wall-half', 3.8, 0.2, 0, { rotation: Math.PI * 0.5 });
  add('column', -3.15, -2.65, 0.16);
  add('column', 3.15, -2.65, 0.16);
  add('column', -3.15, 2.25, 0.16);
  add('column', 3.15, 2.25, 0.16);
  add('rocks', -5.1, -1.95, 0.05, { rotation: 0.7 });
  add('rocks', 5.0, 1.85, 0.05, { rotation: -0.5 });
  add('banner', 0, -4.72, CELL * 1.08, { rotation: Math.PI });
  add('wachtmal-ahnhoehe', 0, -3.55, 0.04, {
    detail: 'Das ruhende Wachtmal erwacht nach dem Sieg ueber den Hueter.'
  });
}

function addDefaultRoomEncounters() {
  const addEnemy = (roomId, name, x, z, rotation = 0, settings = {}, y = 0.18) => spawnBuildAsset(name, x, z, y, {
    roomId,
    rotation,
    settings
  });
  const addRewardChest = (roomId, x, z, rotation = 0, dropType = 'choice') => spawnBuildAsset('chest', x, z, 0.16, {
    roomId,
    rotation,
    detail: 'Belohnung dieses Raums',
    settings: {
      rewardChest: true,
      dropType,
      dropAmount: 5
    }
  });

  rewardChest = addRewardChest('wachhof', -3.65, -2.65, Math.PI * 0.18, 'helmet');
  addRewardChest('tiefe-wacht', -3.65, -2.65, Math.PI * 0.18, 'hook');
  addRewardChest('bruchkammer', -3.65, -2.65, Math.PI * 0.18, 'armband');
  addEnemy('wachhof', 'enemy-sword', -1.85, 0.65, -Math.PI * 0.7, { waveId: 'wachhof-welle-1' });
  addEnemy('wachhof', 'enemy-spear', 2.15, 0.95, -Math.PI * 0.75, { waveId: 'wachhof-welle-1', spawnDelay: 0.55 });
  addEnemy('wachhof', 'enemy-sword', -3.55, -1.15, Math.PI * 0.7, { waveId: 'wachhof-welle-2' });
  addEnemy('wachhof', 'enemy-spear', 3.15, -1.6, -Math.PI * 0.72, {
    waveId: 'wachhof-welle-2',
    spawnDelay: 0.65
  });

  addEnemy('tiefe-wacht', 'enemy-sword', -2.4, 0.8, -Math.PI * 0.65, { waveId: 'tiefe-wacht-welle-1' });
  addEnemy('tiefe-wacht', 'enemy-spear', 2.4, 0.6, Math.PI * 0.7, { waveId: 'tiefe-wacht-welle-1', spawnDelay: 0.6 });
  addEnemy('tiefe-wacht', 'enemy-sword', 0, -1.8, Math.PI, { waveId: 'tiefe-wacht-welle-2' });

  addEnemy('bruchkammer', 'enemy-boss', 0, 0.65, Math.PI, { waveId: 'bruchkammer-boss' });
  addEnemy('wachtschlucht', 'enemy-sword', -2.35, -2.35, Math.PI, {
    waveId: 'wachtschlucht-welle-1'
  }, LEVEL_HEIGHT + 0.18);
  addEnemy('wachtschlucht', 'enemy-spear', 2.55, -3.05, Math.PI * 0.85, {
    waveId: 'wachtschlucht-welle-1',
    spawnDelay: 0.62
  }, LEVEL_HEIGHT + 0.18);
  configureRewardChestRoot(rewardChest);
}

function addDefaultSystemMarkers() {
  spawnBuildAsset('marker-player-start', 0, 4, 0, {
    roomId: 'wachhof',
    rotation: Math.PI
  });
  spawnBuildAsset('marker-combat-trigger', 0, 2.85, 0, {
    roomId: 'wachhof',
    settings: { radius: CELL * 0.95 }
  });
  // Raetsel 01 "Das Gewicht der Wacht" - steht neben dem Hauptweg, damit ein
  // Fehler niemanden einsperrt. Wer das Tor oeffnen will, braucht das Fass.
  spawnBuildAsset('gate', 3.6, -2.6, 0, { roomId: 'wachhof', rotation: Math.PI * 0.5 });
  spawnBuildAsset('marker-schloss', 3.6, -2.6, 0, {
    roomId: 'wachhof',
    settings: { signal: 'tor-hof', wirkung: 'oeffnen', radius: CELL * 1.05 }
  });
  spawnBuildAsset('druckplatte-ahnhoehe', 3.6, -0.9, 0, {
    roomId: 'wachhof',
    settings: { signal: 'tor-hof', modus: 'halten', gewicht: 1, radius: CELL * 0.62 }
  });
  spawnBuildAsset('barrel', 2.5, -0.9, 0.15, { roomId: 'wachhof', rotation: 0.24 });

  spawnBuildAsset('marker-exit', 0, -4.05, 0, {
    roomId: 'wachhof',
    rotation: Math.PI,
    settings: { targetRoomId: 'tiefe-wacht', condition: 'clear', radius: CELL * 0.7 }
  });
  spawnBuildAsset('marker-arrival', 0, 4, 0, {
    roomId: 'tiefe-wacht',
    rotation: Math.PI
  });
  spawnBuildAsset('marker-combat-trigger', 0, 2.85, 0, {
    roomId: 'tiefe-wacht',
    settings: { radius: CELL * 0.95 }
  });
  spawnBuildAsset('marker-exit', 0, -4.05, 0, {
    roomId: 'tiefe-wacht',
    rotation: Math.PI,
    settings: { targetRoomId: 'bruchkammer', condition: 'clear', radius: CELL * 0.7 }
  });
  spawnBuildAsset('marker-arrival', 0, 4, 0, {
    roomId: 'bruchkammer',
    rotation: Math.PI
  });
  spawnBuildAsset('marker-combat-trigger', 0, 2.85, 0, {
    roomId: 'bruchkammer',
    settings: { radius: CELL * 0.95 }
  });
  spawnBuildAsset('marker-exit', 0, -4.05, 0, {
    roomId: 'bruchkammer',
    rotation: Math.PI,
    settings: { targetRoomId: 'wachtschlucht', condition: 'clear', radius: CELL * 0.7 }
  });
  spawnBuildAsset('marker-arrival', 0, 3.75, 0, {
    roomId: 'wachtschlucht',
    rotation: Math.PI
  });
  spawnBuildAsset('marker-combat-trigger', 0, -1.85, LEVEL_HEIGHT, {
    roomId: 'wachtschlucht',
    settings: { radius: CELL * 0.92 }
  });
  spawnBuildAsset('marker-exit', 0, -4.05, LEVEL_HEIGHT, {
    roomId: 'wachtschlucht',
    rotation: Math.PI,
    settings: { targetRoomId: 'wachhof', condition: 'clear', radius: CELL * 0.7 }
  });
}

// Hier stellst du die Enterhakenkette ein.
//   dicke        Skalierung quer zur Kette. Groesser = grobere, fettere Glieder.
//   laenge       Skalierung entlang der Kette. Nur anfassen, wenn die Glieder
//                gestreckt oder gestaucht aussehen sollen.
//   ueberlappung Wie weit ein Glied vorrueckt, als Anteil seiner eigenen Laenge.
//                Im Modell sind es 0.106 von 0.186, also 0.57. Kleiner = dichter.
//   maxGlieder   Muss die volle Hakenreichweite abdecken, sonst reisst die Kette
//                auf. Reichweite ist CELL * 5.8.
const HOOK_CHAIN = Object.freeze({
  dicke: 2.6,
  laenge: 1.6,
  ueberlappung: 0.57,
  maxGlieder: 88
});
// Das Glimmen zwischen den Gliedern. Es liegt hinter der Kette und dreht
// sich immer zur Kamera, damit es aus jedem Winkel gleich breit wirkt.
//   farbe   Grundton des Scheins
//   breite  Bandbreite in Weltmaß. Etwa doppelte Gliedbreite wirkt gut.
//   staerke Deckkraft in der Mitte
//   puls    Schwankung pro Sekunde, 0 schaltet sie ab
const HOOK_GLOW = Object.freeze({
  farbe: '#e8b169',
  breite: 0.34,
  staerke: 0.5,
  puls: 3.4
});
let hookChainPitch = 0.2;
let hookGlow = null;

function createPlayerHookVisuals() {
  const gltf = assets.get('enterhaken-ahnhoehe');
  if (!gltf) throw new Error('Enterhaken von Ahnhoehe wurde nicht geladen.');

  const model = SkeletonUtils.clone(gltf.scene);
  prepareModel(model);
  model.getObjectByName('Chain_Root')?.removeFromParent();
  model.getObjectByName('Hand_Chain_Ring')?.removeFromParent();
  model.getObjectByName('Hand_Grip')?.removeFromParent();

  hookTip = new THREE.Group();
  hookTip.name = 'Ra_Enterhaken';
  hookTip.add(model);
  scene.add(hookTip);
  hookTip.updateMatrixWorld(true);

  const impact = model.getObjectByName('Hook_Impact');
  if (impact) {
    const impactOffset = hookTip.worldToLocal(impact.getWorldPosition(new THREE.Vector3()));
    model.position.sub(impactOffset);
  }
  hookTip.scale.setScalar(0.94);
  hookTip.visible = false;

  const sourceModel = SkeletonUtils.clone(gltf.scene);
  prepareModel(sourceModel);
  hookChainRoot = new THREE.Group();
  hookChainRoot.name = 'Ra_Enterhaken_Kette';
  hookChainRoot.visible = false;
  scene.add(hookChainRoot);

  for (let index = 0; index < HOOK_CHAIN.maxGlieder; index += 1) {
    const sourceIndex = (index % 9) + 1;
    const source = sourceModel.getObjectByName(`Chain_Link_${String(sourceIndex).padStart(2, '0')}`);
    if (!source) continue;
    const link = source.clone(true);
    link.name = `Ra_Kettenglied_${String(index + 1).padStart(2, '0')}`;
    link.position.set(0, 0, 0);
    link.quaternion.identity();
    link.scale.set(
      link.scale.x * HOOK_CHAIN.dicke,
      link.scale.y * HOOK_CHAIN.laenge,
      link.scale.z * HOOK_CHAIN.dicke
    );
    link.userData.baseQuaternion = source.quaternion.clone();
    link.visible = false;
    hookChainRoot.add(link);
    hookChainLinks.push(link);
  }

  // Gliedabstand aus der wirklichen Gliedlaenge ableiten, nicht raten.
  const probe = hookChainLinks[0];
  if (probe) {
    probe.visible = true;
    probe.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(probe);
    probe.visible = false;
    const gliedLaenge = Math.max(box.max.y - box.min.y, 0.02);
    hookChainPitch = Math.max(0.04, gliedLaenge * HOOK_CHAIN.ueberlappung);
  }

  // Leuchtband statt Hilfslinie. Eine Linie waere immer genau ein Pixel
  // breit, egal wie weit sie entfernt ist.
  const glowGeometry = new THREE.PlaneGeometry(1, 1, 12, 2);
  const glowColor = new THREE.Color(HOOK_GLOW.farbe);
  const glowVertexColors = new Float32Array(glowGeometry.attributes.position.count * 3);
  const glowPos = glowGeometry.attributes.position;
  for (let index = 0; index < glowPos.count; index += 1) {
    const quer = 1 - Math.abs(glowPos.getY(index)) * 2;      // Rand dunkel
    const laengs = 1 - Math.abs(glowPos.getX(index)) * 0.55; // Enden weicher
    const wert = Math.max(0, quer) ** 1.6 * laengs;
    glowVertexColors[index * 3] = glowColor.r * wert;
    glowVertexColors[index * 3 + 1] = glowColor.g * wert;
    glowVertexColors[index * 3 + 2] = glowColor.b * wert;
  }
  glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowVertexColors, 3));
  hookGlow = new THREE.Mesh(glowGeometry, new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: HOOK_GLOW.staerke,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  }));
  hookGlow.frustumCulled = false;
  hookGlow.renderOrder = 18;
  hookGlow.visible = false;
  scene.add(hookGlow);

  const hookPositions = new Float32Array(6);
  const hookGeometry = new THREE.BufferGeometry();
  hookGeometry.setAttribute('position', new THREE.BufferAttribute(hookPositions, 3));
  hookLine = new THREE.Line(hookGeometry, new THREE.LineBasicMaterial({ visible: false }));
  hookLine.visible = false;
  hookLine.frustumCulled = false;
  scene.add(hookLine);
}

function updatePlayerHookVisuals(start, tip) {
  const chain = tip.clone().sub(start);
  const distance = chain.length();
  if (distance <= 0.001) return;
  const direction = chain.normalize();
  const alignToChain = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction
  );

  hookTip.position.copy(tip);
  hookTip.quaternion.copy(alignToChain);

  const visibleLinks = THREE.MathUtils.clamp(
    Math.ceil(distance / hookChainPitch),
    3,
    hookChainLinks.length
  );
  hookChainRoot.visible = true;
  hookChainLinks.forEach((link, index) => {
    const visible = index < visibleLinks;
    link.visible = visible;
    if (!visible) return;
    const progress = (index + 1) / (visibleLinks + 1);
    link.position.lerpVectors(start, tip, progress);
    link.position.y -= Math.sin(progress * Math.PI) * Math.min(0.12, distance * 0.012);
    link.quaternion.copy(alignToChain).multiply(link.userData.baseQuaternion);
  });

  const positions = hookLine.geometry.attributes.position;
  positions.setXYZ(0, start.x, start.y, start.z);
  positions.setXYZ(1, tip.x, tip.y, tip.z);
  positions.needsUpdate = true;

  if (hookGlow) {
    const mitte = start.clone().add(tip).multiplyScalar(0.5);
    const zurKamera = camera.position.clone().sub(mitte).normalize();
    const quer = new THREE.Vector3().crossVectors(direction, zurKamera);
    // Kette zeigt genau auf die Kamera: dann taugt jede Querachse.
    if (quer.lengthSq() < 1e-6) quer.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    quer.normalize();
    const normale = new THREE.Vector3().crossVectors(direction, quer).normalize();
    hookGlow.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(direction, quer, normale)
    );
    hookGlow.position.copy(mitte);
    hookGlow.scale.set(distance, HOOK_GLOW.breite, 1);
    const puls = HOOK_GLOW.puls > 0
      ? 1 + Math.sin(performance.now() * 0.001 * HOOK_GLOW.puls) * 0.16
      : 1;
    hookGlow.material.opacity = HOOK_GLOW.staerke * puls;
    hookGlow.visible = true;
  }
}

function addPropsAndActors() {
  roomOneSceneryRoots.push(spawnBuildAsset('wachtfackel-ahnhoehe-gelb', -4, -5, 0, {
    offsetZ: 0.5
  }));
  roomOneSceneryRoots.push(spawnBuildAsset('wachtfackel-ahnhoehe-blau', 4, -5, 0, {
    offsetZ: 0.5
  }));
  roomOneSceneryRoots.push(spawnModel('barrel', -5.2, -1.7, 0.15, { rotation: -0.18 }));
  roomOneSceneryRoots.push(spawnModel('barrel', -4.55, -1.65, 0.15, { rotation: 0.15 }));
  roomOneSceneryRoots.push(spawnModel('rocks', 5.5, 3.4, 0.05, { rotation: 0.4 }));
  roomOneSceneryRoots.push(spawnModel('stones', 4.4, 2.8, 0.05, { rotation: -0.7 }));
  roomOneSceneryRoots.push(spawnModel('dirt', 5.1, 1.9, 0.02, { scale: 1.35 }));
  roomOneSceneryRoots.push(spawnModel('trap', 3.9, -0.2, 0.12, { rotation: Math.PI * 0.5 }));

  playerRoot = spawnModel('character-human', 0, 4.0, 0.18, {
    animation: 'walk',
    label: 'Ra · Erkundung',
    detail: 'Animierte menschliche Figur',
    path: [[-1.2, 1.4], [1.2, 1.4], [1.2, 3.1], [-1.2, 3.1]],
    speed: 0.085
  });
  playerFaceRig = createPlayerFaceRig(playerRoot);
  playerHelmet = createPlayerHelmetRig(playerRoot);
  spawnModel('character-human', -0.8, -2.35, LEVEL_HEIGHT + ACTOR_GROUND_OFFSET, {
    animation: 'idle',
    label: 'Wächterin der Anhöhe',
    rotation: Math.PI
  });
  playerWeapon = spawnModel('weapon-sword', 0, 0, 0, {
    scale: 0.7,
    editable: false,
    label: 'Ras Schwert'
  });
  playerWeapon.visible = false;

  playerSpear = spawnModel('weapon-spear', 0, 0, 0, {
    scale: 0.76,
    editable: false,
    label: 'Ras Breschenspeer'
  });
  playerSpear.visible = false;

  playerShield = spawnModel('shield-round', 0, 0, 0, {
    scale: 0.72,
    editable: false,
    label: 'Ras Rundschild'
  });
  playerShield.visible = false;
  mountEquipment('sword', playerWeapon);
  mountEquipment('spear', playerSpear);
  mountEquipment('shield', playerShield);
  createPlayerHookEquipmentRig();
  equipmentBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8.5),
    new THREE.MeshBasicMaterial({ color: '#172124', side: THREE.DoubleSide })
  );
  equipmentBackdrop.visible = false;
  scene.add(equipmentBackdrop);

  chestBeacon = new THREE.Group();
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(0.54, 0.72, 28),
    new THREE.MeshBasicMaterial({
      color: '#f0d47b',
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  beaconRing.rotation.x = -Math.PI * 0.5;
  chestBeacon.add(beaconRing);
  const beaconLight = new THREE.PointLight('#f2cf70', 0, 5.5, 2);
  beaconLight.position.y = 1.0;
  chestBeacon.add(beaconLight);
  chestBeacon.position.set(0, 0.2, 0);
  chestBeacon.userData.ring = beaconRing;
  chestBeacon.userData.light = beaconLight;
  chestBeacon.userData.time = 0;
  chestBeacon.visible = false;
  scene.add(chestBeacon);

  exitBeacon = new THREE.Group();
  const exitRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.055, 8, 28),
    new THREE.MeshBasicMaterial({
      color: '#79d9d0',
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  );
  exitRing.position.y = 0.88;
  exitBeacon.add(exitRing);
  const exitGroundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.72, 28),
    new THREE.MeshBasicMaterial({
      color: '#e9d27a',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  exitGroundRing.rotation.x = -Math.PI * 0.5;
  exitGroundRing.position.y = 0.04;
  exitBeacon.add(exitGroundRing);
  const exitLight = new THREE.PointLight('#8ce7d9', 0, 5.8, 2);
  exitLight.position.y = 0.9;
  exitBeacon.add(exitLight);
  exitBeacon.userData.ring = exitRing;
  exitBeacon.userData.groundRing = exitGroundRing;
  exitBeacon.userData.light = exitLight;
  exitBeacon.userData.time = 0;
  exitBeacon.visible = false;
  scene.add(exitBeacon);

  createPlayerHookVisuals();
}

function mountEnemyWeapon(enemyRoot, assetName) {
  const bone = enemyRoot.userData.frame.getObjectByName('arm-right');
  if (!bone || !assets.has(assetName)) return null;

  const model = SkeletonUtils.clone(assets.get(assetName).scene);
  prepareModel(model);
  const holder = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(model);
  frame.scale.setScalar(modelScale * 0.7);
  holder.add(frame);
  holder.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(holder);
  const center = bounds.getCenter(new THREE.Vector3());
  frame.position.set(-center.x, -bounds.min.y, -center.z);

  const socket = new THREE.Group();
  socket.name = `${enemyRoot.userData.label}_weapon_socket`;
  if (assetName === 'weapon-spear') {
    socket.position.fromArray(EQUIPMENT_DEFAULTS.spear.position);
    socket.rotation.set(...EQUIPMENT_DEFAULTS.spear.rotation.map(THREE.MathUtils.degToRad));
    socket.scale.setScalar(1.18 / modelScale);
  } else {
    socket.position.set(-0.23, -0.02, 0.035);
    socket.rotation.set(...[94, 121, -35].map(THREE.MathUtils.degToRad));
    socket.scale.setScalar(1.35 / modelScale);
  }
  bone.add(socket);
  socket.add(holder);
  return { root: holder, socket, model, assetName };
}

function createEnemyAttackTelegraph(root, attackType = 'melee') {
  const boss = attackType === 'boss';
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: '#ff8a32',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(boss ? 0.68 : 0.5, boss ? 0.8 : 0.6, boss ? 40 : 28),
    material
  );
  ring.rotation.x = -Math.PI * 0.5;
  group.add(ring);
  if (attackType === 'ranged' || boss) {
    const aimLength = boss ? CELL * 5.2 : CELL * 3.35;
    const aimLine = new THREE.Mesh(new THREE.PlaneGeometry(boss ? 0.18 : 0.1, aimLength), material);
    aimLine.rotation.x = -Math.PI * 0.5;
    aimLine.position.z = aimLength * 0.5;
    aimLine.position.y = 0.015;
    group.add(aimLine);
    group.userData.aimLine = aimLine;
    aimLine.visible = attackType === 'ranged';
  }
  const light = new THREE.PointLight('#ff7138', 0, 3.2, 2);
  light.position.y = 0.42;
  group.add(light);
  group.position.y = -0.12;
  group.visible = false;
  group.userData.ring = ring;
  group.userData.material = material;
  group.userData.light = light;
  root.add(group);
  return group;
}

function createBossAura(root) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: BOSS_PHASE_COLORS[0],
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    toneMapped: false
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(BOSS_BODY_RADIUS * 1.2, 0.035, 6, 36), material);
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.07;
  group.add(ring);
  const light = new THREE.PointLight(BOSS_PHASE_COLORS[0], 1.2, CELL * 3.2, 2);
  light.position.y = 1.25;
  group.add(light);
  group.userData.material = material;
  group.userData.ring = ring;
  group.userData.light = light;
  root.add(group);
  return group;
}

function registerCombatEnemy(
  root,
  name,
  health,
  coinReward,
  weaponAsset = null,
  attackType = 'melee',
  profile = {}
) {
  const isBoss = Boolean(profile.boss);
  const baseBodyRadius = Number(profile.bodyRadius) || (isBoss ? BOSS_BODY_RADIUS : ENEMY_BODY_RADIUS);
  const enemy = {
    root,
    roomId: root.userData.editable ? root.userData.roomId : null,
    name,
    health,
    maxHealth: health,
    baseHealth: health,
    active: true,
    alive: true,
    attackCooldown: 0,
    attackTimer: 0,
    attackState: 'idle',
    attackConnected: false,
    attackType,
    isBoss,
    bodyRadius: baseBodyRadius,
    baseBodyRadius,
    basePlacementScale: Number(root.userData.placement?.scale) || 1,
    bossPhase: 1,
    bossAction: 'idle',
    bossActionTimer: 0,
    bossActionDuration: 0,
    bossActionCycle: 0,
    bossCooldown: isBoss ? 1.1 : 0,
    bossDirection: new THREE.Vector3(0, 0, 1),
    bossSpearShots: 0,
    bossSpearTimer: 0,
    bossTrailTimer: 0,
    formationRole: 'support',
    navigationPath: [],
    navigationIndex: 0,
    navigationTargetNodeId: null,
    navigationRepathTimer: 0,
    navigationUsingStairs: false,
    navigationStairRoot: null,
    orbitAngle: playerRoot
      ? Math.atan2(root.position.x - playerRoot.position.x, root.position.z - playerRoot.position.z)
      : 0,
    orbitDirection: root.id % 2 ? 1 : -1,
    hurtTimer: 0,
    coinReward,
    knockback: new THREE.Vector3(),
    spawn: root.position.clone(),
    roomOneSpawn: root.position.clone(),
    spawnRotation: root.rotation.y,
    roomOneRotation: root.rotation.y,
    telegraph: createEnemyAttackTelegraph(root, attackType),
    bossAura: isBoss ? createBossAura(root) : null,
    weapon: null
  };
  enemy.weapon = weaponAsset ? mountEnemyWeapon(root, weaponAsset) : null;
  if (isBoss) root.userData.detail = 'Bossgegner - 18 LP - 3 Kampfphasen';
  root.userData.combatEnemy = enemy;
  combatEnemies.push(enemy);
  return enemy;
}

function unregisterCombatEnemy(root) {
  const enemy = root?.userData.combatEnemy;
  if (!enemy) return;
  if (combatFormation.meleeLead === enemy) combatFormation.meleeLead = null;
  if (combatFormation.previousMeleeLead === enemy) combatFormation.previousMeleeLead = null;
  removeFromArray(combatEnemies, enemy);
  delete root.userData.combatEnemy;
}

function registerCombatDestructible(root) {
  const destructible = {
    root,
    frame: root.userData.frame,
    health: BARREL_MAX_HEALTH,
    maxHealth: BARREL_MAX_HEALTH,
    destroyed: false,
    hurtTimer: 0,
    hitDirection: new THREE.Vector3(),
    baseScale: root.userData.frame.scale.clone()
  };
  root.userData.combatDestructible = destructible;
  combatDestructibles.push(destructible);
  return destructible;
}

function unregisterCombatDestructible(root) {
  const destructible = root?.userData.combatDestructible;
  if (!destructible) return;
  removeFromArray(combatDestructibles, destructible);
  delete root.userData.combatDestructible;
}

function restoreCombatDestructible(destructible) {
  destructible.health = destructible.maxHealth;
  destructible.destroyed = false;
  destructible.hurtTimer = 0;
  const visibleRoom = gameMode ? roomIdForLevel(levelDirector.room) : activeEditorRoomId;
  destructible.root.visible = destructible.root.userData.roomId === visibleRoom;
  destructible.frame.rotation.set(0, 0, 0);
  destructible.frame.scale.copy(destructible.baseScale);
  setRootHitFlash(destructible.root, false);
}

function resetCombatDestructibles() {
  loesePlayerFass();
  loeseFelsSchub();
  leereSignalbrett();
  combatDestructibles.forEach(restoreCombatDestructible);
  if (gameMode && combatNavigationGraph) {
    rebuildCombatNavigation(roomIdForLevel(levelDirector.room));
  }
}

function normalizedTrapSettings(root) {
  const settings = root.userData.placement.settings ??= {};
  settings.damage = THREE.MathUtils.clamp(Math.round(Number(settings.damage) || TRAP_DEFAULTS.damage), 1, 6);
  settings.targets = ['both', 'player', 'enemies'].includes(settings.targets)
    ? settings.targets
    : TRAP_DEFAULTS.targets;
  settings.radius = THREE.MathUtils.clamp(Number(settings.radius) || TRAP_DEFAULTS.radius, 0.5, 6);
  settings.warning = THREE.MathUtils.clamp(Number(settings.warning) || TRAP_DEFAULTS.warning, 0.15, 2);
  settings.active = THREE.MathUtils.clamp(Number(settings.active) || TRAP_DEFAULTS.active, 0.08, 0.6);
  settings.cooldown = THREE.MathUtils.clamp(Number(settings.cooldown) || TRAP_DEFAULTS.cooldown, 0.4, 6);
  return settings;
}

function createTrapTelegraph(root) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: '#ffb13b',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 48), material);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.055;
  ring.renderOrder = 42;
  group.add(ring);
  const light = new THREE.PointLight('#ff8a32', 0, 3.8, 2);
  light.position.y = 0.45;
  group.add(light);
  group.visible = false;
  group.userData.material = material;
  group.userData.light = light;
  root.add(group);
  return group;
}

function syncCombatTrapSettings(root) {
  const trap = root?.userData.combatTrap;
  if (!trap) return;
  const settings = normalizedTrapSettings(root);
  trap.telegraph.scale.setScalar(settings.radius);
}

function registerCombatTrap(root) {
  const trap = {
    root,
    frame: root.userData.frame,
    state: 'idle',
    timer: 0,
    hitTargets: new Set(),
    baseFramePosition: root.userData.frame.position.clone(),
    baseFrameScale: root.userData.frame.scale.clone(),
    telegraph: createTrapTelegraph(root)
  };
  root.userData.combatTrap = trap;
  combatTraps.push(trap);
  syncCombatTrapSettings(root);
  return trap;
}

function unregisterCombatTrap(root) {
  const trap = root?.userData.combatTrap;
  if (!trap) return;
  removeFromArray(combatTraps, trap);
  delete root.userData.combatTrap;
}

function restoreCombatTrap(trap) {
  trap.state = 'idle';
  trap.timer = 0;
  trap.hitTargets.clear();
  trap.frame.position.copy(trap.baseFramePosition);
  trap.frame.scale.copy(trap.baseFrameScale);
  trap.telegraph.visible = false;
  trap.telegraph.userData.material.opacity = 0;
  trap.telegraph.userData.light.intensity = 0;
  syncCombatTrapSettings(trap.root);
}

function resetCombatTraps() {
  combatTraps.forEach(restoreCombatTrap);
}

function addWorldGeometry() {
  entranceLandscapeRoot = new THREE.Group();
  entranceLandscapeRoot.name = 'EntranceLandscape';
  scene.add(entranceLandscapeRoot);

  const entranceMaterial = new THREE.MeshStandardMaterial({ color: '#385949', roughness: 1 });
  const cliffMaterial = new THREE.MeshStandardMaterial({ color: '#343c3e', roughness: 0.94 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(19.2, 20.1, 1.65, 10), cliffMaterial);
  island.scale.z = 0.72;
  island.position.y = -1.52;
  island.receiveShadow = true;
  entranceLandscapeRoot.add(island);

  const entranceShape = new THREE.Shape();
  entranceShape.moveTo(-4.9, -2.8);
  entranceShape.lineTo(4.9, -2.8);
  entranceShape.lineTo(6.4, 2.8);
  entranceShape.lineTo(-6.4, 2.8);
  entranceShape.closePath();
  const entrancePlate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(entranceShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.18,
      bevelThickness: 0.12
    }),
    entranceMaterial
  );
  entrancePlate.rotation.x = Math.PI * 0.5;
  entrancePlate.position.set(0, -0.08, 11.1);
  entrancePlate.receiveShadow = true;
  entranceLandscapeRoot.add(entrancePlate);

  const waterGeometry = new THREE.PlaneGeometry(220, 220, 96, 96);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      deepColor: { value: new THREE.Color('#244d5e') },
      lightColor: { value: new THREE.Color('#5fa6a2') }
    },
    vertexShader: `
      uniform float time;
      varying float wave;
      varying vec3 worldPos;
      void main() {
        vec3 p = position;
        float a = sin(p.x * 0.34 + time * 0.75) * 0.10;
        float b = cos(p.y * 0.27 - time * 0.55) * 0.07;
        p.z += a + b;
        wave = a + b;
        worldPos = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 deepColor;
      uniform vec3 lightColor;
      varying float wave;
      varying vec3 worldPos;
      void main() {
        float bands = smoothstep(-0.12, 0.16, wave);
        vec3 color = mix(deepColor, lightColor, bands * 0.72);
        float glint = step(0.92, sin((worldPos.x + worldPos.z) * 1.45 + wave * 18.0));
        gl_FragColor = vec4(color + glint * 0.08, 1.0);
      }
    `,
    side: THREE.DoubleSide
  });
  water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI * 0.5;
  water.position.y = -2.28;
  scene.add(water);

  addVegetation(entranceLandscapeRoot);
  syncEntranceLandscapeVisibility();
  addRain();
}

function addVegetation(parent) {
  const grassGeometry = new THREE.ConeGeometry(0.12, 0.58, 4);
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#5d8f58', roughness: 1 });
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 84);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let i = 0; i < 180 && index < 84; i += 1) {
    const z = 8.55 + Math.random() * 5.1;
    const entranceProgress = (z - 8.55) / 5.1;
    const halfWidth = 4.45 + entranceProgress * 1.35;
    const x = (Math.random() - 0.5) * halfWidth * 2;
    if (Math.abs(x) < 1.65 || Math.abs(x) > halfWidth - 0.3) continue;
    dummy.position.set(x, 0.2, z);
    dummy.rotation.y = Math.random() * Math.PI;
    const scale = 0.65 + Math.random() * 0.75;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    grass.setMatrixAt(index, dummy.matrix);
    index += 1;
  }
  grass.count = index;
  grass.castShadow = true;
  grass.receiveShadow = true;
  parent.add(grass);

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#5b4230', roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#315e45', roughness: 0.92, flatShading: true });
  [[-5.35, 11.85], [5.35, 11.85]].forEach(([x, z], treeIndex) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 2.6, 6), trunkMaterial);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.62 + treeIndex * 0.06, 0), leafMaterial);
    crown.scale.y = 1.18;
    crown.position.y = 3.05;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, -0.08, z);
    parent.add(tree);
  });
}

function syncEntranceLandscapeVisibility() {
  const currentRoomId = roomIdForLevel(levelDirector.room);
  const visibleInCurrentContext = gameMode
    ? currentRoomId === 'wachhof'
    : entranceLandscapeVisible;
  if (entranceLandscapeRoot) entranceLandscapeRoot.visible = visibleInCurrentContext;
  entranceLandscapeToggle.setAttribute('aria-pressed', String(entranceLandscapeVisible));
  entranceLandscapeToggle.title = entranceLandscapeVisible ? 'Gruenflaeche ausblenden' : 'Gruenflaeche einblenden';
}

function setEntranceLandscapeVisible(visible) {
  entranceLandscapeVisible = Boolean(visible);
  syncEntranceLandscapeVisibility();
  setBuildStatus(entranceLandscapeVisible ? 'Gruenflaeche sichtbar' : 'Gruenflaeche ausgeblendet');
}

function addRain() {
  const count = 1700;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 58;
    positions[i * 3 + 1] = Math.random() * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 48;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#b7d6df', size: 0.055, transparent: true, opacity: 0.7 });
  rain = new THREE.Points(geometry, material);
  rain.visible = false;
  scene.add(rain);
}

function animateActors(elapsed) {
  if (gameMode) return;
  movingActors.forEach((actor) => {
    const count = actor.path.length;
    const travel = (elapsed * actor.speed + actor.phase) % 1;
    const scaled = travel * count;
    const index = Math.floor(scaled) % count;
    const nextIndex = (index + 1) % count;
    const t = scaled - Math.floor(scaled);
    const current = actor.path[index];
    const next = actor.path[nextIndex];
    actor.holder.position.lerpVectors(current, next, t);
    actor.holder.position.y = current.y;
    actor.holder.rotation.y = Math.atan2(next.x - current.x, next.z - current.z);
  });
}

function setRootHitFlash(root, enabled) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material.emissive) return;
      if (!material.userData.combatBaseEmissive) {
        material.userData.combatBaseEmissive = material.emissive.clone();
        material.userData.combatBaseIntensity = material.emissiveIntensity ?? 1;
      }
      if (enabled) {
        material.emissive.set('#9d2d21');
        material.emissiveIntensity = 1.7;
      } else {
        material.emissive.copy(material.userData.combatBaseEmissive);
        material.emissiveIntensity = material.userData.combatBaseIntensity;
      }
    });
  });
}

function showCombatMessage(text, duration = 1.4) {
  combatMessage.textContent = text;
  combatMessage.hidden = false;
  combatMessageTimer = duration;
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playTone(frequency, duration, volume, delay = 0, type = 'sine') {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function getSwordWhooshBuffer(context) {
  if (swordWhooshBuffer?.sampleRate === context.sampleRate) return swordWhooshBuffer;
  const length = Math.ceil(context.sampleRate * 0.5);
  swordWhooshBuffer = context.createBuffer(1, length, context.sampleRate);
  const samples = swordWhooshBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  return swordWhooshBuffer;
}

function playPitchDrop(from, to, duration, volume, delay = 0, type = 'triangle') {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.022, duration * 0.22));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playFilteredWhoosh(profile) {
  const context = ensureAudioContext();
  if (!context) return;
  const start = context.currentTime + profile.delay;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = getSwordWhooshBuffer(context);
  source.playbackRate.setValueAtTime(profile.rate, start);
  filter.type = profile.filter ?? 'bandpass';
  filter.Q.setValueAtTime(profile.q ?? 0.7, start);
  filter.frequency.setValueAtTime(profile.from, start);
  filter.frequency.exponentialRampToValueAtTime(profile.to, start + profile.duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(profile.volume, start + (profile.attack ?? 0.025));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + profile.duration);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(start);
  source.stop(start + profile.duration + 0.02);
}

function playSwordWhoosh(step) {
  const profiles = [
    { delay: 0.035, duration: 0.12, from: 1900, to: 520, volume: 0.03, rate: 1.48, q: 1.1, attack: 0.012 },
    { delay: 0.05, duration: 0.2, from: 1260, to: 210, volume: 0.044, rate: 1.02, q: 0.82 },
    { delay: 0.075, duration: 0.17, from: 2450, to: 680, volume: 0.038, rate: 1.36, q: 1.45, attack: 0.01 },
    { delay: 0.105, duration: 0.38, from: 980, to: 105, volume: 0.061, rate: 0.74, q: 0.62, filter: 'lowpass', attack: 0.035 },
    { delay: 0.015, duration: 0.27, from: 1380, to: 150, volume: 0.052, rate: 0.92, q: 0.72, attack: 0.022 },
    { delay: 0.015, duration: 0.46, from: 760, to: 68, volume: 0.072, rate: 0.62, q: 0.55, filter: 'lowpass', attack: 0.045 }
  ];
  playFilteredWhoosh(profiles[step] ?? profiles[0]);

  if (step === 0) {
    playTone(620, 0.055, 0.008, 0.045, 'triangle');
  } else if (step === 1) {
    playPitchDrop(230, 118, 0.15, 0.014, 0.075, 'triangle');
  } else if (step === 2) {
    playTone(980, 0.065, 0.011, 0.08, 'sine');
    playPitchDrop(310, 155, 0.11, 0.01, 0.105, 'triangle');
  } else if (step === 3) {
    playPitchDrop(142, 62, 0.22, 0.024, 0.145, 'triangle');
    playTone(92, 0.13, 0.014, 0.19, 'sine');
  } else if (step === 5) {
    playPitchDrop(112, 38, 0.34, 0.042, 0.17, 'sine');
    playPitchDrop(360, 94, 0.22, 0.018, 0.2, 'triangle');
  }
}

function playSpearWhoosh(step) {
  const profiles = [
    { delay: 0.035, duration: 0.13, from: 2200, to: 640, volume: 0.028, rate: 1.56, q: 1.25, attack: 0.01 },
    { delay: 0.05, duration: 0.18, from: 1760, to: 420, volume: 0.034, rate: 1.28, q: 1.05 },
    { delay: 0.065, duration: 0.2, from: 3100, to: 920, volume: 0.042, rate: 1.62, q: 1.6, filter: 'highpass', attack: 0.008 },
    { delay: 0.1, duration: 0.4, from: 1180, to: 150, volume: 0.052, rate: 0.78, q: 0.68, filter: 'lowpass', attack: 0.03 },
    { delay: 0.015, duration: 0.25, from: 1720, to: 260, volume: 0.044, rate: 1.12, q: 0.9, attack: 0.018 },
    { delay: 0.015, duration: 0.48, from: 920, to: 82, volume: 0.062, rate: 0.66, q: 0.58, filter: 'lowpass', attack: 0.04 }
  ];
  playFilteredWhoosh(profiles[step] ?? profiles[0]);

  if (step === 2) {
    playTone(1320, 0.08, 0.012, 0.075, 'triangle');
    playPitchDrop(420, 180, 0.13, 0.012, 0.12, 'sine');
  } else if (step === 3) {
    playPitchDrop(164, 72, 0.2, 0.019, 0.15, 'triangle');
  } else if (step === 5) {
    playPitchDrop(126, 44, 0.32, 0.034, 0.18, 'sine');
    playTone(740, 0.12, 0.012, 0.21, 'triangle');
  }
}

function playPlayerAttackSound(step, weapon = equippedWeapon) {
  if (step === 4) {
    playPlayerReturnSweepSound(weapon);
    return;
  }
  if (weapon === 'spear') playSpearWhoosh(step);
  else playSwordWhoosh(step);
}

function playPlayerReturnSweepSound(weapon = equippedWeapon) {
  if (weapon === 'spear') {
    playFilteredWhoosh({
      delay: 0.015,
      duration: 0.25,
      from: 1720,
      to: 260,
      volume: 0.044,
      rate: 1.12,
      q: 0.9,
      attack: 0.018
    });
    playPitchDrop(184, 78, 0.17, 0.018, 0.055, 'triangle');
    return;
  }
  playFilteredWhoosh({
    delay: 0.015,
    duration: 0.27,
    from: 1380,
    to: 150,
    volume: 0.052,
    rate: 0.92,
    q: 0.72,
    attack: 0.022
  });
  playPitchDrop(168, 66, 0.19, 0.022, 0.06, 'triangle');
}

function playCoinChime() {
  const context = ensureAudioContext();
  if (!context) return;
  if (context.currentTime - lastCoinSoundAt > 0.52) coinSoundStep = 0;
  const notes = [659.25, 739.99, 830.61, 987.77, 1108.73];
  const frequency = notes[Math.min(coinSoundStep, notes.length - 1)];
  playTone(frequency, 0.12, 0.035, 0, 'sine');
  playTone(frequency * 2, 0.07, 0.012, 0.015, 'triangle');
  coinSoundStep += 1;
  lastCoinSoundAt = context.currentTime;
}

function playChestChime() {
  [392, 523.25, 659.25].forEach((frequency, index) => {
    playTone(frequency, 0.42, 0.035, index * 0.11, 'triangle');
  });
}

function playRewardChime(weapon) {
  const root = weapon === 'spear' ? 293.66 : 329.63;
  [root, root * 1.25, root * 1.5].forEach((frequency, index) => {
    playTone(frequency, 0.3, 0.04, index * 0.07, 'triangle');
  });
}

function playBarrelImpactSound(lethal) {
  playTone(lethal ? 82 : 126, lethal ? 0.16 : 0.09, 0.028, 0, 'square');
  playTone(lethal ? 116 : 174, lethal ? 0.12 : 0.07, 0.018, 0.018, 'triangle');
}

function playWeaponReboundSound(weapon = equippedWeapon) {
  const root = weapon === 'spear' ? 880 : weapon === 'shield' ? 620 : 760;
  playTone(root, 0.085, 0.03, 0, 'triangle');
  playTone(root * 1.52, 0.06, 0.016, 0.014, 'square');
  playPitchDrop(root * 1.18, root * 0.68, 0.13, 0.018, 0.018, 'triangle');
}

function currentAttackSet() {
  return equippedWeapon === 'spear' ? SPEAR_ATTACKS : PLAYER_ATTACKS;
}

function currentPlayerAttack() {
  return playerSpecialAttack ?? currentAttackSet()[playerAttackStep];
}

function attackSpeedMultiplierFor(weapon, profile) {
  const tunedSpeed = THREE.MathUtils.clamp(
    Number(attackSpeedSettings[weapon]?.[profile]) || 1,
    0.55,
    1.6
  );
  return THREE.MathUtils.clamp(tunedSpeed * runProgress.attackSpeedMultiplier, 0.55, 2.2);
}

function attackFeelConfigFor(weapon, profile) {
  return attackFeelSettings[weapon]?.[profile]
    ?? ATTACK_FEEL_DEFAULTS[weapon]?.[profile]
    ?? null;
}

function attackHitWindowFor(attack, weapon = equippedWeapon) {
  const config = attackFeelConfigFor(weapon, attack?.profile);
  return {
    hitStart: config?.hitStart ?? attack?.hitStart ?? 0,
    hitEnd: config?.hitEnd ?? attack?.hitEnd ?? 1
  };
}

function attackRangeFor(attack, weapon = equippedWeapon) {
  const range = Number(attack?.range) || 0;
  const config = attackFeelConfigFor(weapon, attack?.profile);
  return range * (config?.rangeScale ?? 1);
}

function attackLungeFor(attack, weapon = equippedWeapon) {
  const lunge = Number(attack?.lunge) || 0;
  const config = attackFeelConfigFor(weapon, attack?.profile);
  return lunge * (config?.lungeScale ?? 1);
}

function attackImpactScaleFor(attack, weapon = equippedWeapon) {
  const config = attackFeelConfigFor(weapon, attack?.profile);
  return config?.impactScale ?? 1;
}

function playerAttackDamage(attack, { targetKind = 'enemy', isShieldBash = false } = {}) {
  if (isShieldBash) return Math.max(1, Math.round(SHIELD_BASH_ATTACK.damage ?? 1));
  const baseDamage = targetKind === 'destructible' && Number.isFinite(attack?.destructibleDamage)
    ? attack.destructibleDamage
    : Number(attack?.damage) || 1;
  let damage = baseDamage + runProgress.baseDamageBonus;
  if (attack?.finisher) damage += runProgress.finisherDamageBonus;
  if (equippedWeapon === 'sword' && swordEmpowered && Number.isFinite(attack?.empoweredDamageBonus)) {
    damage += attack.empoweredDamageBonus;
  }
  return Math.max(1, Math.round(damage));
}

function playerAttackKnockback(attack, { isShieldBash = false } = {}) {
  const baseKnockback = isShieldBash
    ? SHIELD_BASH_ATTACK.knockback
    : Number(attack?.knockback) || 0;
  return baseKnockback * runProgress.knockbackMultiplier;
}

function playerAttackImpactScale(attack, { isShieldBash = false } = {}) {
  const baseImpact = isShieldBash
    ? SHIELD_BASH_ATTACK.impactScale
    : attackImpactScaleFor(attack);
  return (baseImpact ?? 1) * runProgress.impactMultiplier;
}

function attackDurationFor(attack, weapon = equippedWeapon) {
  if (!attack) return 0;
  return attack.duration / attackSpeedMultiplierFor(weapon, attack.profile);
}

function currentPlayerAttackDuration(attack = currentPlayerAttack()) {
  return playerAttackActiveDuration > 0
    ? playerAttackActiveDuration
    : attackDurationFor(attack);
}

function currentPlayerAttackProgress(attack = currentPlayerAttack()) {
  const duration = currentPlayerAttackDuration(attack);
  if (!attack || duration <= 0) return 0;
  return THREE.MathUtils.clamp(1 - playerAttackTimer / duration, 0, 1);
}

function attackStepEnabled(weapon, step) {
  if (step === 0) return true;
  const profile = ATTACK_FX_PROFILE_KEYS[step];
  return attackSequenceSettings[weapon]?.[profile] !== false;
}

function enabledComboSteps(weapon = equippedWeapon) {
  const attacks = weapon === 'spear' ? SPEAR_ATTACKS : PLAYER_ATTACKS;
  const flow = comboFlowSettings[weapon];
  const order = flow?.order ?? COMBO_PROFILE_KEYS;
  return order
    .map((profile) => ATTACK_FX_PROFILE_KEYS.indexOf(profile))
    .filter((step) => step >= 0 && attacks[step] && !attacks[step].holdOnly
      && attackStepEnabled(weapon, step));
}

function firstEnabledAttackStep() {
  const steps = enabledComboSteps();
  if (!steps.length) return 0;
  if (comboFlowSettings[equippedWeapon]?.mode === 'random') {
    return steps[Math.floor(Math.random() * steps.length)];
  }
  return steps[0];
}

function nextEnabledAttackStep(fromStep) {
  const steps = enabledComboSteps();
  if (!steps.length) return 0;
  if (comboFlowSettings[equippedWeapon]?.mode === 'random') {
    const alternatives = steps.filter((step) => step !== fromStep);
    const candidates = alternatives.length ? alternatives : steps;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  const currentIndex = steps.indexOf(fromStep);
  return steps[(currentIndex + 1 + steps.length) % steps.length];
}

function comboPauseAfterStep(step, weapon = equippedWeapon) {
  const profile = ATTACK_FX_PROFILE_KEYS[step];
  return THREE.MathUtils.clamp(comboFlowSettings[weapon]?.pauses?.[profile] ?? 0, 0, 0.45);
}

function mountEquipment(part, model) {
  const boneName = part === 'shield' ? 'arm-left' : 'arm-right';
  const bone = playerRoot.userData.frame.getObjectByName(boneName);
  if (!bone) throw new Error(`Animierter Ausrüstungsknoten ${boneName} fehlt`);
  const socket = new THREE.Group();
  socket.name = `Ra_${part}_socket`;
  const motion = new THREE.Group();
  motion.name = `Ra_${part}_motion`;
  bone.add(socket);
  socket.add(motion);
  motion.add(model);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  equipmentSockets.set(part, { socket, motion, model, bone, boneName });
  applyEquipmentSocketTransform(part);
}

function createPlayerHookEquipmentRig() {
  hookEquipmentRig = new THREE.Group();
  hookEquipmentRig.name = 'Ra_Enterhaken_Rueckenrig';
  playerRoot.add(hookEquipmentRig);

  Object.keys(HOOK_STOW_TRANSFORMS).forEach((part) => {
    const socket = new THREE.Group();
    socket.name = `Ra_${part}_hook_back_socket`;
    hookEquipmentRig.add(socket);
    hookEquipmentSockets.set(part, socket);
    applyHookEquipmentSocketTransform(part);
  });
}

function hookPreviewWeapon() {
  if (equipmentOpen && ['sword', 'spear'].includes(selectedEquipmentPart)) {
    return selectedEquipmentPart;
  }
  return equippedWeapon === 'spear' ? 'spear' : 'sword';
}

function applyHookEquipmentSocketTransform(part) {
  const socket = hookEquipmentSockets.get(part);
  const transform = equipmentTransforms[part]?.hook ?? HOOK_STOW_TRANSFORMS[part];
  if (!socket || !transform) return;
  socket.position.fromArray(transform.position);
  socket.rotation.set(...transform.rotation.map(THREE.MathUtils.degToRad));
  socket.scale.setScalar(transform.scale);
}

function setPlayerHookEquipmentStowed(stowed) {
  const active = Boolean(stowed);
  if (!hookEquipmentRig) return;
  const activeWeapon = hookPreviewWeapon();
  if (playerEquipmentStowedForHook === active
    && (!active || playerHookStowedWeapon === activeWeapon)) return;

  playerEquipmentStowedForHook = active;
  playerHookStowedWeapon = active ? activeWeapon : null;

  ['sword', 'spear', 'shield'].forEach((part) => {
    const mounted = equipmentSockets.get(part);
    const backSocket = hookEquipmentSockets.get(part);
    if (!mounted || !backSocket) return;
    applyHookEquipmentSocketTransform(part);
    const target = active && (part === activeWeapon || part === 'shield')
      ? backSocket
      : mounted.motion;
    if (mounted.model.parent !== target) target.add(mounted.model);
    mounted.model.position.set(0, 0, 0);
    mounted.model.rotation.set(0, 0, 0);
    mounted.model.scale.set(1, 1, 1);
    if (!active) applyEquipmentSocketTransform(part);
  });
}

function equipmentProfileForAnimation(animationName) {
  return EQUIPMENT_ANIMATION_PROFILES[animationName] ?? 'base';
}

function equipmentClipForAnimation(animationName) {
  return EQUIPMENT_ANIMATION_CLIPS[animationName] ?? animationName;
}

function activeEquipmentProfile() {
  if (!equipmentOpen && playerEquipmentStowedForHook) return 'hook';
  if (!equipmentOpen && playerAttackTimer > 0) {
    const attackProfile = currentPlayerAttack()?.profile;
    if (attackProfile) return attackProfile;
  }
  const animationName = equipmentOpen
    ? selectedEquipmentAnimation
    : playerRoot?.userData.currentAnimation;
  return equipmentProfileForAnimation(animationName);
}

function applyEquipmentSocketTransform(part) {
  const mounted = equipmentSockets.get(part);
  const profile = activeEquipmentProfile();
  if (profile === 'hook') {
    applyHookEquipmentSocketTransform(part);
    return;
  }
  const transform = equipmentTransforms[part]?.[profile];
  if (!mounted || !transform) return;
  mounted.socket.position.fromArray(transform.position);
  mounted.socket.rotation.set(...transform.rotation.map(THREE.MathUtils.degToRad));
  mounted.socket.scale.setScalar(transform.scale / modelScale);
  mounted.motion.position.set(0, 0, 0);
  mounted.motion.rotation.set(0, 0, 0);
}

function disposeEquipmentSelectionHelper() {
  if (!equipmentSelectionHelper) return;
  scene.remove(equipmentSelectionHelper);
  equipmentSelectionHelper.geometry.dispose();
  equipmentSelectionHelper.material.dispose();
  equipmentSelectionHelper = null;
}

function updateEquipmentSelectionHelper() {
  disposeEquipmentSelectionHelper();
  if (!equipmentOpen) return;
  const mounted = equipmentSockets.get(selectedEquipmentPart);
  if (!mounted) return;
  equipmentSelectionHelper = new THREE.BoxHelper(mounted.model, '#e7c56c');
  equipmentSelectionHelper.material.depthTest = false;
  equipmentSelectionHelper.renderOrder = 20;
  scene.add(equipmentSelectionHelper);
}

function currentEquipmentPreviewAction() {
  return playerRoot?.userData.actions?.get(equipmentClipForAnimation(selectedEquipmentAnimation)) ?? null;
}

function equipmentPreviewBaseSpeed(name = selectedEquipmentAnimation) {
  if (name === 'hook') return 0.92;
  if (name === 'attack6') return 0.58;
  if (['attack4', 'attack5'].includes(name)) return 0.44;
  return 0.72;
}

function equipmentPreviewSpeed(name = selectedEquipmentAnimation) {
  const profile = equipmentProfileForAnimation(name);
  const multiplier = ['sword', 'spear'].includes(selectedEquipmentPart)
    && ATTACK_FX_PROFILE_KEYS.includes(profile)
    ? attackSpeedMultiplierFor(selectedEquipmentPart, profile)
    : 1;
  return equipmentPreviewBaseSpeed(name) * multiplier;
}

function applyEquipmentPreviewSpeed() {
  const action = currentEquipmentPreviewAction();
  if (action) action.setEffectiveTimeScale(equipmentPreviewSpeed());
}

function syncEquipmentPreviewControls() {
  if (!equipmentAnimationSelect || !equipmentPreviewToggle || !equipmentFrameSlider) return;
  equipmentAnimationSelect.value = selectedEquipmentAnimation;
  equipmentPreviewToggle.setAttribute('aria-pressed', String(equipmentPreviewPlaying));
  equipmentPreviewToggle.setAttribute('aria-label', equipmentPreviewPlaying
    ? 'Animationsvorschau pausieren'
    : 'Animationsvorschau abspielen');
  equipmentPreviewToggle.querySelector('[data-preview-icon="play"]')
    ?.toggleAttribute('hidden', equipmentPreviewPlaying);
  equipmentPreviewToggle.querySelector('[data-preview-icon="pause"]')
    ?.toggleAttribute('hidden', !equipmentPreviewPlaying);
}

function updateEquipmentPreviewTimeline() {
  if (!equipmentOpen || !equipmentFrameSlider || !equipmentFrameOutput) return;
  const action = currentEquipmentPreviewAction();
  const duration = action?.getClip().duration ?? 0;
  if (!duration) return;
  const progress = THREE.MathUtils.clamp(action.time / duration, 0, 1);
  if (equipmentPreviewPlaying) equipmentFrameSlider.value = String(progress);
  equipmentFrameOutput.textContent = `${Math.round(progress * 100)}%`;

  if (progress + 0.04 < equipmentPreviewFxLastProgress) {
    equipmentPreviewFxTriggered = false;
  }
  const profile = equipmentProfileForAnimation(selectedEquipmentAnimation);
  if (profile === 'attack6' && ['sword', 'spear'].includes(selectedEquipmentPart)) {
    const spinStart = 0.58;
    const spinProgress = THREE.MathUtils.clamp((progress - spinStart) / (1 - spinStart), 0, 1);
    const easedSpin = 1 - (1 - spinProgress) ** 3;
    playerRoot.rotation.y = equipmentPreviewBaseRotation + easedSpin * Math.PI * 2;
    const chargeProgress = progress < 0.66
      ? THREE.MathUtils.clamp(progress / 0.66, 0, 1)
      : THREE.MathUtils.clamp(1 - ((progress - 0.82) / 0.18), 0, 1);
    setPlayerWeaponChargeGlow(chargeProgress, chargeProgress > 0, selectedEquipmentPart);
  } else if (['attack4', 'attack5'].includes(profile)
    && ['sword', 'spear'].includes(selectedEquipmentPart)) {
    const glowProgress = Math.sin(Math.PI * progress) * (profile === 'attack5' ? 0.92 : 0.68);
    setPlayerWeaponChargeGlow(glowProgress, glowProgress > 0.03, selectedEquipmentPart);
  } else {
    playerRoot.rotation.y = equipmentPreviewBaseRotation;
    setPlayerWeaponChargeGlow(0, false);
  }
  const step = ATTACK_FX_PROFILE_KEYS.indexOf(profile);
  const fxTriggerProgress = profile === 'attack6' ? 0.62 : 0.18;
  if (step >= 0 && ATTACK_FX_DEFAULTS[selectedEquipmentPart]
    && !equipmentPreviewFxTriggered && progress >= fxTriggerProgress) {
    equipmentPreviewFxTriggered = true;
    playPlayerAttackSound(step, selectedEquipmentPart);
    spawnAttackArc(step, { preview: true, weapon: selectedEquipmentPart });
  }
  equipmentPreviewFxLastProgress = progress;
}

function setEquipmentPreviewAnimation(name) {
  if (!EQUIPMENT_PREVIEW_ANIMATIONS.has(name)) return;
  playerRoot.rotation.y = equipmentPreviewBaseRotation;
  selectedEquipmentAnimation = name;
  setPlayerHookEquipmentStowed(name === 'hook');
  equipmentPreviewPlaying = true;
  equipmentPreviewFxTriggered = false;
  equipmentPreviewFxLastProgress = 0;
  clearCombatEffectsByKind('equipment-fx-preview');
  playActorAnimation(playerRoot, equipmentClipForAnimation(name), {
    restart: true,
    speed: equipmentPreviewSpeed(name),
    fade: 0.06
  });
  const action = currentEquipmentPreviewAction();
  if (action) action.paused = false;
  if (equipmentFrameSlider) equipmentFrameSlider.value = '0';
  if (equipmentFrameOutput) equipmentFrameOutput.textContent = '0%';
  if (equipmentOpen) syncEquipmentControls();
  else syncEquipmentPreviewControls();
}

function setEquipmentPreviewPlaying(enabled) {
  equipmentPreviewPlaying = Boolean(enabled);
  const action = currentEquipmentPreviewAction();
  if (action) action.paused = !equipmentPreviewPlaying;
  syncEquipmentPreviewControls();
  updateEquipmentPreviewTimeline();
}

function setEquipmentPreviewProgress(progress) {
  const action = currentEquipmentPreviewAction();
  const duration = action?.getClip().duration ?? 0;
  if (!duration) return;
  setEquipmentPreviewPlaying(false);
  action.time = THREE.MathUtils.clamp(progress, 0, 0.9999) * duration;
  playerRoot.userData.mixer?.update(0);
  updateEquipmentSelectionHelper();
  updateEquipmentPreviewTimeline();
  refreshEquipmentFxPreview();
}

function equipmentControlValues() {
  const transform = equipmentTransforms[selectedEquipmentPart][activeEquipmentProfile()];
  return {
    px: transform.position[0], py: transform.position[1], pz: transform.position[2],
    rx: transform.rotation[0], ry: transform.rotation[1], rz: transform.rotation[2],
    scale: transform.scale
  };
}

function selectedAttackFxConfig() {
  if (!ATTACK_FX_DEFAULTS[selectedEquipmentPart]) return null;
  const profile = activeEquipmentProfile();
  if (!ATTACK_FX_PROFILE_KEYS.includes(profile)) return null;
  return attackFxSettings[selectedEquipmentPart][profile];
}

function syncAttackSequenceControl() {
  if (!equipmentAttackState || !equipmentAttackEnabledInput || !equipmentAttackStateLabel) return;
  const profile = activeEquipmentProfile();
  const weaponSelected = ['sword', 'spear'].includes(selectedEquipmentPart);
  const comboStep = weaponSelected && ['attack2', 'attack3', 'attack4', 'attack5'].includes(profile);
  const chargedAction = weaponSelected && profile === 'attack6';
  const configurable = comboStep || chargedAction;
  equipmentAttackState.hidden = !configurable;
  equipmentAttackEnabledInput.disabled = !configurable;
  equipmentAttackStateLabel.textContent = chargedAction ? 'Auflade-Aktion aktiv' : 'Kombostufe aktiv';
  equipmentAttackEnabledInput.checked = chargedAction
    ? chargedAttackSettings[selectedEquipmentPart]
    : comboStep ? attackSequenceSettings[selectedEquipmentPart][profile] : true;
}

function comboProfileLabel(profile) {
  return profile === 'attack4' ? 'H4'
    : profile === 'attack5' ? 'H5'
      : profile.replace('attack', '');
}

function syncComboFlowControls() {
  if (!comboFlowSection || !comboModeSelect || !comboPauseInput || !comboPauseOutput) return;
  const weaponSelected = ['sword', 'spear'].includes(selectedEquipmentPart);
  const profile = activeEquipmentProfile();
  const comboProfile = COMBO_PROFILE_KEYS.includes(profile);
  const flow = comboFlowSettings[selectedEquipmentPart];
  const applicable = weaponSelected && profile !== 'hook';
  comboFlowSection.hidden = !applicable;
  if (!applicable || !flow) return;

  comboModeSelect.value = flow.mode;
  comboPauseInput.disabled = !comboProfile;
  comboPauseInput.value = String(comboProfile ? flow.pauses[profile] : 0);
  comboPauseOutput.textContent = comboProfile ? `${flow.pauses[profile].toFixed(2)} s` : '–';
  comboOrderOutput.textContent = flow.order.map(comboProfileLabel).join(' → ');
  const orderIndex = flow.order.indexOf(profile);
  const orderEditable = comboProfile && flow.mode === 'fixed';
  comboMoveEarlierButton.disabled = !orderEditable || orderIndex <= 0;
  comboMoveLaterButton.disabled = !orderEditable || orderIndex < 0 || orderIndex >= flow.order.length - 1;
}

function moveSelectedComboProfile(offset) {
  const profile = activeEquipmentProfile();
  const flow = comboFlowSettings[selectedEquipmentPart];
  if (!flow || flow.mode !== 'fixed' || !COMBO_PROFILE_KEYS.includes(profile)) return;
  const from = flow.order.indexOf(profile);
  const to = THREE.MathUtils.clamp(from + offset, 0, flow.order.length - 1);
  if (from < 0 || from === to) return;
  [flow.order[from], flow.order[to]] = [flow.order[to], flow.order[from]];
  syncComboFlowControls();
  equipmentStatus.textContent = `Kombo: ${flow.order.map(comboProfileLabel).join(' → ')}`;
}

function selectedHorizontalSweepConfig() {
  if (!['sword', 'spear'].includes(selectedEquipmentPart)) return null;
  const profile = activeEquipmentProfile();
  if (!HORIZONTAL_SWEEP_PROFILE_KEYS.includes(profile)) return null;
  return horizontalSweepSettings[selectedEquipmentPart]?.[profile] ?? null;
}

function syncHorizontalSweepControls() {
  if (!horizontalSweepSection || !sweepArmStartInput || !sweepArmEndInput) return;
  const config = selectedHorizontalSweepConfig();
  horizontalSweepSection.hidden = !config;
  if (!config) return;
  sweepArmStartInput.value = String(config.startDeg);
  sweepArmEndInput.value = String(config.endDeg);
  sweepArmStartOutput.textContent = `${Math.round(config.startDeg)}°`;
  sweepArmEndOutput.textContent = `${Math.round(config.endDeg)}°`;
}

function updateHorizontalSweepSetting(key, value) {
  const config = selectedHorizontalSweepConfig();
  if (!config || !['startDeg', 'endDeg'].includes(key)) return;
  config[key] = THREE.MathUtils.clamp(value, -150, 150);
  syncHorizontalSweepControls();
  updatePlayerWeapon();
  equipmentSelectionHelper?.update();
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[activeEquipmentProfile()]} · Armwinkel angepasst`;
}

function selectedAttackSpeedProfile() {
  if (!['sword', 'spear'].includes(selectedEquipmentPart)) return null;
  const profile = activeEquipmentProfile();
  return ATTACK_FX_PROFILE_KEYS.includes(profile) ? profile : null;
}

function syncAttackSpeedControls() {
  if (!attackSpeedSection || !attackSpeedInput || !attackSpeedOutput) return;
  const profile = selectedAttackSpeedProfile();
  attackSpeedSection.hidden = !profile;
  if (!profile) return;
  const speed = attackSpeedMultiplierFor(selectedEquipmentPart, profile);
  attackSpeedInput.value = String(speed);
  attackSpeedOutput.textContent = `${speed.toFixed(2)}×`;
  applyEquipmentPreviewSpeed();
}

function updateAttackSpeedSetting(value) {
  const profile = selectedAttackSpeedProfile();
  if (!profile) return;
  const speed = THREE.MathUtils.clamp(value, 0.55, 1.6);
  attackSpeedSettings[selectedEquipmentPart][profile] = speed;
  syncAttackSpeedControls();
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[profile]} · ${speed.toFixed(2)}× Tempo`;
}

function selectedAttackFeelConfig() {
  const profile = selectedAttackSpeedProfile();
  if (!profile) return null;
  return attackFeelSettings[selectedEquipmentPart]?.[profile] ?? null;
}

function syncAttackFeelControls() {
  if (!attackFeelSection) return;
  const config = selectedAttackFeelConfig();
  attackFeelSection.hidden = !config;
  if (!config) return;
  document.querySelectorAll('[data-attack-feel-value]').forEach((input) => {
    const key = input.dataset.attackFeelValue;
    if (key === 'hitEnd') {
      input.min = String(THREE.MathUtils.clamp(config.hitStart + 0.08, 0.12, 0.95));
    }
    const value = config[key];
    input.value = String(value);
    const output = input.nextElementSibling;
    if (output) output.textContent = `${Math.round(value * 100)}%`;
  });
}

function updateAttackFeelSetting(key, value) {
  const config = selectedAttackFeelConfig();
  const profile = selectedAttackSpeedProfile();
  if (!config || !profile || !Number.isFinite(value)) return;
  const fallback = ATTACK_FEEL_DEFAULTS[selectedEquipmentPart]?.[profile] ?? config;
  const next = { ...config, [key]: value };
  attackFeelSettings[selectedEquipmentPart][profile] = normalizedAttackFeelConfig(next, fallback);
  syncAttackFeelControls();
  refreshEquipmentFxPreview();
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[profile]} - Kampfgefuehl angepasst`;
}

function syncAttackFxControls() {
  const config = selectedAttackFxConfig();
  if (!attackFxSection || !attackFxEnabledInput) return;
  attackFxEnabledInput.checked = Boolean(config?.enabled);
  attackFxEnabledInput.disabled = !config;
  if (attackFxColorInput) {
    attackFxColorInput.value = config?.color ?? '#ffbf32';
    attackFxColorInput.disabled = !config || !config.enabled;
  }
  attackFxSection.classList.toggle('is-disabled', !config || !config.enabled);
  document.querySelectorAll('[data-attack-fx-value]').forEach((input) => {
    const key = input.dataset.attackFxValue;
    const positionMap = { x: 0, y: 1, z: 2 };
    const value = config
      ? (positionMap[key] !== undefined ? config.position[positionMap[key]] : config[key])
      : Number.parseFloat(input.min);
    input.value = String(value);
    input.disabled = !config || !config.enabled;
    const output = input.nextElementSibling;
    if (key === 'rotation') output.textContent = `${Math.round(value)} deg`;
    else output.textContent = Number(value).toFixed(2);
  });
}

function selectedWeaponChargeGlowConfig() {
  if (!['sword', 'spear'].includes(selectedEquipmentPart)) return null;
  if (!['attack4', 'attack5', 'attack6'].includes(activeEquipmentProfile())) return null;
  return weaponChargeGlowSettings[selectedEquipmentPart];
}

function syncWeaponChargeGlowControls() {
  if (!weaponGlowSection || !weaponGlowEnabledInput) return;
  const config = selectedWeaponChargeGlowConfig();
  weaponGlowSection.hidden = !config;
  if (!config) {
    setPlayerWeaponChargeGlow(0, false);
    return;
  }

  if (weaponGlowLabel) {
    weaponGlowLabel.textContent = activeEquipmentProfile() === 'attack6'
      ? 'Ladeleuchten'
      : 'Schlagleuchten';
  }
  weaponGlowEnabledInput.checked = config.enabled;
  if (weaponGlowStartInput) {
    weaponGlowStartInput.value = config.startColor;
    weaponGlowStartInput.disabled = !config.enabled;
  }
  if (weaponGlowEndInput) {
    weaponGlowEndInput.value = config.endColor;
    weaponGlowEndInput.disabled = !config.enabled;
  }
  if (weaponGlowIntensityInput) {
    weaponGlowIntensityInput.value = String(config.intensity);
    weaponGlowIntensityInput.disabled = !config.enabled;
    weaponGlowIntensityInput.nextElementSibling.textContent = config.intensity.toFixed(2);
  }
  weaponGlowSection.classList.toggle('is-disabled', !config.enabled);
}

function refreshEquipmentFxPreview() {
  clearCombatEffectsByKind('equipment-fx-preview');
  const profile = activeEquipmentProfile();
  const step = ATTACK_FX_PROFILE_KEYS.indexOf(profile);
  if (!equipmentOpen || step < 0 || !ATTACK_FX_DEFAULTS[selectedEquipmentPart]) return;
  const attack = ATTACK_SETS[selectedEquipmentPart]?.[step];
  const sweepDirection = attack?.reverseSweep
    ? -(attack?.sweepDirection ?? 1)
    : attack?.sweepDirection;
  spawnAttackArc(step, { preview: true, weapon: selectedEquipmentPart, sweepDirection });
}

function updateAttackFxSetting(key, value) {
  const config = selectedAttackFxConfig();
  if (!config) return;
  const positionMap = { x: 0, y: 1, z: 2 };
  if (positionMap[key] !== undefined) config.position[positionMap[key]] = value;
  else if (key === 'rotation') config.rotation = THREE.MathUtils.clamp(value, -180, 180);
  else if (key === 'scale') config.scale = THREE.MathUtils.clamp(value, 0.3, 3);
  else if (key === 'opacity') config.opacity = THREE.MathUtils.clamp(value, 0.1, 1);
  else if (key === 'duration') config.duration = THREE.MathUtils.clamp(value, 0.12, 0.5);
  else if (key === 'gravity') config.gravity = THREE.MathUtils.clamp(value, -20, 20);
  else if (key === 'drift') config.drift = THREE.MathUtils.clamp(value, 0, 6);
  else if (key === 'fadeIn') config.fadeIn = THREE.MathUtils.clamp(value, 0, 0.4);
  else if (key === 'fadeOut') config.fadeOut = THREE.MathUtils.clamp(value, 0, 0.4);
  syncAttackFxControls();
  refreshEquipmentFxPreview();
}

function syncEquipmentControls(status = null) {
  const hookProfile = activeEquipmentProfile() === 'hook';
  const transformRanges = hookProfile
    ? {
        px: [-0.75, 0.75],
        py: [0, 1.35],
        pz: [-0.75, 0.75]
      }
    : {
        px: [-0.4, 0.4],
        py: [-0.45, 0.15],
        pz: [-0.4, 0.4]
      };
  Object.entries(transformRanges).forEach(([key, [min, max]]) => {
    const input = document.querySelector(`[data-equipment-value="${key}"]`);
    if (!input) return;
    input.min = String(min);
    input.max = String(max);
  });
  const values = equipmentControlValues();
  document.querySelectorAll('[data-equipment-value]').forEach((input) => {
    const key = input.dataset.equipmentValue;
    input.value = String(values[key]);
    const output = input.nextElementSibling;
    const suffix = key.startsWith('r') ? '°' : '';
    output.textContent = `${key.startsWith('r') ? Math.round(values[key]) : values[key].toFixed(2)}${suffix}`;
  });
  document.querySelectorAll('[data-equipment-part]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.equipmentPart === selectedEquipmentPart));
  });
  document.querySelectorAll('[data-equipment-view]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.equipmentView === selectedEquipmentView));
  });
  const mounted = equipmentSockets.get(selectedEquipmentPart);
  const profileLabel = EQUIPMENT_PROFILE_LABELS[activeEquipmentProfile()];
  equipmentStatus.textContent = status
    ?? `${EQUIPMENT_LABELS[selectedEquipmentPart]} · ${profileLabel} · ${mounted?.boneName ?? 'Arm'}`;
  syncEquipmentPreviewControls();
  syncAttackSequenceControl();
  syncComboFlowControls();
  syncHorizontalSweepControls();
  syncAttackSpeedControls();
  syncAttackFeelControls();
  syncAttackFxControls();
  syncWeaponChargeGlowControls();
  updatePlayerWeapon();
  updateEquipmentSelectionHelper();
}

function setEquipmentPart(part) {
  if (!EQUIPMENT_DEFAULTS[part]) return;
  selectedEquipmentPart = part;
  if (selectedEquipmentAnimation === 'hook') {
    playerEquipmentStowedForHook = false;
    playerHookStowedWeapon = null;
    setPlayerHookEquipmentStowed(true);
  }
  syncEquipmentControls();
  refreshEquipmentFxPreview();
}

function setEquipmentView(view) {
  if (!EQUIPMENT_VIEW_OFFSETS[view]) return;
  selectedEquipmentView = view;
  document.querySelectorAll('[data-equipment-view]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.equipmentView === selectedEquipmentView));
  });
}

function updateEquipmentTransform(key, value) {
  const transform = equipmentTransforms[selectedEquipmentPart][activeEquipmentProfile()];
  const map = { px: ['position', 0], py: ['position', 1], pz: ['position', 2], rx: ['rotation', 0], ry: ['rotation', 1], rz: ['rotation', 2] };
  if (key === 'scale') {
    // Die Groesse gehoert zum Gegenstand, nicht zur Pose. Ein Schwert wird
    // beim Zuschlagen nicht kleiner. Darum gilt der Wert fuer alle Profile,
    // sonst muss man ihn neunmal nachziehen.
    const groesse = THREE.MathUtils.clamp(value, 0.55, 1.45);
    EQUIPMENT_PROFILE_KEYS.forEach((profil) => {
      const eintrag = equipmentTransforms[selectedEquipmentPart]?.[profil];
      if (eintrag) eintrag.scale = groesse;
    });
  }
  else if (map[key]) transform[map[key][0]][map[key][1]] = value;
  applyEquipmentSocketTransform(selectedEquipmentPart);
  updatePlayerWeapon();
  equipmentSelectionHelper?.update();
}

function setEquipmentPreviewIsolation(enabled) {
  if (enabled) {
    equipmentSceneVisibility.clear();
    scene.children.forEach((object) => {
      if (object === playerRoot || object === equipmentBackdrop || object.isLight) return;
      equipmentSceneVisibility.set(object, object.visible);
      object.visible = false;
    });
    return;
  }

  equipmentSceneVisibility.forEach((visible, object) => {
    if (object.parent === scene) object.visible = visible;
  });
  equipmentSceneVisibility.clear();
}

function setEquipmentOpen(enabled) {
  equipmentOpen = Boolean(enabled
    && developerMode?.enabled
    && gameMode
    && !qaPanelOpen
    && !rewardOpen
    && !supplyOpen);
  equipmentPanel.hidden = !equipmentOpen;
  if (equipmentBackdrop) equipmentBackdrop.visible = equipmentOpen;
  setEquipmentPreviewIsolation(equipmentOpen);
  document.body.classList.toggle('equipment-open', equipmentOpen);
  if (equipmentOpen) {
    cancelPlayerAttackCharge();
    setPlayerShielding(false);
    cancelPlayerHook();
    playerAttackTimer = 0;
    playerAttackActiveDuration = 0;
    playerAttackSpeedMultiplier = 1;
    playerAttackQueued = false;
    playerAttackTransitionTimer = 0;
    playerAttackPendingStep = -1;
    playerInvulnerability = 0;
    playerHurtTimer = 0;
    playerKnockback.set(0, 0, 0);
    playerAttackLungeRemaining = 0;
    playerAttackTotalLunge = 0;
    equipmentPreviewBaseRotation = playerRoot.rotation.y;
    setRootHitFlash(playerRoot, false);
    attackButton.classList.remove('is-active');
    setEquipmentPreviewAnimation(selectedEquipmentAnimation);
    syncEquipmentControls();
    equipmentCloseButton.focus();
  } else {
    const previewAction = currentEquipmentPreviewAction();
    if (previewAction) previewAction.paused = false;
    equipmentPreviewPlaying = true;
    clearCombatEffectsByKind('equipment-fx-preview');
    setPlayerWeaponChargeGlow(0, false);
    setPlayerHookEquipmentStowed(false);
    playerRoot.rotation.y = equipmentPreviewBaseRotation;
    playActorAnimation(playerRoot, 'idle', { restart: true, fade: 0.08 });
    disposeEquipmentSelectionHelper();
    if (inventoryOpen) setInventoryOpen(false);
    updatePlayerWeapon();
  }
}

function resetSelectedEquipmentTransform() {
  const profile = activeEquipmentProfile();
  const defaults = profile === 'hook'
    ? HOOK_STOW_TRANSFORMS[selectedEquipmentPart]
    : EQUIPMENT_DEFAULTS[selectedEquipmentPart];
  equipmentTransforms[selectedEquipmentPart][profile] = cloneEquipmentTransform(defaults);
  const fxDefaults = ATTACK_FX_DEFAULTS[selectedEquipmentPart]?.[profile];
  if (fxDefaults) attackFxSettings[selectedEquipmentPart][profile] = cloneAttackFxConfig(fxDefaults);
  if (['attack4', 'attack5', 'attack6'].includes(profile)
    && WEAPON_CHARGE_GLOW_DEFAULTS[selectedEquipmentPart]) {
    weaponChargeGlowSettings[selectedEquipmentPart] = {
      ...WEAPON_CHARGE_GLOW_DEFAULTS[selectedEquipmentPart]
    };
  }
  if (['attack2', 'attack3', 'attack4', 'attack5'].includes(profile)
    && attackSequenceSettings[selectedEquipmentPart]) {
    attackSequenceSettings[selectedEquipmentPart][profile] = true;
  }
  if (HORIZONTAL_SWEEP_PROFILE_KEYS.includes(profile)
    && HORIZONTAL_SWEEP_DEFAULTS[selectedEquipmentPart]?.[profile]) {
    horizontalSweepSettings[selectedEquipmentPart][profile] = {
      ...HORIZONTAL_SWEEP_DEFAULTS[selectedEquipmentPart][profile]
    };
  }
  if (ATTACK_SPEED_DEFAULTS[selectedEquipmentPart]?.[profile] !== undefined) {
    attackSpeedSettings[selectedEquipmentPart][profile] = ATTACK_SPEED_DEFAULTS[selectedEquipmentPart][profile];
  }
  if (ATTACK_FEEL_DEFAULTS[selectedEquipmentPart]?.[profile]) {
    attackFeelSettings[selectedEquipmentPart][profile] = {
      ...ATTACK_FEEL_DEFAULTS[selectedEquipmentPart][profile]
    };
  }
  if (profile === 'attack6' && chargedAttackSettings[selectedEquipmentPart] !== undefined) {
    chargedAttackSettings[selectedEquipmentPart] = true;
  }
  refreshEquipmentFxPreview();
  applyEquipmentSocketTransform(selectedEquipmentPart);
  syncEquipmentControls(`${EQUIPMENT_LABELS[selectedEquipmentPart]} · ${EQUIPMENT_PROFILE_LABELS[profile]} zurückgesetzt`);
}

function combatSettingsPayload() {
  return {
    equipment: equipmentTransforms,
    attackFx: attackFxSettings,
    attackSequence: attackSequenceSettings,
    comboFlow: comboFlowSettings,
    chargedAttack: chargedAttackSettings,
    weaponGlow: weaponChargeGlowSettings,
    horizontalSweep: horizontalSweepSettings,
    attackSpeed: attackSpeedSettings,
    attackFeel: attackFeelSettings,
    combatTuning: serializeCombatTuning(combatTuningSettings)
  };
}

function persistCombatSettings() {
  return persistence.saveSettings(combatSettingsPayload());
}

function saveEquipmentTransforms() {
  persistCombatSettings();
  equipmentStatus.textContent = 'Sockets, Armwinkel, Tempo, Kampfgefuehl, Effekte und Kombo-Ablauf lokal gespeichert';
}

const COMBAT_LAB_ROOM_ID = 'wachhof';
const COMBAT_LAB_ENEMY_HEALTH = 12;

function selectedCombatLabProfile() {
  const profile = qaLabAttackSelect.value;
  return ATTACK_FX_PROFILE_KEYS.includes(profile) ? profile : 'attack1';
}

function setCombatLabOutput(input, value, format) {
  input.value = String(value);
  const output = document.getElementById(`${input.id}-output`);
  if (output) output.textContent = format(value);
}

function updateCombatLabMetrics() {
  const values = [
    combatLabStats.attacks,
    combatLabStats.hits,
    combatLabStats.received
  ];
  qaLabMetrics.querySelectorAll('strong').forEach((element, index) => {
    element.textContent = String(values[index] ?? 0);
  });
}

function resetCombatLabStats() {
  combatLabStats.attacks = 0;
  combatLabStats.hits = 0;
  combatLabStats.received = 0;
  updateCombatLabMetrics();
}

function syncCombatLabControls(message = '') {
  if (!qaLabAttackSelect.options.length) {
    PLAYER_ATTACKS.forEach((attack) => {
      const option = document.createElement('option');
      option.value = attack.profile;
      option.textContent = EQUIPMENT_PROFILE_LABELS[attack.profile] ?? attack.profile;
      qaLabAttackSelect.append(option);
    });
  }

  const profile = selectedCombatLabProfile();
  qaLabAttackSelect.value = profile;
  const feel = attackFeelSettings.sword[profile];
  qaLabPlayerInputs.forEach((input) => {
    const key = input.dataset.combatLabPlayer;
    if (key === 'speed') {
      setCombatLabOutput(input, attackSpeedSettings.sword[profile], (value) => `${value.toFixed(2)}x`);
    } else if (key === 'comboPause') {
      const enabled = COMBO_PROFILE_KEYS.includes(profile);
      input.disabled = !enabled;
      setCombatLabOutput(
        input,
        enabled ? comboFlowSettings.sword.pauses[profile] : 0,
        (value) => enabled ? `${value.toFixed(2)} s` : '-'
      );
    } else {
      const value = feel[key];
      setCombatLabOutput(
        input,
        value,
        (number) => ['rangeScale', 'lungeScale', 'impactScale'].includes(key)
          ? `${Math.round(number * 100)}%`
          : `${Math.round(number * 100)}%`
      );
    }
  });

  qaLabImpactInputs.forEach((input) => {
    const value = combatTuningSettings.impact[input.dataset.combatLabImpact];
    setCombatLabOutput(input, value, (number) => `${number.toFixed(2)}x`);
  });
  qaLabEnemyInputs.forEach((input) => {
    const key = input.dataset.combatLabEnemy;
    const value = combatTuningSettings.meleeEnemy[key];
    setCombatLabOutput(
      input,
      value,
      (number) => key.endsWith('Scale') ? `${Math.round(number * 100)}%` : `${number.toFixed(2)} s`
    );
  });

  qaLabState.textContent = combatLabActive ? 'Duell aktiv' : 'Bereit';
  qaLabState.classList.toggle('is-active', combatLabActive);
  qaLabToggle.setAttribute('aria-pressed', String(combatLabActive));
  qaLabToggle.querySelector('span').textContent = combatLabActive ? 'Labor verlassen' : 'Duell starten';
  qaLabResetDuel.disabled = !combatLabActive;
  updateCombatLabMetrics();
  if (message) qaStatus.textContent = message;
}

function updateCombatLabPlayerSetting(input) {
  const profile = selectedCombatLabProfile();
  const key = input.dataset.combatLabPlayer;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  if (key === 'speed') {
    attackSpeedSettings.sword[profile] = THREE.MathUtils.clamp(value, 0.55, 1.6);
  } else if (key === 'comboPause') {
    if (COMBO_PROFILE_KEYS.includes(profile)) {
      comboFlowSettings.sword.pauses[profile] = THREE.MathUtils.clamp(value, 0, 0.45);
    }
  } else {
    const current = attackFeelSettings.sword[profile];
    const fallback = ATTACK_FEEL_DEFAULTS.sword[profile];
    attackFeelSettings.sword[profile] = normalizedAttackFeelConfig({
      ...current,
      [key]: value
    }, fallback);
  }
  syncCombatLabControls(`${EQUIPMENT_PROFILE_LABELS[profile]} angepasst`);
}

function updateCombatLabTuningSetting(input, group, dataKey) {
  const key = input.dataset[dataKey];
  if (!key) return;
  const next = createCombatTuning({
    ...combatTuningSettings,
    [group]: {
      ...combatTuningSettings[group],
      [key]: Number(input.value)
    }
  });
  Object.assign(combatTuningSettings[group], next[group]);
  syncCombatLabControls(group === 'impact' ? 'Trefferwirkung angepasst' : 'Ork-Rhythmus angepasst');
}

function combatLabAnchor() {
  return new THREE.Vector3(CELL * 2.3, ACTOR_GROUND_OFFSET, CELL * 1.05);
}

function placeCombatLabActors(enemy) {
  const anchor = combatLabAnchor();
  playerRoot.position.copy(anchor).add(new THREE.Vector3(0, 0, CELL * 0.28));
  playerRoot.rotation.y = Math.PI;
  snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
  lastMoveDirection.set(0, 0, -1);
  rememberPlayerSafePosition();

  enemy.root.position.copy(anchor).add(new THREE.Vector3(0, 0, -CELL * 0.28));
  enemy.root.rotation.y = 0;
  snapActorToCombatSurface(enemy.root, { allowAnyHeight: true });
  enemy.navigationPath = [];
  enemy.navigationIndex = 0;
  enemy.formationRole = 'lead';
  enemy.orbitAngle = Math.PI;

  combatCameraLead.set(0, 0, 0);
  combatCameraFocus.copy(playerRoot.position).add(COMBAT_CAMERA_TARGET_OFFSET);
  camera.position.copy(playerRoot.position).add(followOffset);
  camera.lookAt(combatCameraFocus);
}

function resetCombatLabDuel({ resetStats = false, announce = true } = {}) {
  if (!combatLabActive) return;
  const enemy = combatLabEnemy
    ?? combatEnemies.find((candidate) => candidate.roomId === COMBAT_LAB_ROOM_ID
      && candidate.attackType === 'melee'
      && !candidate.isBoss);
  if (!enemy) {
    syncCombatLabControls('Kein Schwert-Ork im Wachhof gefunden');
    return;
  }
  combatLabEnemy = enemy;
  combatLabRespawnTimer = 0;
  if (resetStats) resetCombatLabStats();
  clearCombatEffects();
  clearLootDrops();
  combatEnemies.forEach((candidate) => resetEnemyForWave(candidate, false));
  resetEnemyForWave(enemy, true);
  enemy.maxHealth = COMBAT_LAB_ENEMY_HEALTH;
  enemy.health = COMBAT_LAB_ENEMY_HEALTH;
  enemy.attackCooldown = 0.65;
  playerHealth = playerMaxHealth();
  playerStamina = 1;
  playerInvulnerability = 0.35;
  playerHurtTimer = 0;
  playerKnockback.set(0, 0, 0);
  playerAttackTimer = 0;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerAttackQueued = false;
  cancelPlayerAttackCharge({ restoreAnimation: false });
  setPlayerShielding(false);
  cancelPlayerHook();
  playActorAnimation(playerRoot, 'idle', { restart: true, fade: 0.04 });
  placeCombatLabActors(enemy);
  combatFormation.meleeLead = enemy;
  combatFormation.previousMeleeLead = null;
  waveDirector.state = WAVE_STATES.ACTIVE;
  waveDirector.currentWaveIndex = 0;
  waveDirector.pendingSpawns = [];
  waveDirector.completionKind = 'exit';
  setArenaGate(false, true);
  setRoomRootVisibility(COMBAT_LAB_ROOM_ID);
  updateWaveHud();
  updateCombatHud();
  updatePlayerWeapon();
  if (announce) showCombatMessage('KAMPFLABOR: SCHWERT-ORK', 1.2);
  syncCombatLabControls('Werte aendern, Panel schliessen und direkt pruefen');
}

function startCombatLab() {
  resetCombatState(COMBAT_LAB_ROOM_ID, { preserveRun: true });
  combatLabActive = true;
  combatLabEnemy = null;
  resetCombatLabStats();
  roomMusic.startCombat({ boss: false });
  resetCombatLabDuel({ resetStats: true });
}

function stopCombatLab() {
  combatLabActive = false;
  combatLabEnemy = null;
  combatLabRespawnTimer = 0;
  resetCombatState(COMBAT_LAB_ROOM_ID, { preserveRun: true });
  roomMusic.playExplore(COMBAT_LAB_ROOM_ID);
  syncCombatLabControls('Kampflabor beendet');
}

function updateCombatLab(delta) {
  if (!combatLabActive || !combatLabEnemy) return;
  if (combatLabEnemy.alive) return;
  combatLabRespawnTimer = Math.max(0, combatLabRespawnTimer - delta);
  if (combatLabRespawnTimer <= 0) resetCombatLabDuel({ announce: false });
}

function resetCombatLabDefaults() {
  const profile = selectedCombatLabProfile();
  attackSpeedSettings.sword[profile] = ATTACK_SPEED_DEFAULTS.sword[profile];
  attackFeelSettings.sword[profile] = { ...ATTACK_FEEL_DEFAULTS.sword[profile] };
  if (COMBO_PROFILE_KEYS.includes(profile)) {
    comboFlowSettings.sword.pauses[profile] = COMBO_FLOW_DEFAULTS.sword.pauses[profile];
  }
  const defaults = createCombatTuning(COMBAT_TUNING_DEFAULTS);
  Object.assign(combatTuningSettings.impact, defaults.impact);
  Object.assign(combatTuningSettings.meleeEnemy, defaults.meleeEnemy);
  syncCombatLabControls(`${EQUIPMENT_PROFILE_LABELS[profile]} und Laborwerte zurueckgesetzt`);
}

function saveCombatLabProfile() {
  persistCombatSettings();
  syncCombatLabControls('Kampfprofil lokal gespeichert');
}

function exportCombatLabProfile() {
  const profile = selectedCombatLabProfile();
  const payload = createGodotCombatProfile({
    tuning: combatTuningSettings,
    weapon: 'sword',
    attackProfile: profile,
    attackSpeed: attackSpeedSettings.sword[profile],
    attackFeel: attackFeelSettings.sword[profile],
    comboPause: COMBO_PROFILE_KEYS.includes(profile) ? comboFlowSettings.sword.pauses[profile] : 0
  });
  downloadJsonFile(`wachtbruch-${profile}-godot-combat-profile.json`, payload);
  syncCombatLabControls(`${EQUIPMENT_PROFILE_LABELS[profile]} fuer Godot exportiert`);
}

function syncQaControls(message = '') {
  if (!qaRoomSelect || !qaWaveSelect) return;
  const currentRoomId = roomIdForLevel(levelDirector.room);
  const previousRoomId = qaRoomSelect.value || currentRoomId;
  qaRoomSelect.replaceChildren();
  roomDefinitions.forEach((room) => {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = `${roomLevelForId(room.id)}. ${room.name}`;
    qaRoomSelect.append(option);
  });
  qaRoomSelect.value = roomDefinition(previousRoomId)?.id ?? currentRoomId;

  const previousWaveId = qaWaveSelect.value;
  const waves = roomWaves(qaRoomSelect.value);
  qaWaveSelect.replaceChildren();
  waves.forEach((wave, index) => {
    const option = document.createElement('option');
    option.value = wave.id;
    option.textContent = `${index + 1}. ${wave.name}${wave.boss ? ' (Boss)' : ''}`;
    qaWaveSelect.append(option);
  });
  const currentWaveId = waves[waveDirector.currentWaveIndex]?.id;
  qaWaveSelect.value = waveDefinition(qaRoomSelect.value, previousWaveId)?.id
    ?? currentWaveId
    ?? waves[0]?.id
    ?? '';
  qaInvulnerableInput.checked = qaInvulnerable;
  qaStatus.textContent = message
    || `${roomDefinition(currentRoomId)?.name ?? 'Raum'} - ${waveDirector.state}`;
  syncCombatLabControls();
}

function setQaPanelOpen(enabled, { restoreFocus = true } = {}) {
  const nextOpen = Boolean(enabled
    && gameMode
    && developerMode?.enabled
    && !rewardOpen
    && !supplyOpen
    && !equipmentOpen);
  if (nextOpen === qaPanelOpen) return;
  qaPanelOpen = nextOpen;
  qaPanel.hidden = !qaPanelOpen;
  qaToggle.setAttribute('aria-expanded', String(qaPanelOpen));
  qaToggle.setAttribute('aria-label', qaPanelOpen ? 'Pruefmodus schliessen' : 'Pruefmodus oeffnen');
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
  setPlayerShielding(false);
  requireGamepadNeutral();
  if (qaPanelOpen) {
    setGameMenuOpen(false, { restoreFocus: false });
    setInventoryOpen(false);
    setEquipmentOpen(false);
    syncQaControls('Pruefmodus bereit');
    qaPanel.scrollTop = 0;
    qaLabToggle.focus({ preventScroll: true });
  } else if (restoreFocus && gameMode) {
    qaToggle.focus({ preventScroll: true });
  }
}

function qaSelectedWaveIndex(roomId) {
  const waves = roomWaves(roomId);
  const selectedIndex = waves.findIndex((wave) => wave.id === qaWaveSelect.value);
  return selectedIndex >= 0 ? selectedIndex : 0;
}

function qaLoadSelectedRoom(message = '') {
  if (combatLabActive) {
    combatLabActive = false;
    combatLabEnemy = null;
    combatLabRespawnTimer = 0;
  }
  const roomId = roomDefinition(qaRoomSelect.value)?.id ?? roomIdForLevel(levelDirector.room);
  resetCombatState(roomId);
  if (roomId === 'wachtschlucht') {
    unlockEquipmentForPlayer('hook');
  }
  syncQaControls(message || `${roomDefinition(roomId)?.name ?? 'Raum'} geladen`);
}

function qaStartSelectedWave() {
  const roomId = roomDefinition(qaRoomSelect.value)?.id ?? roomIdForLevel(levelDirector.room);
  const waveIndex = qaSelectedWaveIndex(roomId);
  const wave = roomWaves(roomId)[waveIndex];
  qaLoadSelectedRoom();
  setArenaGate(true);
  roomMusic.startCombat({
    boss: Boolean(wave?.boss || roomEnemiesForWave(roomId, wave?.id).some((enemy) => enemy.isBoss))
  });
  startRoomWave(waveIndex, roomId);
  syncQaControls(`${wave?.name ?? 'Welle'} gestartet`);
}

function qaFinishCurrentWave() {
  if (combatLabActive) {
    syncQaControls('Kampflabor zuerst verlassen');
    return;
  }
  if (waveDirector.state !== WAVE_STATES.ACTIVE) {
    syncQaControls('Keine aktive Welle');
    return;
  }
  const roomId = roomIdForLevel(levelDirector.room);
  const wave = currentRoomWave();
  waveDirector.pendingSpawns = [];
  roomEnemiesForWave(roomId, wave?.id).forEach((enemy) => {
    enemy.alive = false;
    enemy.active = false;
    enemy.health = 0;
    enemy.root.visible = false;
  });
  finishCurrentWave();
  syncQaControls(`${wave?.name ?? 'Welle'} als bestanden markiert`);
}

function qaUnlockCurrentExit() {
  if (combatLabActive) {
    syncQaControls('Kampflabor zuerst verlassen');
    return;
  }
  const roomId = roomIdForLevel(levelDirector.room);
  waveDirector.pendingSpawns = [];
  combatEnemies.filter((enemy) => enemy.roomId === roomId).forEach((enemy) => {
    enemy.alive = false;
    enemy.active = false;
    enemy.health = 0;
    enemy.root.visible = false;
  });
  closeRewardPanel();
  closeSupplyPanel();
  setArenaGate(false);
  waveDirector.state = WAVE_STATES.EXIT_READY;
  roomMusic.playExplore(roomId);
  setInteractionPrompt('', '', false);
  updateWaveHud();
  updateCombatHud();
  syncQaControls('Ausgang freigegeben');
}

function guidedFocusables(panel) {
  if (!panel || panel.hidden) return [];
  let candidates;
  if (panel === gameMenu) candidates = panel.querySelectorAll('[data-game-menu-action]');
  else if (panel === inventoryPanel) {
    candidates = [
      ...panel.querySelectorAll('[data-inventory-item]'),
      inventoryClose
    ];
  }
  else candidates = panel.querySelectorAll('button:not([disabled])');
  return [...candidates].filter((element) => !element.hidden && element.offsetParent !== null && !element.disabled);
}

function activeGuidedPanel() {
  if (gameOverOpen) return gameOverScreen;
  if (startScreenOpen) return startScreen;
  if (qaPanelOpen) return qaPanel;
  if (supplyOpen) return supplyPanel;
  if (rewardOpen) return rewardPanel;
  if (equipmentOpen) return equipmentPanel;
  if (inventoryOpen) return inventoryPanel;
  if (gameMenuOpen) return gameMenu;
  return null;
}

function focusGuidedPanel(panel, direction = 0, reset = false) {
  const focusables = guidedFocusables(panel);
  if (!focusables.length) return null;
  let index = reset ? 0 : focusables.indexOf(document.activeElement);
  if (index < 0) index = 0;
  if (direction) index = (index + direction + focusables.length) % focusables.length;
  document.querySelectorAll('.is-controller-focus').forEach((element) => element.classList.remove('is-controller-focus'));
  const target = focusables[index];
  target.classList.add('is-controller-focus');
  target.focus({ preventScroll: false });
  return target;
}

function activateGuidedSelection(panel) {
  const focusables = guidedFocusables(panel);
  if (!focusables.length) return;
  const focused = focusables.includes(document.activeElement) ? document.activeElement : focusGuidedPanel(panel, 0, true);
  focused?.click();
}

function closeGuidedPanel(panel) {
  if (panel === qaPanel) setQaPanelOpen(false);
  else if (panel === gameMenu) setGameMenuOpen(false);
  else if (panel === inventoryPanel) setInventoryOpen(false);
  else if (panel === equipmentPanel) setEquipmentOpen(false);
}

function gameSaveRecord(slot = selectedSaveSlot) {
  const normalizedSlot = normalizeGameSaveSlot(slot);
  return saveSlotRecords.find((record) => record.slot === normalizedSlot) ?? {
    slot: normalizedSlot,
    found: false,
    save: null,
    source: null,
    recovered: false
  };
}

function formatGameSaveDate(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Unbekannt';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(date);
}

function resetArmedSaveSlotAction({ render = false } = {}) {
  clearTimeout(armedSaveSlotTimer);
  armedSaveSlotAction = null;
  startNewGameButton.querySelector('span').textContent = 'Neues Spiel';
  startDeleteSlotButton.querySelector('span').textContent = 'Loeschen';
  startSaveStatus.classList.remove('is-warning');
  if (render) renderGameSaveSlots();
}

function refreshGameSaveRecords() {
  saveSlotRecords = persistence.listGameSaveSlots();
  return saveSlotRecords;
}

function renderGameSaveSlots(statusMessage = '') {
  const selectedRecord = gameSaveRecord();
  saveSlotButtons.forEach((button) => {
    const slot = normalizeGameSaveSlot(button.dataset.saveSlot);
    const record = gameSaveRecord(slot);
    const save = record.save;
    const selected = slot === selectedSaveSlot;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-damaged', Boolean(record.found && !save));
    const title = button.querySelector('[data-save-slot-title]');
    const detail = button.querySelector('[data-save-slot-detail]');
    const time = button.querySelector('[data-save-slot-time]');
    const date = button.querySelector('[data-save-slot-date]');
    if (save) {
      title.textContent = save.summary.roomName;
      detail.textContent = `${save.summary.health}/${save.summary.maxHealth} Leben | ${save.summary.coins} Muenzen`;
      time.textContent = formatGameSaveDuration(save.playSeconds);
      date.textContent = formatGameSaveDate(save.savedAt);
      button.setAttribute(
        'aria-label',
        `Slot ${slot}: ${save.summary.roomName}, ${detail.textContent}, ${time.textContent}`
      );
    } else if (record.found) {
      title.textContent = 'Beschaedigt';
      detail.textContent = 'Der Stand und seine Sicherung sind nicht lesbar.';
      time.textContent = '--';
      date.textContent = 'Pruefen';
      button.setAttribute('aria-label', `Slot ${slot}: beschaedigt`);
    } else {
      title.textContent = 'Leer';
      detail.textContent = 'Bereit fuer eine neue Wacht.';
      time.textContent = '0 min';
      date.textContent = 'Neu';
      button.setAttribute('aria-label', `Slot ${slot}: leer`);
    }
  });
  startGameButton.disabled = !selectedRecord.save;
  startDeleteSlotButton.disabled = !selectedRecord.found;
  startSaveStatus.textContent = statusMessage;
}

function selectGameSaveSlot(slot) {
  selectedSaveSlot = normalizeGameSaveSlot(slot);
  resetArmedSaveSlotAction();
  renderGameSaveSlots();
}

function armGameSaveSlotAction(action, slot, message) {
  const key = `${action}:${normalizeGameSaveSlot(slot)}`;
  if (armedSaveSlotAction === key) {
    resetArmedSaveSlotAction();
    return true;
  }
  clearTimeout(armedSaveSlotTimer);
  armedSaveSlotAction = key;
  startSaveStatus.classList.add('is-warning');
  startSaveStatus.textContent = message;
  if (action === 'overwrite') {
    startNewGameButton.querySelector('span').textContent = 'Ueberschreiben bestaetigen';
  } else {
    startDeleteSlotButton.querySelector('span').textContent = 'Loeschen bestaetigen';
  }
  armedSaveSlotTimer = window.setTimeout(() => resetArmedSaveSlotAction({ render: true }), 4500);
  return false;
}

function currentRunPlaySeconds() {
  const sessionSeconds = gameMode && activeSaveSessionStartedAt > 0
    ? Math.max(0, (Date.now() - activeSaveSessionStartedAt) / 1000)
    : 0;
  return activeSavePlaySeconds + sessionSeconds;
}

function currentCheckpointState() {
  if (waveDirector.state === WAVE_STATES.VICTORY) return 'victory';
  if (waveDirector.state === WAVE_STATES.EXIT_READY) return 'exit-ready';
  return 'ready';
}

function canSaveCurrentGame() {
  return Boolean(
    gameMode
    && activeSaveSlot
    && !gameOverOpen
    && !rewardOpen
    && !supplyOpen
    && !combatLabActive
    && levelDirector.phase === 'idle'
    && [
      WAVE_STATES.READY,
      WAVE_STATES.EXIT_READY,
      WAVE_STATES.VICTORY
    ].includes(waveDirector.state)
  );
}

function createCurrentGameSave(reason = 'manual') {
  const roomId = roomIdForLevel(levelDirector.room);
  const room = roomDefinition(roomId);
  const health = Math.max(0, playerHealth);
  const maxHealth = playerMaxHealth();
  return createGameSave({
    slot: activeSaveSlot,
    createdAt: activeSaveCreatedAt,
    savedAt: new Date().toISOString(),
    reason,
    playSeconds: currentRunPlaySeconds(),
    summary: {
      roomId,
      roomName: room?.name ?? roomId,
      level: levelDirector.room,
      checkpointLabel: currentCheckpointState() === 'ready'
        ? `Eingang ${room?.name ?? roomId}`
        : `Gesichert: ${room?.name ?? roomId}`,
      health,
      maxHealth,
      coins: inventoryState.coins
    },
    checkpoint: {
      roomId,
      level: levelDirector.room,
      state: currentCheckpointState(),
      position: {
        x: playerRoot.position.x,
        y: playerRoot.position.y,
        z: playerRoot.position.z
      },
      rotationY: playerRoot.rotation.y
    },
    player: {
      health,
      maxHealth,
      stamina: playerStamina,
      inventory: { ...inventoryState },
      equippedWeapon,
      swordEmpowered
    },
    progression: {
      run: serializeRunProgress(runProgress),
      equipment: serializeEquipmentProgress(equipmentProgress)
    },
    world: {
      completedRooms: [...completedRoomIds],
      openedRewardRooms: [...openedRewardRoomIds],
      defeatedBossRooms: [...defeatedBossRoomIds],
      pendingCoins: lootDrops.map((drop) => ({
        position: {
          x: drop.root.position.x,
          y: drop.groundY,
          z: drop.root.position.z
        },
        value: drop.value
      }))
    }
  });
}

function saveActiveGame(reason = 'manual', { announce = false } = {}) {
  if (!canSaveCurrentGame()) {
    if (announce) showCombatMessage('SPEICHERN ERST NACH DEM KAMPF', 1.25);
    return false;
  }
  try {
    const save = persistence.saveGameSaveSlot(activeSaveSlot, createCurrentGameSave(reason));
    activeSaveCreatedAt = save.createdAt;
    activeSavePlaySeconds = save.playSeconds;
    activeSaveSessionStartedAt = Date.now();
    selectedSaveSlot = save.slot;
    refreshGameSaveRecords();
    canvas.dataset.activeSaveSlot = String(save.slot);
    canvas.dataset.lastSaveReason = save.reason;
    canvas.dataset.lastSaveAt = save.savedAt;
    syncGameMenuState();
    if (announce) showCombatMessage(`SLOT ${save.slot} GESPEICHERT`, 1.05);
    return true;
  } catch (error) {
    console.error(error);
    if (announce) showCombatMessage('SPEICHERN FEHLGESCHLAGEN', 1.25);
    return false;
  }
}

function applyLoadedCheckpoint(save) {
  const roomId = save.checkpoint.roomId;
  const checkpointPosition = save.checkpoint.position;
  playerRoot.position.set(
    checkpointPosition.x,
    checkpointPosition.y,
    checkpointPosition.z
  );
  playerRoot.rotation.y = save.checkpoint.rotationY;
  snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
  rememberPlayerSafePosition();
  lastMoveDirection.set(
    Math.sin(playerRoot.rotation.y),
    0,
    Math.cos(playerRoot.rotation.y)
  ).normalize();

  const roomCompleted = completedRoomIds.has(roomId)
    || save.checkpoint.state === 'exit-ready'
    || save.checkpoint.state === 'victory';
  if (roomCompleted) {
    completedRoomIds.add(roomId);
    waveDirector.currentWaveIndex = Math.max(0, roomWaves(roomId).length - 1);
    waveDirector.state = save.checkpoint.state === 'victory'
      ? WAVE_STATES.VICTORY
      : WAVE_STATES.EXIT_READY;
    waveDirector.pendingSpawns = [];
    waveDirector.nextWaveTimer = 0;
    setArenaGate(false, true);
    combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
    if (defeatedBossRoomIds.has(roomId)) {
      setRoomWachtmaleAwakened(roomId, true, { immediate: true });
    }
    if (openedRewardRoomIds.has(roomId) && rewardChest) {
      rewardChest.userData.lidOpen = true;
      playActorAnimation(rewardChest, 'open', {
        once: true,
        restart: true,
        speed: 3.6,
        fade: 0.01
      });
    }
  } else {
    waveDirector.state = WAVE_STATES.READY;
    setArenaGate(false, true);
  }
  if (chestBeacon) chestBeacon.visible = false;
  if (exitBeacon) exitBeacon.visible = false;
  restorePendingCoins(save.world.pendingCoins);
  lockRoomEntryExits(roomId);
  combatCameraFocus.copy(playerRoot.position).add(COMBAT_CAMERA_TARGET_OFFSET);
  combatCameraLead.set(0, 0, 0);
  camera.position.copy(playerRoot.position).add(followOffset);
  camera.lookAt(combatCameraFocus);
  updateInventoryHud();
  updateCombatHud();
  updateWaveHud();
  updatePlayerWeapon();
}

function restoreGameSave(save, { fromGameOver = false } = {}) {
  const room = roomDefinition(save?.checkpoint?.roomId);
  if (!room) throw new Error('Der gespeicherte Raum ist nicht mehr vorhanden.');
  activeSaveSlot = normalizeGameSaveSlot(save.slot);
  activeSaveCreatedAt = save.createdAt;
  activeSavePlaySeconds = Math.max(0, Number(save.playSeconds) || 0);
  activeSaveSessionStartedAt = Date.now();
  selectedSaveSlot = activeSaveSlot;
  setStartScreenOpen(false);
  setGameMode(true, { startRoomId: room.id });

  hydrateRunProgress(runProgress, save.progression.run);
  hydrateEquipmentProgress(equipmentProgress, save.progression.equipment);
  completedRoomIds.clear();
  openedRewardRoomIds.clear();
  defeatedBossRoomIds.clear();
  save.world.completedRooms.forEach((roomId) => completedRoomIds.add(roomId));
  save.world.openedRewardRooms.forEach((roomId) => openedRewardRoomIds.add(roomId));
  save.world.defeatedBossRooms.forEach((roomId) => defeatedBossRoomIds.add(roomId));
  inventoryState.coins = Math.max(0, Math.floor(Number(save.player.inventory.coins) || 0));
  inventoryState.potions = Math.max(0, Math.floor(Number(save.player.inventory.potions) || 0));
  playerHealth = THREE.MathUtils.clamp(
    Math.floor(Number(save.player.health) || 1),
    1,
    playerMaxHealth()
  );
  playerStamina = THREE.MathUtils.clamp(Number(save.player.stamina) || 0, 0, 1);
  setEquippedWeapon(save.player.equippedWeapon, save.player.swordEmpowered);
  applyLoadedCheckpoint(save);
  persistence.saveGameSaveMeta(activeSaveSlot);
  refreshGameSaveRecords();
  canvas.dataset.activeSaveSlot = String(activeSaveSlot);
  showCombatMessage(fromGameOver ? 'RA ERHEBT SICH' : `SLOT ${activeSaveSlot} GELADEN`, 1.15);
  canvas.focus({ preventScroll: true });
}

function loadSelectedGame() {
  try {
    const record = persistence.loadGameSaveSlot(selectedSaveSlot);
    if (!record?.save) {
      renderGameSaveSlots(`Slot ${selectedSaveSlot} ist leer.`);
      return;
    }
    restoreGameSave(record.save);
  } catch (error) {
    console.error(error);
    startSaveStatus.classList.add('is-warning');
    renderGameSaveSlots(`Slot ${selectedSaveSlot} konnte nicht geladen werden.`);
  }
}

function beginSelectedNewGame() {
  const record = gameSaveRecord();
  if (record.found && !armGameSaveSlotAction(
    'overwrite',
    selectedSaveSlot,
    `Slot ${selectedSaveSlot} ist belegt. Bestaetige das Ueberschreiben.`
  )) return;
  resetArmedSaveSlotAction();
  beginNewGame(selectedSaveSlot);
}

function deleteSelectedGameSave() {
  const record = gameSaveRecord();
  if (!record.found) return;
  if (!armGameSaveSlotAction(
    'delete',
    selectedSaveSlot,
    `Slot ${selectedSaveSlot} wirklich loeschen?`
  )) return;
  persistence.deleteGameSaveSlot(selectedSaveSlot);
  if (activeSaveSlot === selectedSaveSlot && !gameMode) activeSaveSlot = null;
  resetArmedSaveSlotAction();
  refreshGameSaveRecords();
  renderGameSaveSlots(`Slot ${selectedSaveSlot} wurde geloescht.`);
}

function returnToTitleFromGameMenu() {
  if (canSaveCurrentGame()) saveActiveGame('return-title');
  setGameMenuOpen(false, { restoreFocus: false });
  setGameMode(false);
  refreshGameSaveRecords();
  renderGameSaveSlots();
  setStartScreenOpen(true);
}

function syncGameMenuState() {
  gameMenuMusicStatus.textContent = roomMusic.enabled ? 'An' : 'Aus';
  gameMenuFullscreenStatus.textContent = document.fullscreenElement ? 'An' : 'Aus';
  gameMenuSaveButton.disabled = !canSaveCurrentGame();
  gameMenuSaveStatus.textContent = activeSaveSlot
    ? gameMenuSaveButton.disabled ? 'Nach Kampf' : `Slot ${activeSaveSlot}`
    : 'Kein Slot';
}

function setGameMenuOpen(enabled, { restoreFocus = true } = {}) {
  const nextOpen = Boolean(enabled
    && gameMode
    && !gameOverOpen
    && !qaPanelOpen
    && !rewardOpen
    && !supplyOpen
    && !equipmentOpen);
  if (nextOpen === gameMenuOpen && (nextOpen || gameMenu.hidden)) return;
  clearTimeout(gameMenuCloseTimer);
  gameMenuOpen = nextOpen;
  if (gameMenuOpen) cancelPlayerAttackCharge();
  gameMenuToggle.setAttribute('aria-expanded', String(gameMenuOpen));
  gameMenuToggle.setAttribute('aria-label', gameMenuOpen ? 'Spielmenue schliessen' : 'Spielmenue oeffnen');
  document.body.classList.toggle('game-menu-open', gameMenuOpen);
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
  setPlayerShielding(false);
  requireGamepadNeutral();
  requireGuidedInputNeutral();

  if (gameMenuOpen) {
    if (inventoryOpen) setInventoryOpen(false);
    gameMenu.hidden = false;
    syncGameMenuState();
    requestAnimationFrame(() => {
      gameMenu.classList.add('is-open');
      focusGuidedPanel(gameMenu, 0, true);
    });
  } else {
    gameMenu.classList.remove('is-open');
    document.querySelectorAll('.is-controller-focus').forEach((element) => element.classList.remove('is-controller-focus'));
    gameMenuCloseTimer = window.setTimeout(() => { gameMenu.hidden = true; }, 180);
    if (restoreFocus && gameMode) gameMenuToggle.focus({ preventScroll: true });
  }
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
}

function runGameMenuAction(action) {
  if (action === 'resume') {
    setGameMenuOpen(false);
  } else if (action === 'inventory') {
    setGameMenuOpen(false, { restoreFocus: false });
    setInventoryOpen(true);
  } else if (action === 'save') {
    saveActiveGame('manual', { announce: true });
    syncGameMenuState();
  } else if (action === 'music') {
    roomMusic.setEnabled(!roomMusic.enabled);
    syncGameMenuState();
  } else if (action === 'fullscreen') {
    toggleFullscreen().catch(() => showCombatMessage('VOLLBILD NICHT VERFUEGBAR', 1));
  } else if (action === 'title') {
    returnToTitleFromGameMenu();
  }
}

function setStartScreenOpen(enabled) {
  clearTimeout(startScreenCloseTimer);
  startScreenOpen = Boolean(enabled);
  document.body.classList.toggle('start-screen-open', startScreenOpen);
  requireGuidedInputNeutral();
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  gamepadMoveVector.set(0, 0);

  if (startScreenOpen) {
    setBuildMode(false);
    controls.enabled = true;
    controls.autoRotate = true;
    refreshGameSaveRecords();
    renderGameSaveSlots();
    startScreen.hidden = false;
    requestAnimationFrame(() => {
      startScreen.classList.add('is-open');
      const selectedButton = saveSlotButtons.find(
        (button) => normalizeGameSaveSlot(button.dataset.saveSlot) === selectedSaveSlot
      );
      if (selectedButton) {
        document.querySelectorAll('.is-controller-focus')
          .forEach((element) => element.classList.remove('is-controller-focus'));
        selectedButton.classList.add('is-controller-focus');
        selectedButton.focus({ preventScroll: false });
      } else {
        focusGuidedPanel(startScreen, 0, true);
      }
    });
    return;
  }

  startScreen.classList.remove('is-open');
  startScreenCloseTimer = window.setTimeout(() => {
    if (!startScreenOpen) startScreen.hidden = true;
  }, 500);
}

function beginNewGame(slot = selectedSaveSlot) {
  ensureAudioContext();
  activeSaveSlot = normalizeGameSaveSlot(slot);
  selectedSaveSlot = activeSaveSlot;
  activeSaveCreatedAt = new Date().toISOString();
  activeSavePlaySeconds = 0;
  activeSaveSessionStartedAt = Date.now();
  const firstRoomId = roomDefinitions[0]?.id ?? activeEditorRoomId;
  setStartScreenOpen(false);
  setGameMode(true, { startRoomId: firstRoomId });
  persistence.saveGameSaveMeta(activeSaveSlot);
  saveActiveGame('new-game');
}

function openWorkshopFromTitle() {
  setStartScreenOpen(false);
  if (gameMode) setGameMode(false);
  developerMode?.setEnabled(true);
  setBuildMode(true);
}

function beginGameOver() {
  if (gameOverOpen) return;
  gameOverOpen = true;
  gameOverTimer = 0;
  gameOverRoomId = roomIdForLevel(levelDirector.room);
  gameOverReadyFocused = false;
  gameOverScreen.hidden = false;
  gameOverScreen.classList.remove('is-ready');
  gameOverContinueButton.disabled = true;
  gameOverTitleButton.disabled = true;
  document.body.classList.add('game-over-open');
  setInteractionPrompt('', '', false);
  setGameMenuOpen(false, { restoreFocus: false });
  setInventoryOpen(false);
  setEquipmentOpen(false);
  setPlayerShielding(false);
  cancelPlayerHook();
  cancelPlayerAttackCharge({ restoreAnimation: false });
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  gamepadMoveVector.set(0, 0);
  requireGamepadNeutral();
  requireGuidedInputNeutral();
  roomMusic.playDefeat();
  requestAnimationFrame(() => gameOverScreen.classList.add('is-darkening'));
}

function updateGameOver(delta) {
  if (!gameOverOpen) return;
  gameOverTimer += Math.max(0, delta);
  if (gameOverTimer < GAME_OVER_REVEAL_TIME || gameOverScreen.classList.contains('is-ready')) return;
  gameOverScreen.classList.add('is-ready');
  gameOverContinueButton.disabled = false;
  gameOverTitleButton.disabled = false;
  if (!gameOverReadyFocused) {
    gameOverReadyFocused = true;
    requireGuidedInputNeutral();
    focusGuidedPanel(gameOverScreen, 0, true);
  }
}

function closeGameOver() {
  gameOverOpen = false;
  gameOverTimer = 0;
  gameOverReadyFocused = false;
  gameOverScreen.classList.remove('is-darkening', 'is-ready');
  gameOverScreen.hidden = true;
  document.body.classList.remove('game-over-open');
  document.querySelectorAll('.is-controller-focus').forEach((element) => element.classList.remove('is-controller-focus'));
}

function continueAfterGameOver() {
  let record = null;
  try {
    record = activeSaveSlot ? persistence.loadGameSaveSlot(activeSaveSlot) : null;
  } catch (error) {
    console.warn('Der letzte Checkpoint konnte nicht geladen werden.', error);
  }
  closeGameOver();
  if (record?.save) {
    restoreGameSave(record.save, { fromGameOver: true });
    return;
  }
  const roomId = roomDefinition(gameOverRoomId)?.id ?? roomDefinitions[0]?.id ?? activeEditorRoomId;
  resetCombatState(roomId, { preserveRun: true });
  roomMusic.playExplore(roomId);
  showCombatMessage('RA ERHEBT SICH', 1.1);
  canvas.focus({ preventScroll: true });
}

function returnToTitleAfterGameOver() {
  closeGameOver();
  setGameMode(false);
  refreshGameSaveRecords();
  renderGameSaveSlots();
  setStartScreenOpen(true);
}

const INVENTORY_DETAILS = {
  sword: ['Schwert von Ahnhoehe', 'Hauptwaffe'],
  spear: ['Breschenspeer', 'Reichweite und kontrollierte Stoesse'],
  shield: ['Rundschild', 'Schutz gegen frontale Angriffe'],
  hook: ['Enterhaken', 'Zieht Ra zu festen Ankerpunkten'],
  helmet: ['Wachthelm von Ahnhoehe', 'Runenschutz der alten Wacht'],
  potion: ['Heiltrank', 'Stellt bis zu drei Herzen wieder her'],
  coins: ['Alte Muenzen', 'Fundstuecke aus den Ruinen']
};

function selectInventoryItem(item) {
  document.querySelectorAll('[data-inventory-item]').forEach((slot) => {
    const selected = slot.dataset.inventoryItem === item;
    slot.classList.toggle('is-selected', selected);
    slot.setAttribute('aria-pressed', String(selected));
  });
  const [name, detail] = INVENTORY_DETAILS[item] ?? ['', ''];
  inventoryItemName.textContent = name;
  inventoryItemDetail.textContent = detail;
}

function syncEquipmentProgressUi() {
  const hookUnlocked = isEquipmentUnlocked(equipmentProgress, 'hook');
  const helmetUnlocked = isEquipmentUnlocked(equipmentProgress, 'helmet');
  const helmetEquipped = isEquipmentEquipped(equipmentProgress, 'helmet');

  hookInventorySlot.disabled = !hookUnlocked;
  hookSlotState.textContent = hookUnlocked ? 'Werkzeug' : 'Nicht gefunden';
  helmetInventorySlot.disabled = !helmetUnlocked;
  helmetSlotState.textContent = !helmetUnlocked
    ? 'Nicht gefunden'
    : helmetEquipped ? 'Ausgeruestet' : 'Anlegen';
  if (playerHelmet) playerHelmet.visible = helmetEquipped;

  hookButton.disabled = !hookUnlocked || playerHookCooldown > 0.04;
  hookButton.dataset.tip = hookUnlocked ? 'Enterhaken' : 'Nicht gefunden';
  hookButton.setAttribute(
    'aria-label',
    hookUnlocked ? 'Enterhaken einsetzen' : 'Enterhaken noch nicht gefunden'
  );
}

function updateInventoryHud() {
  potionCount.textContent = String(inventoryState.potions);
  coinCount.textContent = String(inventoryState.coins);
  inventoryCoinCount.textContent = String(inventoryState.coins);
  potionSlot.disabled = inventoryState.potions <= 0;
  syncEquipmentProgressUi();
}

function unlockEquipmentForPlayer(equipmentId, options = {}) {
  const result = unlockEquipment(equipmentProgress, equipmentId);
  if (!result.unlocked) return result;
  updateInventoryHud();
  if (result.newlyUnlocked && options.revealOrigin) {
    spawnRewardReveal(equipmentId, options.revealOrigin);
    playRewardChime(equipmentId === 'hook' ? 'spear' : 'sword');
  }
  if (result.newlyUnlocked && options.announce) {
    showCombatMessage(`${result.definition.displayName.toUpperCase()} GEFUNDEN`, 1.65);
  }
  return result;
}

function togglePlayerHelmet() {
  if (!isEquipmentUnlocked(equipmentProgress, 'helmet')) return;
  const equipped = !isEquipmentEquipped(equipmentProgress, 'helmet');
  setEquipmentEquipped(equipmentProgress, 'helmet', equipped);
  updateInventoryHud();
  selectInventoryItem('helmet');
  showCombatMessage(equipped ? 'WACHTHELM ANGELEGT' : 'WACHTHELM ABGELEGT', 0.9);
  saveActiveGame('equipment-changed');
}

function setInventoryOpen(enabled) {
  if (enabled && gameMenuOpen) setGameMenuOpen(false, { restoreFocus: false });
  inventoryOpen = Boolean(enabled && gameMode && !qaPanelOpen && !rewardOpen && !supplyOpen && !equipmentOpen);
  if (inventoryOpen) cancelPlayerAttackCharge();
  inventoryPanel.hidden = !inventoryOpen;
  inventoryToggle.setAttribute('aria-pressed', String(inventoryOpen));
  document.body.classList.toggle('inventory-open', inventoryOpen);
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
  setPlayerShielding(false);
  requireGamepadNeutral();
  requireGuidedInputNeutral();
  if (inventoryOpen) requestAnimationFrame(() => focusGuidedPanel(inventoryPanel, 0, true));
}

function usePotion() {
  selectInventoryItem('potion');
  if (!gameMode || inventoryState.potions <= 0) return;
  if (playerHealth >= playerMaxHealth()) {
    showCombatMessage('Volle Lebenskraft', 0.85);
    return;
  }
  inventoryState.potions -= 1;
  playerHealth = Math.min(playerMaxHealth(), playerHealth + 3);
  updateInventoryHud();
  updateCombatHud();
  showCombatMessage('Heiltrank', 0.85);
}

function setPlayerShielding(enabled) {
  playerShielding = Boolean(enabled && gameMode && !getragenesFass && !qaPanelOpen && !gameMenuOpen && !inventoryOpen && !equipmentOpen && !rewardOpen && !supplyOpen
    && playerHealth > 0 && playerStamina > 0.04 && playerFallTimer <= 0
    && playerRecoveryStunTimer <= 0 && playerHurtTimer <= 0);
  if (playerShielding) cancelPlayerAttackCharge();
  shieldButton.setAttribute('aria-pressed', String(playerShielding));
  if (playerShield) updatePlayerWeapon();
}

function spawnShieldFlash() {
  const geometry = new THREE.RingGeometry(0.45, 1.08, 28);
  const material = new THREE.MeshBasicMaterial({
    color: '#a9d7f2', transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide
  });
  const flash = new THREE.Mesh(geometry, material);
  flash.position.copy(playerRoot.position);
  flash.position.y += 0.75;
  flash.rotation.y = playerRoot.rotation.y;
  registerCombatEffect(flash, 0.22, { scaleFrom: 0.88, scaleTo: 1.22 });
}

function grapplePointFor(root) {
  const target = root.getObjectByName('Grapple_Target');
  if (target) return target.getWorldPosition(new THREE.Vector3());
  const bounds = new THREE.Box3().setFromObject(root);
  const point = bounds.getCenter(new THREE.Vector3());
  point.y = Math.min(bounds.max.y - 0.12, Math.max(0.85, point.y));
  return point;
}

function findGrappleTarget() {
  const forward = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
  const candidates = pickableRoots
    .filter((root) => root.visible && (root.userData.grappleAnchor
      || GRAPPLE_ASSETS.has(root.userData.assetName)))
    .map((root) => {
      const point = grapplePointFor(root);
      const offset = point.clone().sub(playerRoot.position);
      offset.y = 0;
      const distance = offset.length();
      const alignment = distance > 0.001 ? forward.dot(offset.normalize()) : -1;
      const dedicatedAnchor = Boolean(root.userData.grappleAnchor || root.userData.wachtanker);
      const priority = dedicatedAnchor ? 0.38 : 1;
      return {
        root,
        point,
        distance,
        alignment,
        dedicatedAnchor,
        score: distance * (1 + (1 - alignment) * 1.7) * priority
      };
    })
    .filter((candidate) => candidate.distance > CELL * 0.75
      && candidate.distance < CELL * 5.8
      && candidate.alignment > 0.12);
  const dedicatedAnchors = candidates.filter((candidate) => candidate.dedicatedAnchor);
  return (dedicatedAnchors.length ? dedicatedAnchors : candidates)
    .sort((a, b) => a.score - b.score)[0] ?? null;
}

function cancelPlayerHook() {
  setWachtankerTargeted(playerHookTargetRoot, false);
  playerHookTimer = 0;
  playerHookTarget = null;
  playerHookTargetRoot = null;
  playerHookStartY = playerRoot?.position.y ?? ACTOR_GROUND_OFFSET;
  playerHookLandingY = playerHookStartY;
  if (hookLine) hookLine.visible = false;
  if (hookGlow) hookGlow.visible = false;
  if (hookTip) hookTip.visible = false;
  if (hookChainRoot) hookChainRoot.visible = false;
  hookChainLinks.forEach((link) => { link.visible = false; });
  setPlayerHookEquipmentStowed(false);
  hookButton.classList.remove('is-active');
}

// ---------------------------------------------------------------------------
// Geber und Nehmer
// Ein Geber setzt ein frei benanntes Signal auf an oder aus, ein Nehmer horcht
// darauf. Zwischen beiden liegt nur eine Zeichenkette - kein Objektverweis.
// Darum laesst sich das Brett auch nach Godot mitnehmen.
// ---------------------------------------------------------------------------
const raumSignale = new Map();
const eingerasteteSignale = new Set();

function signalAn(name) {
  return Boolean(name) && raumSignale.get(name) === true;
}

function setzeSignal(name, an) {
  if (!name) return;
  if (raumSignale.get(name) === Boolean(an)) return;
  raumSignale.set(name, Boolean(an));
  aktualisiereSchloesser();
  playTone(an ? 262 : 175, 0.09, 0.016, 0, 'triangle');
}

function leereSignalbrett() {
  raumSignale.clear();
  eingerasteteSignale.clear();
  editableRoots.forEach((root) => {
    if (!root.userData.offen) return;
    root.userData.offen = false;
    root.position.y = root.userData.signalGrundhoehe ?? root.position.y;
  });
  aktualisiereSchloesser();
}

function markerListe(typ, roomId) {
  return editableRoots.filter((root) => root.userData.systemMarker === typ
    && root.userData.roomId === roomId);
}

// --- Geber: Druckplatte ----------------------------------------------------

function koerperAufPlatte(marker, radius) {
  const markerY = marker.position.y;
  let anzahl = 0;
  const passt = (position) => Math.hypot(position.x - marker.position.x, position.z - marker.position.z) < radius
    && Math.abs(position.y - markerY) < CELL * 0.7;
  if (playerHealth > 0 && passt(playerRoot.position)) anzahl += 1;
  combatDestructibles.forEach((eintrag) => {
    if (eintrag.destroyed || eintrag.root.userData.getragen) return;
    if (passt(eintrag.root.position)) anzahl += 1;
  });
  combatEnemies.forEach((gegner) => {
    if (!gegner.active || !gegner.alive) return;
    if (passt(gegner.root.position)) anzahl += 1;
  });
  return anzahl;
}

const DRUCKPLATTE_ASSET = 'druckplatte-ahnhoehe';

function istDruckplatte(root) {
  return root.userData.systemMarker === 'druckplatte'
    || root.userData.assetName === DRUCKPLATTE_ASSET;
}

// Der unsichtbare Marker und das Modell teilen sich dieselben Felder.
function plattenEinstellungen(root) {
  const vorgabe = BUILD_ASSET_DEFINITIONS[root.userData.assetName]?.druckplatte ?? {};
  const s = root.userData.placement?.settings ?? {};
  return {
    signal: String(s.signal ?? vorgabe.signal ?? '').trim(),
    modus: s.modus === 'rasten' ? 'rasten' : 'halten',
    gewicht: THREE.MathUtils.clamp(Math.round(Number(s.gewicht ?? vorgabe.gewicht) || 1), 1, 4),
    radius: THREE.MathUtils.clamp(Number(s.radius ?? vorgabe.radius) || CELL * 0.62, 0.3, 6)
  };
}

function updateDruckplatten() {
  const roomId = roomIdForLevel(levelDirector.room);
  editableRoots.forEach((platte) => {
    if (platte.userData.roomId !== roomId || !istDruckplatte(platte)) return;
    const { signal, modus, gewicht, radius } = plattenEinstellungen(platte);
    if (!signal) return;
    const rastend = modus === 'rasten';
    const belastet = koerperAufPlatte(platte, radius) >= gewicht;
    if (rastend && belastet) eingerasteteSignale.add(signal);
    setzeSignal(signal, belastet || (rastend && eingerasteteSignale.has(signal)));
    const gedrueckt = signalAn(signal);
    if (Boolean(platte.userData.platteGedrueckt) === gedrueckt) return;
    platte.userData.platteGedrueckt = gedrueckt;
    if (platte.userData.actions?.size) {
      // Das Modell bringt eigene Bewegungen mit.
      playActorAnimation(platte, gedrueckt ? 'pressureplate_press' : 'pressureplate_release',
        { once: true, restart: true, speed: 1, fade: 0.06 });
    } else {
      platte.scale.setScalar(gedrueckt ? 0.72 : 1);
    }
  });
}

// --- Nehmer: Schloss -------------------------------------------------------

function aktualisiereSchloesser() {
  if (!gameMode) return;
  const roomId = roomIdForLevel(levelDirector.room);
  markerListe('schloss', roomId).forEach((marker) => {
    const settings = marker.userData.placement?.settings ?? {};
    const signal = String(settings.signal ?? '').trim();
    if (!signal) return;
    const radius = THREE.MathUtils.clamp(Number(settings.radius) || CELL * 1.05, 0.3, 8);
    const an = signalAn(signal);
    const offen = settings.wirkung === 'schliessen' ? !an : an;
    editableRoots.forEach((root) => {
      if (root.userData.roomId !== roomId) return;
      // Nur Bauteile, die ausdruecklich dafuer vorgesehen sind. Ohne diese
      // Bedingung hebt das Schloss auch den Boden - Boeden sind begehbar.
      if (!BUILD_ASSET_DEFINITIONS[root.userData.assetName]?.signalBeweglich) return;
      if (horizontalDistanceBetween(root, marker) > radius) return;
      if (root.userData.signalGrundhoehe === undefined) root.userData.signalGrundhoehe = root.position.y;
      root.userData.offen = offen;
      root.userData.signalZielhoehe = root.userData.signalGrundhoehe + (offen ? CELL * 0.94 : 0);
    });
  });
}

function updateSignalTore(delta) {
  editableRoots.forEach((root) => {
    const ziel = root.userData.signalZielhoehe;
    if (ziel === undefined) return;
    if (Math.abs(root.position.y - ziel) < 0.002) return;
    root.position.y = THREE.MathUtils.damp(root.position.y, ziel, 6.5, delta);
  });
}

function updateSignale(delta) {
  updateDruckplatten();
  updateSignalTore(delta);
}

// ---------------------------------------------------------------------------
// Felsblöcke schieben
// Der Fels ist genau eine Zelle gross. Darum rueckt er Feld fuer Feld vor -
// ein Block, der eine Zelle fuellt, kann nur buendig oder schief liegen.
// Voraussetzung ist das Armband der unbaendigen Ahnenkraft.
// ---------------------------------------------------------------------------
const FELS = Object.freeze({
  asset: 'rocks',
  reichweite: CELL * 1.05,
  ausrichtung: 0.55,
  dauer: 0.46,
  hoehenToleranz: CELL * 0.6
});

let felsSchub = null;

function armbandGetragen() {
  return isEquipmentUnlocked(equipmentProgress, 'armband');
}

// Auf die vier Rasterachsen einrasten.
function rasterRichtung(winkel) {
  const viertel = Math.round(winkel / (Math.PI * 0.5)) * (Math.PI * 0.5);
  const x = Math.round(Math.sin(viertel));
  const z = Math.round(Math.cos(viertel));
  return new THREE.Vector3(x, 0, z);
}

function findeSchiebbarenFels() {
  const richtung = rasterRichtung(playerRoot.rotation.y);
  const roomId = combatRoomIdForRoot(playerRoot);
  return editableRoots
    .filter((root) => root.userData.roomId === roomId
      && root.userData.assetName === FELS.asset
      && root.visible
      && !root.userData.wirdGeschoben)
    .map((root) => {
      const versatz = root.position.clone().sub(playerRoot.position);
      const hoehe = Math.abs(versatz.y);
      versatz.y = 0;
      const abstand = versatz.length();
      const treffer = abstand > 0.001 ? richtung.dot(versatz.normalize()) : -1;
      return { root, abstand, treffer, hoehe };
    })
    .filter((k) => k.abstand < FELS.reichweite
      && k.hoehe < FELS.hoehenToleranz
      && k.treffer > FELS.ausrichtung)
    .sort((a, b) => a.abstand - b.abstand)[0]?.root ?? null;
}

function zielfeldFrei(fels, ziel) {
  // Boden muss da sein, sonst schoebe man den Fels ins Leere.
  const boden = combatSurfaceAt(ziel, fels, { allowAnyHeight: true });
  if (!boden) return false;
  if (Math.abs(boden.y - ACTOR_GROUND_OFFSET - fels.position.y) > CELL * 0.35) return false;
  // Nichts darf im Zielfeld stehen. Der Fels selbst zaehlt nicht.
  return !isCombatPositionBlocked(ziel, CELL * 0.42, fels);
}

function schiebeFels() {
  if (felsSchub || !armbandGetragen()) return false;
  const fels = findeSchiebbarenFels();
  if (!fels) return false;
  const richtung = rasterRichtung(playerRoot.rotation.y);
  const ziel = fels.position.clone().addScaledVector(richtung, CELL);
  if (!zielfeldFrei(fels, ziel)) {
    showCombatMessage('DER FELS SITZT FEST', 0.7);
    playTone(96, 0.14, 0.022, 0, 'square');
    return true;
  }
  fels.userData.wirdGeschoben = true;
  felsSchub = {
    fels,
    von: fels.position.clone(),
    nach: ziel,
    zeit: 0,
    spielerVon: playerRoot.position.clone(),
    spielerNach: playerRoot.position.clone().addScaledVector(richtung, CELL)
  };
  playActorAnimation(playerRoot, 'holding-both', { restart: true, speed: 0.7, fade: 0.08 });
  playTone(132, 0.2, 0.026, 0, 'sawtooth');
  return true;
}

function loeseFelsSchub() {
  if (!felsSchub) return;
  felsSchub.fels.userData.wirdGeschoben = false;
  felsSchub = null;
}

function updateFelsSchub(delta) {
  if (!felsSchub) return;
  const schub = felsSchub;
  schub.zeit += delta;
  const anteil = THREE.MathUtils.clamp(schub.zeit / FELS.dauer, 0, 1);
  const weich = anteil * anteil * (3 - 2 * anteil);
  schub.fels.position.lerpVectors(schub.von, schub.nach, weich);
  // Der Spieler geht mit, sonst steht er im Fels.
  playerRoot.position.lerpVectors(schub.spielerVon, schub.spielerNach, weich);
  if (anteil < 1) return;
  schub.fels.position.copy(schub.nach);
  schub.fels.userData.wirdGeschoben = false;
  rebuildCombatNavigation(combatRoomIdForRoot(schub.fels));
  felsSchub = null;
  playTone(88, 0.16, 0.03, 0, 'triangle');
}

function spielerIstBeschaeftigt() {
  return Boolean(felsSchub);
}

// ---------------------------------------------------------------------------
// Fass tragen, ablegen, werfen
// Ein getragenes Fass blockiert nichts und nimmt keinen Schaden. Beim Werfen
// wird es zu einer eigenen Schadensquelle - der Kampfkern bleibt unberuehrt.
// ---------------------------------------------------------------------------
const FASS = Object.freeze({
  aufhebeReichweite: CELL * 0.95,
  tragHoehe: 0.34,
  tragAbstand: 0.58,
  abwurfHoehe: 0.5,
  abwurfAbstand: 0.85,
  // Weit genug vor den Fuessen, sonst steht die Figur im abgelegten Fass.
  ablegeAbstand: CELL * 0.62,
  ablegeNotAbstand: CELL * 0.42,
  schonzeit: 0.07,
  wurfTempo: 12.5,
  wurfHub: 4.6,
  schwerkraft: 19,
  trefferRadius: CELL * 0.34,
  schaden: 2,
  wucht: 14,
  flugZeitMax: 2.2
});

let getragenesFass = null;
let fassFlug = null;

function fassVorne(abstand, hoehe) {
  const richtung = new THREE.Vector3(
    Math.sin(playerRoot.rotation.y),
    0,
    Math.cos(playerRoot.rotation.y)
  );
  return playerRoot.position.clone().addScaledVector(richtung, abstand).setY(playerRoot.position.y + hoehe);
}

function findeTragbaresFass() {
  const vorne = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
  return combatDestructibles
    .filter((eintrag) => !eintrag.destroyed && eintrag.root.visible && !eintrag.root.userData.getragen)
    .map((eintrag) => {
      const versatz = eintrag.root.position.clone().sub(playerRoot.position);
      const hoehenUnterschied = Math.abs(versatz.y);
      versatz.y = 0;
      const abstand = versatz.length();
      const ausrichtung = abstand > 0.001 ? vorne.dot(versatz.normalize()) : -1;
      return { eintrag, abstand, ausrichtung, hoehenUnterschied };
    })
    .filter((kandidat) => kandidat.abstand < FASS.aufhebeReichweite
      && kandidat.hoehenUnterschied < CELL * 0.6
      && kandidat.ausrichtung > -0.25)
    .sort((a, b) => a.abstand - b.abstand)[0]?.eintrag ?? null;
}

function spielerKannFassGreifen() {
  return gameMode && playerHealth > 0 && !qaPanelOpen && !gameMenuOpen && !inventoryOpen
    && !equipmentOpen && !rewardOpen && !supplyOpen
    && playerAttackTimer <= 0 && playerDodgeTimer <= 0 && playerHookTimer <= 0
    && playerFallTimer <= 0 && playerRecoveryStunTimer <= 0 && playerHurtTimer <= 0;
}

function hebeFassAuf(eintrag) {
  getragenesFass = eintrag;
  eintrag.root.userData.getragen = true;
  setPlayerShielding(false);
  rebuildCombatNavigation(combatRoomIdForRoot(eintrag.root));
  playActorAnimation(playerRoot, 'pick-up', { once: true, restart: true, speed: 1.35, fade: 0.05 });
  playTone(196, 0.1, 0.02, 0, 'triangle');
  showCombatMessage('FASS AUFGENOMMEN', 0.7);
}

function legeFassAb() {
  if (!getragenesFass) return;
  const eintrag = getragenesFass;
  // Erst weit vorn versuchen. Steht da eine Wand, naeher heran, aber nie in die Figur.
  let platz = fassVorne(FASS.ablegeAbstand, 0);
  let boden = combatSurfaceAt(platz, playerRoot, { allowAnyHeight: true })?.y;
  if (!Number.isFinite(boden)) {
    platz = fassVorne(FASS.ablegeNotAbstand, 0);
    boden = combatSurfaceAt(platz, playerRoot, { allowAnyHeight: true })?.y;
  }
  eintrag.root.position.set(platz.x, Number.isFinite(boden) ? boden : playerRoot.position.y, platz.z);
  eintrag.root.userData.getragen = false;
  getragenesFass = null;
  rebuildCombatNavigation(combatRoomIdForRoot(eintrag.root));
  playActorAnimation(playerRoot, 'pick-up', { once: true, restart: true, speed: 1.1, fade: 0.05 });
  playTone(140, 0.12, 0.02, 0, 'triangle');
}

function wirfFass() {
  if (!getragenesFass) return false;
  const eintrag = getragenesFass;
  const richtung = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
  // Das Armband verstaerkt den Wurf, statt ihn erst zu erlauben.
  const kraft = armbandGetragen() ? 1.45 : 1;
  // Vom Koerper weg starten, sonst trifft das Fass sofort, was direkt daneben steht.
  eintrag.root.position.copy(fassVorne(FASS.abwurfAbstand, FASS.abwurfHoehe));
  fassFlug = {
    eintrag,
    geschwindigkeit: richtung.clone().multiplyScalar(FASS.wurfTempo * kraft).setY(FASS.wurfHub * kraft),
    kraft,
    richtung,
    lebenszeit: 0,
    drehung: new THREE.Vector3(0.7, 0.35, 1.15).multiplyScalar(6.2)
  };
  getragenesFass = null;
  playActorAnimation(playerRoot, 'attack-melee-right', { once: true, restart: true, speed: 1.5, fade: 0.03 });
  playPlayerAttackSound(0);
  return true;
}

function zerbrichFass(eintrag, richtung) {
  eintrag.root.userData.getragen = false;
  eintrag.root.visible = true;
  damageCombatDestructible(eintrag, eintrag.maxHealth, richtung, { impactScale: 1.25 });
}

function loesePlayerFass() {
  if (getragenesFass) {
    getragenesFass.root.userData.getragen = false;
    getragenesFass = null;
  }
  if (fassFlug) {
    fassFlug.eintrag.root.userData.getragen = false;
    fassFlug = null;
  }
}

function updateGetragenesFass() {
  if (!getragenesFass) return;
  const eintrag = getragenesFass;
  if (eintrag.destroyed) { getragenesFass = null; return; }
  const platz = fassVorne(FASS.tragAbstand, FASS.tragHoehe);
  eintrag.root.position.copy(platz);
  eintrag.root.rotation.y = playerRoot.rotation.y;
}

function updateFassFlug(delta) {
  if (!fassFlug) return;
  const flug = fassFlug;
  const eintrag = flug.eintrag;
  const root = eintrag.root;
  flug.lebenszeit += delta;
  const scharf = flug.lebenszeit > FASS.schonzeit;
  flug.geschwindigkeit.y -= FASS.schwerkraft * delta;
  root.position.addScaledVector(flug.geschwindigkeit, delta);
  root.rotation.x += flug.drehung.x * delta;
  root.rotation.y += flug.drehung.y * delta;
  root.rotation.z += flug.drehung.z * delta;

  // Gegner zuerst - das ist der Grund, warum man ueberhaupt wirft.
  const getroffenerGegner = scharf && combatEnemies.find((gegner) => gegner.active && gegner.alive
    && gegner.root.position.distanceTo(root.position) < FASS.trefferRadius + (gegner.bodyRadius ?? 0.3));
  if (getroffenerGegner) {
    damageEnemy(getroffenerGegner, Math.round(FASS.schaden * (flug.kraft ?? 1)), flug.richtung.clone(), {
      knockback: FASS.wucht * (flug.kraft ?? 1),
      impactScale: 1.3
    });
    fassFlug = null;
    zerbrichFass(eintrag, flug.richtung);
    return;
  }

  // Andere Faesser zerlegen
  const getroffenesFass = scharf && combatDestructibles.find((anderes) => anderes !== eintrag
    && !anderes.destroyed && anderes.root.visible && !anderes.root.userData.getragen
    && anderes.root.position.distanceTo(root.position) < FASS.trefferRadius + CELL * 0.28);
  if (getroffenesFass) {
    fassFlug = null;
    damageCombatDestructible(getroffenesFass, getroffenesFass.maxHealth, flug.richtung.clone(), { impactScale: 1.1 });
    zerbrichFass(eintrag, flug.richtung);
    return;
  }

  const boden = combatSurfaceAt(root.position, playerRoot, { allowAnyHeight: true })?.y;
  if ((scharf && Number.isFinite(boden) && root.position.y <= boden + 0.06) || flug.lebenszeit > FASS.flugZeitMax) {
    if (Number.isFinite(boden)) root.position.y = boden;
    fassFlug = null;
    zerbrichFass(eintrag, flug.richtung);
  }
}

function fassInteraktion() {
  if (!spielerKannFassGreifen()) return false;
  if (getragenesFass) { legeFassAb(); return true; }
  const kandidat = findeTragbaresFass();
  if (!kandidat) return false;
  hebeFassAuf(kandidat);
  return true;
}

function startPlayerHook() {
  if (openRewardChest()) return;
  if (fassInteraktion()) return;
  if (getragenesFass) return;
  if (schiebeFels()) return;
  if (!isEquipmentUnlocked(equipmentProgress, 'hook')) {
    showCombatMessage('ENTERHAKEN NOCH NICHT GEFUNDEN', 0.85);
    return;
  }
  if (!gameMode || qaPanelOpen || gameMenuOpen || inventoryOpen || equipmentOpen || rewardOpen || supplyOpen || playerHealth <= 0 || playerHookCooldown > 0
    || playerAttackTimer > 0 || playerDodgeTimer > 0 || playerFallTimer > 0
    || playerRecoveryStunTimer > 0 || playerHurtTimer > 0 || playerAttackReboundTimer > 0
    || playerShielding) return;
  const target = findGrappleTarget();
  if (!target) {
    showCombatMessage('Kein Halt', 0.72);
    return;
  }
  cancelPlayerAttackCharge();
  playerHookTarget = target.point;
  playerHookTargetRoot = target.root;
  setWachtankerTargeted(playerHookTargetRoot, true);
  resetPlayerDropIntent();
  playerHookStartY = playerRoot.position.y;
  playerHookLandingY = combatSurfaceAt(target.root.position, playerRoot, { allowAnyHeight: true })?.y
    ?? playerHookStartY;
  playerHookTimer = 0.82;
  playerHookCooldown = 1.08 * runProgress.hookCooldownMultiplier;
  hookLine.visible = true;
  hookTip.visible = true;
  hookChainRoot.visible = true;
  setPlayerHookEquipmentStowed(true);
  hookButton.classList.add('is-active');
  playerRoot.rotation.y = Math.atan2(
    playerHookTarget.x - playerRoot.position.x,
    playerHookTarget.z - playerRoot.position.z
  );
  playActorAnimation(playerRoot, 'jump', { restart: true, speed: 0.92, fade: 0.04 });
}

function updatePlayerHook(delta) {
  playerHookCooldown = Math.max(0, playerHookCooldown - delta);
  hookButton.disabled = !isEquipmentUnlocked(equipmentProgress, 'hook') || playerHookCooldown > 0.04;
  if (playerHookTimer <= 0 || !playerHookTarget) return false;

  playerHookTimer = Math.max(0, playerHookTimer - delta);
  const progress = 1 - playerHookTimer / 0.82;
  const start = playerRoot.position.clone().add(new THREE.Vector3(0, 0.82, 0));
  const tipPosition = progress < 0.27
    ? start.clone().lerp(playerHookTarget, progress / 0.27)
    : playerHookTarget.clone();
  updatePlayerHookVisuals(start, tipPosition);

  if (progress >= 0.25) {
    const pull = playerHookTarget.clone().sub(playerRoot.position);
    pull.y = 0;
    const distance = pull.length();
    if (distance > CELL * 0.72) {
      pull.normalize();
      lastMoveDirection.copy(pull);
      const moved = moveCombatRoot(
        playerRoot,
        pull.clone().multiplyScalar(delta * 10.2),
        PLAYER_BODY_RADIUS,
        { allowVoid: true, preserveHeight: true }
      );
      if (moved) playerDustTimer = 0;
    }
    const pullProgress = THREE.MathUtils.clamp((progress - 0.25) / 0.75, 0, 1);
    playerRoot.position.y = THREE.MathUtils.lerp(playerHookStartY, playerHookLandingY, pullProgress)
      + Math.sin(pullProgress * Math.PI) * CELL * 0.18;
  }

  if (playerHookTimer <= 0) {
    const landed = snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
    cancelPlayerHook();
    if (!landed) beginPlayerFall();
    playActorAnimation(playerRoot, 'idle', { fade: 0.08 });
  }
  return true;
}

function combatEffectRoot(effect) {
  return effect.root ?? effect.mesh;
}

function disposeCombatEffect(effect) {
  const root = combatEffectRoot(effect);
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.filter(Boolean).forEach((material) => {
      materials.add(material);
      if (material.map) textures.add(material.map);
    });
  });
  root.removeFromParent();
  if (effect.disposeGeometry !== false) {
    geometries.forEach((geometry) => geometry.dispose());
  }
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function setCombatEffectOpacity(root, factor) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.filter(Boolean).forEach((material) => {
      if (material.userData.combatBaseOpacity === undefined) {
        material.userData.combatBaseOpacity = material.opacity;
      }
      material.opacity = material.userData.combatBaseOpacity * factor;
    });
  });
}

function updateCombatEffectAnchor(effect) {
  if (!effect.anchor) return;
  const root = combatEffectRoot(effect);
  const forward = new THREE.Vector3(Math.sin(effect.facing), 0, Math.cos(effect.facing));
  const right = new THREE.Vector3(Math.cos(effect.facing), 0, -Math.sin(effect.facing));
  effect.anchor.getWorldPosition(root.position);
  root.position.addScaledVector(right, effect.anchorOffset.x);
  root.position.addScaledVector(forward, effect.anchorOffset.z);
  root.position.y += effect.anchorOffset.y;
}

function registerCombatEffect(root, life, options = {}) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.renderOrder = 20;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.filter(Boolean).forEach((material) => {
      material.userData.combatBaseOpacity = material.opacity;
    });
  });
  scene.add(root);
  const effect = {
    root,
    life,
    maxLife: life,
    baseScale: root.scale.clone(),
    scaleFrom: options.scaleFrom ?? 0.9,
    scaleTo: options.scaleTo ?? 1.12,
    ...options
  };
  updateCombatEffectAnchor(effect);
  combatEffects.push(effect);
  return effect;
}

function clearCombatEffects() {
  combatEffects.splice(0).forEach(disposeCombatEffect);
}

function clearCombatEffectsByKind(kind) {
  for (let index = combatEffects.length - 1; index >= 0; index -= 1) {
    if (combatEffects[index].kind !== kind) continue;
    disposeCombatEffect(combatEffects[index]);
    combatEffects.splice(index, 1);
  }
}

function spawnPlayerDust(direction, intensity = 1) {
  if (!playerRoot || !direction.lengthSq()) return;
  const forward = direction.clone().setY(0).normalize();
  const backward = forward.clone().negate();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const root = new THREE.Group();
  root.position.copy(playerRoot.position);
  root.position.addScaledVector(backward, 0.24 + intensity * 0.035);
  root.position.addScaledVector(right, playerDustStepSide * 0.13);
  root.position.y += 0.055;
  playerDustStepSide *= -1;

  const geometry = new THREE.DodecahedronGeometry(0.1, 0);
  const materials = [
    ['#d8d0bd', 0.3],
    ['#aaa797', 0.25],
    ['#eee5cf', 0.22]
  ].map(([color, opacity]) => new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity,
    depthWrite: false
  }));
  const particles = [];
  const count = intensity >= 1.4 ? 5 : 3;

  for (let index = 0; index < count; index += 1) {
    const spread = count === 1 ? 0 : index / (count - 1) - 0.5;
    const puff = new THREE.Mesh(geometry, materials[index % materials.length]);
    puff.position.addScaledVector(right, spread * (0.34 + intensity * 0.05));
    puff.position.addScaledVector(backward, (index % 2) * 0.08);
    puff.position.y = (index % 3) * 0.018;
    const size = (0.72 + (index % 3) * 0.18) * intensity;
    puff.scale.set(size * 1.25, size * 0.62, size);
    root.add(puff);

    const velocity = backward.clone().multiplyScalar(0.34 + intensity * 0.22 + index * 0.025);
    velocity.addScaledVector(right, spread * (0.72 + intensity * 0.16));
    velocity.y = 0.22 + intensity * 0.15 + (index % 2) * 0.08;
    particles.push({
      mesh: puff,
      velocity,
      spin: new THREE.Vector3(
        (index % 2 ? -1 : 1) * 1.1,
        0.65 + index * 0.18,
        (index % 2 ? 1 : -1) * 0.72
      )
    });
  }

  registerCombatEffect(root, 0.34 + intensity * 0.055, {
    kind: 'player-foot-dust',
    particles,
    gravity: -0.5,
    drag: 2.6,
    scaleFrom: 0.66,
    scaleTo: 1.36,
    opacityCurve: (progress) => {
      const fadeIn = THREE.MathUtils.clamp(progress / 0.16, 0, 1);
      const fadeOut = Math.pow(1 - progress, 1.55);
      return Math.min(fadeIn, fadeOut);
    }
  });
}

function updatePlayerDustTrail(delta, direction, intensity = 1) {
  playerDustTimer = Math.max(0, playerDustTimer - delta);
  if (playerDustTimer > 0) return;
  spawnPlayerDust(direction, intensity);
  playerDustTimer = THREE.MathUtils.lerp(0.16, 0.075, THREE.MathUtils.clamp((intensity - 0.6) / 1.1, 0, 1));
}

function spawnPlayerLandingDust(strength = 1) {
  if (!playerRoot) return;
  const root = new THREE.Group();
  root.position.copy(playerRoot.position);
  root.position.y += 0.045;
  const geometry = new THREE.DodecahedronGeometry(0.12, 0);
  const material = new THREE.MeshStandardMaterial({
    color: '#d8d0bd',
    roughness: 1,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  });
  const particles = [];
  const count = 8;

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const puff = new THREE.Mesh(geometry, material.clone());
    puff.position.addScaledVector(direction, 0.18 + (index % 2) * 0.08);
    puff.scale.setScalar(0.58 + strength * 0.24 + (index % 3) * 0.06);
    root.add(puff);
    particles.push({
      mesh: puff,
      velocity: direction.multiplyScalar(0.55 + strength * 0.38),
      spin: new THREE.Vector3(0.9 + index * 0.08, 0.6, -0.7)
    });
  }

  registerCombatEffect(root, 0.32 + strength * 0.08, {
    kind: 'player-landing-dust',
    particles,
    gravity: -0.42,
    drag: 2.25,
    scaleFrom: 0.74,
    scaleTo: 1.52,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.55)
  });
}

function spawnBarrelBreakEffect(position, hitDirection) {
  const root = new THREE.Group();
  root.position.copy(position);
  root.position.y += 0.58;
  const particles = [];
  const fragmentGeometry = new RoundedBoxGeometry(0.13, 0.34, 0.09, 2, 0.025);
  const fragmentMaterials = ['#6f3f25', '#8f5730', '#b4773e', '#4b2c1c'].map((color) => (
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 1
    })
  ));
  const push = hitDirection.clone().setY(0).normalize();

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10 + 0.23;
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterials[index % fragmentMaterials.length]);
    fragment.position.copy(radial).multiplyScalar(0.08 + (index % 3) * 0.035);
    fragment.position.y = (index % 4) * 0.045 - 0.08;
    fragment.rotation.set(angle * 0.7, angle, -angle * 0.45);
    const size = 0.72 + (index % 4) * 0.1;
    fragment.scale.set(size, 0.72 + (index % 2) * 0.35, size);
    root.add(fragment);

    const velocity = radial.multiplyScalar(1.4 + (index % 3) * 0.28);
    velocity.addScaledVector(push, 1.0 + (index % 2) * 0.35);
    velocity.y = 2.3 + (index % 4) * 0.48;
    particles.push({
      mesh: fragment,
      velocity,
      spin: new THREE.Vector3(
        (index % 2 ? -1 : 1) * (5.2 + index * 0.22),
        3.6 + index * 0.31,
        (index % 3 - 1) * 5.4
      )
    });
  }

  registerCombatEffect(root, 0.82, {
    kind: 'barrel-fragments',
    particles,
    gravity: -8.4,
    drag: 0.72,
    scaleFrom: 0.9,
    scaleTo: 0.72,
    opacityCurve: (progress) => progress < 0.6 ? 1 : Math.pow(1 - (progress - 0.6) / 0.4, 1.35)
  });
}

function createLootCoin(position, angle, index) {
  const model = SkeletonUtils.clone(assets.get('coin').scene);
  prepareModel(model);

  const root = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(model);
  frame.scale.setScalar(modelScale * 0.46);
  root.add(frame);
  scene.add(root);
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  frame.position.set(-center.x, -bounds.min.y, -center.z);
  const groundY = Number.isFinite(position.y) ? position.y + 0.08 : 0.26;
  root.position.copy(position);
  root.position.y = groundY;
  root.rotation.set(0.18, angle, Math.PI * 0.5);

  const speed = 1.6 + (index % 3) * 0.36;
  return {
    root,
    age: 0,
    groundY,
    verticalVelocity: 3.6 + (index % 2) * 0.65,
    velocity: new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed),
    spin: (index % 2 ? -1 : 1) * (5.5 + index * 0.22),
    magnet: 0,
    phase: angle,
    value: 1
  };
}

function spawnEnemyLoot(enemy) {
  const reward = enemy.coinReward ?? 1;
  for (let index = 0; index < reward; index += 1) {
    const angle = (Math.PI * 2 * index) / reward + enemy.root.id * 0.37;
    lootDrops.push(createLootCoin(enemy.root.position, angle, index));
  }
}

function spawnBarrelLoot(destructible) {
  const reward = Math.random() < 0.3 ? 2 : 1;
  for (let index = 0; index < reward; index += 1) {
    const angle = (Math.PI * 2 * index) / reward + destructible.root.id * 0.41;
    lootDrops.push(createLootCoin(destructible.root.position, angle, index));
  }
}

function disposeLootRoot(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
  });
  scene.remove(root);
}

function clearLootDrops() {
  lootDrops.splice(0).forEach((drop) => disposeLootRoot(drop.root));
}

function restorePendingCoins(entries = []) {
  clearLootDrops();
  entries.forEach((entry, index) => {
    const position = new THREE.Vector3(
      Number(entry.position?.x) || 0,
      Number(entry.position?.y) || 0.26,
      Number(entry.position?.z) || 0
    );
    const drop = createLootCoin(
      new THREE.Vector3(position.x, position.y - 0.08, position.z),
      index * 1.618,
      index
    );
    drop.root.position.copy(position);
    drop.groundY = position.y;
    drop.verticalVelocity = 0;
    drop.velocity.set(0, 0, 0);
    drop.age = 0.5;
    drop.value = Math.max(1, Math.floor(Number(entry.value) || 1));
    lootDrops.push(drop);
  });
}

function pulseCoinHud() {
  coinReadout.classList.remove('is-pulsing');
  void coinReadout.offsetWidth;
  coinReadout.classList.add('is-pulsing');
}

function collectLootCoin(index) {
  const [drop] = lootDrops.splice(index, 1);
  if (!drop) return;
  inventoryState.coins += drop.value;
  updateInventoryHud();
  pulseCoinHud();
  playCoinChime();
  disposeLootRoot(drop.root);
}

function updateLootDrops(delta) {
  for (let index = lootDrops.length - 1; index >= 0; index -= 1) {
    const drop = lootDrops[index];
    drop.age += delta;
    drop.root.rotation.y += drop.spin * delta;
    drop.root.rotation.z += drop.spin * delta * 0.28;

    if (drop.verticalVelocity !== 0) {
      drop.root.position.addScaledVector(drop.velocity, delta);
      drop.velocity.multiplyScalar(Math.exp(-delta * 2.8));
      drop.verticalVelocity -= 11.5 * delta;
      drop.root.position.y += drop.verticalVelocity * delta;
      if (drop.root.position.y <= drop.groundY) {
        drop.root.position.y = drop.groundY;
        if (Math.abs(drop.verticalVelocity) > 1.25) {
          drop.verticalVelocity = Math.abs(drop.verticalVelocity) * 0.32;
        } else {
          drop.verticalVelocity = 0;
        }
      }
      continue;
    }

    drop.root.position.y = drop.groundY + Math.sin(drop.age * 6.4 + drop.phase) * 0.06;
    if (drop.age < 0.48 || playerHealth <= 0) continue;

    const target = playerRoot.position.clone();
    target.y += 0.62;
    const toPlayer = target.sub(drop.root.position);
    const distance = toPlayer.length();
    const groundDistance = Math.hypot(toPlayer.x, toPlayer.z);
    if (distance > COIN_MAGNET_RADIUS * runProgress.magnetRadiusMultiplier) {
      drop.magnet = Math.max(0, drop.magnet - delta * 2);
      continue;
    }

    drop.magnet = Math.min(1, drop.magnet + delta * 3.4);
    const speed = THREE.MathUtils.lerp(3.8, 13.5, drop.magnet);
    drop.root.position.addScaledVector(toPlayer.normalize(), Math.min(distance, speed * delta));
    if (groundDistance <= COIN_COLLECT_RADIUS) collectLootCoin(index);
  }
}

function createCombatEffectMaterial(color, opacity = 0.8) {
  const glow = new THREE.Color(color).multiplyScalar(0.24);
  return new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: 0.48,
    roughness: 0.72,
    metalness: 0.04,
    flatShading: true,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function createCombatFxPalette(color, opacity) {
  const base = new THREE.Color(color);
  const hot = base.clone().lerp(new THREE.Color('#ffffff'), 0.22);
  const deep = base.clone().lerp(new THREE.Color('#120d0a'), 0.12);
  return [
    createCombatEffectMaterial(base, opacity),
    createCombatEffectMaterial(hot, Math.min(1, opacity + 0.04)),
    createCombatEffectMaterial(deep, opacity * 0.86)
  ];
}

function createStarGeometry(outerRadius, innerRadius, depth, points = 4) {
  const shape = new THREE.Shape();
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI * 0.5 + (Math.PI * index) / points;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(innerRadius * 0.24, depth * 0.32),
    bevelThickness: depth * 0.22,
    curveSegments: 1
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function currentAttackFxColor() {
  if (playerSpecialAttack?.id === 'shield-bash') return '#a9d7f2';
  const profile = ATTACK_FX_PROFILE_KEYS[playerAttackStep] ?? 'attack1';
  return attackFxSettings[equippedWeapon]?.[profile]?.color ?? '#ffbf32';
}

function spawnHitImpact(position, lethal) {
  const root = new THREE.Group();
  root.position.copy(position);
  root.position.y += 0.78;
  const particles = [];

  const whiteMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const mainStar = new THREE.Mesh(
    createStarGeometry(lethal ? 0.42 : 0.3, lethal ? 0.105 : 0.078, 0.085),
    whiteMaterial
  );
  mainStar.rotation.set(-0.64, 0.46, 0.18);
  root.add(mainStar);
  particles.push({
    mesh: mainStar,
    velocity: new THREE.Vector3(0, 0.2, 0),
    spin: new THREE.Vector3(1.2, 2.4, lethal ? 6.8 : 5.4)
  });

  const sparkGeometry = createStarGeometry(lethal ? 0.16 : 0.12, lethal ? 0.045 : 0.034, 0.045);
  const sparkCount = lethal ? 5 : 3;
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = (Math.PI * 2 * index) / sparkCount + 0.34;
    const spark = new THREE.Mesh(sparkGeometry, whiteMaterial);
    spark.position.set(Math.cos(angle) * 0.1, (index % 2) * 0.05, Math.sin(angle) * 0.1);
    spark.rotation.set(-0.45 + index * 0.14, angle * 0.36, angle);
    root.add(spark);
    particles.push({
      mesh: spark,
      velocity: new THREE.Vector3(
        Math.cos(angle) * (1.75 + (index % 2) * 0.35),
        0.72 + (index % 3) * 0.3,
        Math.sin(angle) * (1.75 + (index % 2) * 0.35)
      ),
      spin: new THREE.Vector3(4.2 + index, -3.4 + index * 0.5, 6.2 - index * 0.32)
    });
  }

  const fragmentMaterials = createCombatFxPalette(currentAttackFxColor(), 0.96);
  const fragmentGeometry = new RoundedBoxGeometry(
    lethal ? 0.13 : 0.1,
    lethal ? 0.09 : 0.07,
    lethal ? 0.18 : 0.14,
    2,
    lethal ? 0.027 : 0.021
  );
  const fragmentCount = lethal ? 7 : 4;
  for (let index = 0; index < fragmentCount; index += 1) {
    const angle = (Math.PI * 2 * index) / fragmentCount + 0.68;
    const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterials[index % fragmentMaterials.length]);
    fragment.position.set(Math.cos(angle) * 0.08, -0.02, Math.sin(angle) * 0.08);
    fragment.rotation.set(angle, angle * 0.42, -angle * 0.58);
    root.add(fragment);
    particles.push({
      mesh: fragment,
      velocity: new THREE.Vector3(
        Math.cos(angle) * (2.1 + (index % 3) * 0.26),
        0.64 + (index % 3) * 0.28,
        Math.sin(angle) * (2.1 + (index % 3) * 0.26)
      ),
      spin: new THREE.Vector3(5.8 - index * 0.22, 4.4 + index * 0.36, -4.6 + index * 0.48)
    });
  }

  registerCombatEffect(root, lethal ? 0.36 : 0.29, {
    particles,
    gravity: -3.2,
    drag: 2.35,
    scaleFrom: 0.82,
    scaleTo: lethal ? 1.3 : 1.14
  });
}

function spawnWeaponReboundSparks(contact, weapon = equippedWeapon) {
  if (!contact?.position) return null;
  const root = new THREE.Group();
  root.position.copy(contact.position);
  const particles = [];
  const normal = contact.normal?.clone().setY(0) ?? new THREE.Vector3(0, 0, -1);
  if (normal.lengthSq() < 0.0001) normal.set(0, 0, -1);
  normal.normalize();
  const tangent = new THREE.Vector3(normal.z, 0, -normal.x);
  const accent = weapon === 'spear' ? '#5cddff' : weapon === 'shield' ? '#b9e8ff' : '#ffc238';

  const whiteMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const starGeometry = createStarGeometry(0.22, 0.052, 0.055);
  const star = new THREE.Mesh(starGeometry, whiteMaterial);
  star.rotation.set(-0.58, Math.atan2(normal.x, normal.z), 0.24);
  root.add(star);
  particles.push({
    mesh: star,
    velocity: normal.clone().multiplyScalar(0.42).setY(0.32),
    spin: new THREE.Vector3(4.8, 7.2, 8.4)
  });

  const materials = createCombatFxPalette(accent, 0.98);
  const fragmentGeometry = new RoundedBoxGeometry(0.075, 0.055, 0.16, 2, 0.018);
  for (let index = 0; index < WEAPON_REBOUND_PROFILE.sparkCount; index += 1) {
    const side = index / Math.max(1, WEAPON_REBOUND_PROFILE.sparkCount - 1) - 0.5;
    const fragment = new THREE.Mesh(fragmentGeometry, materials[index % materials.length]);
    fragment.position.addScaledVector(tangent, side * 0.16);
    fragment.position.y = (index % 3 - 1) * 0.025;
    fragment.rotation.set(index * 0.58, index * 0.82, -index * 0.44);
    root.add(fragment);
    const velocity = normal.clone().multiplyScalar(1.25 + (index % 3) * 0.34);
    velocity.addScaledVector(tangent, side * (3.5 + (index % 2) * 0.7));
    velocity.y = 0.52 + (index % 4) * 0.28;
    particles.push({
      mesh: fragment,
      velocity,
      spin: new THREE.Vector3(
        (index % 2 ? -1 : 1) * (6.2 + index * 0.18),
        5.4 + index * 0.36,
        (index % 3 - 1) * 7.2
      )
    });
  }

  const light = new THREE.PointLight('#fff4cf', 1.8, CELL * 1.15, 2);
  root.add(light);
  return registerCombatEffect(root, 0.3, {
    kind: 'weapon-world-sparks',
    particles,
    gravity: -5.2,
    drag: 1.9,
    light,
    lightBaseIntensity: light.intensity,
    scaleFrom: 0.78,
    scaleTo: 1.08,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.65)
  });
}

function spawnAttackChargeRing(weapon = equippedWeapon) {
  if (!playerRoot) return null;
  const config = attackFxSettings[weapon]?.attack6 ?? ATTACK_FX_DEFAULTS[weapon]?.attack6;
  if (!config?.enabled) return null;
  const root = new THREE.Group();
  const materials = createCombatFxPalette(config.color, config.opacity * 0.72);
  const geometry = new RoundedBoxGeometry(0.12, 0.07, 0.24, 2, 0.025);
  const count = weapon === 'spear' ? 16 : 14;

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const block = new THREE.Mesh(geometry, materials[index % materials.length]);
    const radius = THREE.MathUtils.lerp(0.72, 1.02, index % 2);
    block.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    block.rotation.y = -angle;
    block.rotation.z = (index % 2 ? -1 : 1) * 0.14;
    root.add(block);
  }

  return registerCombatEffect(root, 0.52, {
    kind: 'attack-charge-ring',
    anchor: playerRoot,
    anchorOffset: new THREE.Vector3(0, 0.08, 0),
    facing: playerRoot.rotation.y,
    rootSpin: new THREE.Vector3(0, 4.8, 0),
    scaleFrom: 0.68,
    scaleTo: 1.08,
    opacityCurve: (progress) => Math.sin(Math.PI * progress) * (1 - progress * 0.22)
  });
}

// ---------------------------------------------------------------------------
// Klingenspur
// Ein durchgehendes Band entlang der tatsaechlichen Klingenbahn. Es ersetzt
// keine bestehende Wirkung, sondern liegt zusaetzlich ueber dem Schwung.
// ---------------------------------------------------------------------------
const BLADE_TRAIL_MAX_SEGMENTS = 34;
const BLADE_TRAIL_LIFE = 0.26;
const BLADE_TRAIL_MIN_STEP = 0.01;
// Hier stellst du die Spur ein. Alle Werte in lokalen Modellmassen der Waffe.
//   ansatz     Wo die Spur an der Waffe beginnt. Kleiner = naeher am Griff.
//   spitze     Wo die Klinge endet.
//   ueberhang  Wie weit die Spur ueber die Spitze hinausreicht. Groesser = breiteres Band.
//   kanteGrad  In welche Richtung die Spur seitlich versetzt wird. 0 / 90 / 180 / 270
//              drehen sie um die Klingenachse. Damit legst du fest, welche Seite
//              die Schlagseite sein soll.
//   kanteTiefe Wie weit sie in diese Richtung versetzt wird. 0 = mittig auf der Klinge.
const BLADE_TRAIL_EXTENTS = Object.freeze({
  sword: Object.freeze({ ansatz: 0.02, spitze: 0.35, ueberhang: 0.2, kanteGrad: 0, kanteTiefe: 0 }),
  spear: Object.freeze({ ansatz: 0.18, spitze: 0.6, ueberhang: 0.22, kanteGrad: 0, kanteTiefe: 0 })
});

const bladeTrail = {
  mesh: null,
  geometry: null,
  positions: null,
  colors: null,
  samples: [],
  weapon: null,
  active: false,
  color: new THREE.Color('#cdefff'),
  strength: 0.9
};
const bladeTrailTip = new THREE.Vector3();
const bladeTrailBase = new THREE.Vector3();

function createBladeTrailMesh() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(BLADE_TRAIL_MAX_SEGMENTS * 2 * 3);
  const colors = new Float32Array(BLADE_TRAIL_MAX_SEGMENTS * 2 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const indices = [];
  for (let index = 0; index < BLADE_TRAIL_MAX_SEGMENTS - 1; index += 1) {
    const corner = index * 2;
    indices.push(corner, corner + 1, corner + 3, corner, corner + 3, corner + 2);
  }
  geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 21;
  mesh.visible = false;
  scene.add(mesh);
  bladeTrail.mesh = mesh;
  bladeTrail.geometry = geometry;
  bladeTrail.positions = positions;
  bladeTrail.colors = colors;
}

function startBladeTrail(weapon, step) {
  if (!bladeTrail.mesh) createBladeTrailMesh();
  const config = attackFxSettings[weapon]?.[ATTACK_FX_PROFILE_KEYS[step]];
  bladeTrail.weapon = weapon;
  bladeTrail.active = true;
  bladeTrail.samples.length = 0;
  bladeTrail.color.set(config?.color ?? '#cdefff');
  bladeTrail.strength = THREE.MathUtils.clamp(config?.opacity ?? 0.9, 0.2, 1);
}

function stopBladeTrail() {
  bladeTrail.active = false;
}

function clearBladeTrail() {
  bladeTrail.active = false;
  bladeTrail.samples.length = 0;
  if (bladeTrail.mesh) {
    bladeTrail.mesh.visible = false;
    bladeTrail.geometry.setDrawRange(0, 0);
  }
}

function updateBladeTrail(delta) {
  if (!bladeTrail.mesh) return;
  if (!gameMode) {
    clearBladeTrail();
    return;
  }
  const samples = bladeTrail.samples;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    samples[index].age += delta;
    if (samples[index].age >= BLADE_TRAIL_LIFE) samples.splice(index, 1);
  }

  const model = bladeTrail.active ? equipmentSockets.get(bladeTrail.weapon)?.model : null;
  if (model?.visible) {
    const extents = BLADE_TRAIL_EXTENTS[bladeTrail.weapon] ?? BLADE_TRAIL_EXTENTS.sword;
    model.updateWorldMatrix(true, false);
    const kante = THREE.MathUtils.degToRad(extents.kanteGrad);
    const seitlichX = Math.sin(kante) * extents.kanteTiefe;
    const seitlichZ = Math.cos(kante) * extents.kanteTiefe;
    bladeTrailBase.set(seitlichX, extents.ansatz, seitlichZ).applyMatrix4(model.matrixWorld);
    bladeTrailTip
      .set(seitlichX, extents.spitze + extents.ueberhang, seitlichZ)
      .applyMatrix4(model.matrixWorld);
    const last = samples[samples.length - 1];
    if (!last || last.tip.distanceTo(bladeTrailTip) > BLADE_TRAIL_MIN_STEP) {
      samples.push({ tip: bladeTrailTip.clone(), base: bladeTrailBase.clone(), age: 0 });
      if (samples.length > BLADE_TRAIL_MAX_SEGMENTS) samples.shift();
    }
  }

  const count = samples.length;
  if (count < 2) {
    bladeTrail.mesh.visible = false;
    bladeTrail.geometry.setDrawRange(0, 0);
    return;
  }

  const { positions, colors, color, strength } = bladeTrail;
  for (let index = 0; index < count; index += 1) {
    const sample = samples[index];
    const offset = index * 6;
    positions[offset] = sample.base.x;
    positions[offset + 1] = sample.base.y;
    positions[offset + 2] = sample.base.z;
    positions[offset + 3] = sample.tip.x;
    positions[offset + 4] = sample.tip.y;
    positions[offset + 5] = sample.tip.z;
    const fade = 1 - sample.age / BLADE_TRAIL_LIFE;
    const head = (index + 1) / count;
    const inner = fade * fade * head * strength * 0.42;
    const outer = fade * head * strength * 0.85;
    colors[offset] = color.r * inner;
    colors[offset + 1] = color.g * inner;
    colors[offset + 2] = color.b * inner;
    colors[offset + 3] = Math.min(1, color.r * outer + outer * 0.16);
    colors[offset + 4] = Math.min(1, color.g * outer + outer * 0.16);
    colors[offset + 5] = Math.min(1, color.b * outer + outer * 0.16);
  }
  bladeTrail.geometry.attributes.position.needsUpdate = true;
  bladeTrail.geometry.attributes.color.needsUpdate = true;
  bladeTrail.geometry.setDrawRange(0, (count - 1) * 6);
  bladeTrail.mesh.visible = true;
}

function addSwingBlockTrail(root, step, config, isSpear, sweepDirection = 1) {
  const whirlwind = step === 5;
  const sickle = step === 3 || step === 4;
  const count = whirlwind ? (isSpear ? 28 : 24) : sickle ? (isSpear ? 18 : 16) : isSpear ? 13 : 11;
  const radius = whirlwind ? (isSpear ? 1.48 : 1.3) : sickle ? (isSpear ? 1.34 : 1.18) : isSpear ? 1.14 : 0.96;
  const startAngle = whirlwind
    ? -Math.PI
    : sickle ? (sweepDirection > 0 ? -Math.PI : 0)
      : step === 0 ? -Math.PI * 0.62 : -Math.PI * 0.54;
  const arcAngle = whirlwind
    ? Math.PI * 2
    : sickle ? Math.PI * sweepDirection
      : step === 0 ? Math.PI * 1.08 : Math.PI * 0.92;
  const geometry = new RoundedBoxGeometry(0.31, 0.14, 0.18, 2, 0.042);
  const accentGeometry = new RoundedBoxGeometry(0.2, 0.095, 0.13, 2, 0.03);
  const materials = createCombatFxPalette(config.color, config.opacity);
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const progress = whirlwind ? index / count : index / (count - 1);
    const angle = startAngle + arcAngle * progress;
    const useAccent = index % 4 === 0;
    const block = new THREE.Mesh(
      useAccent ? accentGeometry : geometry,
      materials[index % materials.length]
    );
    const trailRadius = radius + Math.sin(progress * Math.PI) * (whirlwind ? 0.12 : sickle ? 0.18 : isSpear ? 0.12 : 0.08);
    block.position.set(
      Math.cos(angle) * trailRadius,
      Math.sin(angle) * trailRadius,
      (index % 2 === 0 ? 1 : -1) * 0.022
    );
    block.rotation.z = angle + Math.PI * 0.5;
    const taper = whirlwind
      ? 0.72 + Math.sin(progress * Math.PI * 2) ** 2 * 0.42
      : sickle
      ? THREE.MathUtils.lerp(0.42, 1.18, Math.sin(progress * Math.PI))
      : THREE.MathUtils.lerp(0.54, 1.08, progress);
    block.scale.set(taper, 0.82 + (index % 3) * 0.08, 0.9);
    block.visible = !sickle;
    root.add(block);
    const radial = new THREE.Vector3(block.position.x, block.position.y, 0).normalize();
    const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
    const velocity = radial.multiplyScalar(config.drift * THREE.MathUtils.lerp(0.28, 0.72, progress));
    velocity.addScaledVector(tangent, config.drift * (index % 2 ? -0.09 : 0.09));
    particles.push({
      mesh: block,
      velocity,
      spin: new THREE.Vector3(
        (index % 2 ? -1 : 1) * (0.55 + config.drift * 0.22),
        (index % 3 - 1) * (0.42 + config.drift * 0.15),
        (index % 2 ? 1 : -1) * (0.9 + config.drift * 0.34)
      ),
      revealAt: sickle ? progress * 0.74 : null,
      trailWindow: sickle ? 0.4 : null
    });
  }
  return particles;
}

function addThrustBlockTrail(root, config, isSpear, facing) {
  const count = isSpear ? 14 : 9;
  const length = isSpear ? 2.75 : 1.45;
  const directionAngle = facing + THREE.MathUtils.degToRad(config.rotation);
  const forward = new THREE.Vector3(Math.sin(directionAngle), 0, Math.cos(directionAngle));
  const geometry = new RoundedBoxGeometry(
    isSpear ? 0.11 : 0.14,
    isSpear ? 0.08 : 0.1,
    isSpear ? 0.28 : 0.24,
    2,
    isSpear ? 0.022 : 0.028
  );
  const materials = createCombatFxPalette(config.color, config.opacity);
  const right = new THREE.Vector3(Math.cos(directionAngle), 0, -Math.sin(directionAngle));
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const block = new THREE.Mesh(geometry, materials[(index + 1) % materials.length]);
    const distance = THREE.MathUtils.lerp(0.12, length, progress);
    block.position.copy(forward).multiplyScalar(distance);
    block.position.y = Math.sin(progress * Math.PI) * 0.06;
    block.rotation.y = directionAngle;
    block.rotation.z = (index % 2 ? -1 : 1) * 0.08;
    const taper = THREE.MathUtils.lerp(1.05, 0.45, progress);
    block.scale.set(taper, taper, THREE.MathUtils.lerp(0.7, 1.14, progress));
    root.add(block);
    const velocity = forward.clone().multiplyScalar(config.drift * THREE.MathUtils.lerp(0.24, 0.7, progress));
    velocity.addScaledVector(right, config.drift * (index % 2 ? -0.1 : 0.1));
    velocity.y = config.drift * (index % 3 - 1) * 0.035;
    particles.push({
      mesh: block,
      velocity,
      spin: new THREE.Vector3(
        (index % 2 ? -1 : 1) * (0.45 + config.drift * 0.18),
        (index % 3 - 1) * (0.34 + config.drift * 0.12),
        (index % 2 ? 1 : -1) * (0.7 + config.drift * 0.28)
      )
    });
  }
  return particles;
}

function spawnAttackArc(step, options = {}) {
  const root = new THREE.Group();
  const facing = playerRoot.rotation.y;
  const weapon = options.weapon ?? equippedWeapon;
  const weaponSocket = equipmentSockets.get(weapon)?.motion;
  const isSpear = weapon === 'spear';
  const profile = ATTACK_FX_PROFILE_KEYS[step];
  const config = attackFxSettings[weapon]?.[profile];
  const attack = ATTACK_SETS[weapon]?.[step];
  if (!config?.enabled || !weaponSocket) return null;
  const effectDuration = config.duration;
  const sweepDirection = options.sweepDirection
    ?? (attack?.reverseSweep ? -(attack.sweepDirection ?? 1) : attack?.sweepDirection)
    ?? 1;

  root.scale.setScalar(config.scale);
  let particles;

  if (step === 2) {
    particles = addThrustBlockTrail(root, config, isSpear, facing);
  } else {
    particles = addSwingBlockTrail(
      root,
      step,
      config,
      isSpear,
      sweepDirection
    );

    if (step === 0) {
      root.rotation.x = -Math.PI * 0.5;
      root.rotation.z = -facing + THREE.MathUtils.degToRad(config.rotation);
    } else if (step === 3 || step === 4 || step === 5) {
      root.rotation.x = -Math.PI * 0.5;
      root.rotation.z = facing + THREE.MathUtils.degToRad(config.rotation);
    } else {
      root.rotation.order = 'YXZ';
      root.rotation.y = facing;
      root.rotation.x = -Math.PI * 0.14;
      root.rotation.z = -Math.PI * 0.3 + THREE.MathUtils.degToRad(config.rotation);
    }
  }

  const centerOnPlayer = step === 3 || step === 4 || step === 5;
  return registerCombatEffect(root, effectDuration, {
    kind: options.preview ? 'equipment-fx-preview' : 'attack-3d-trail',
    anchor: centerOnPlayer ? playerRoot : weaponSocket,
    anchorOffset: centerOnPlayer
      ? new THREE.Vector3(config.position[0], config.position[1] + 0.68, config.position[2])
      : new THREE.Vector3(...config.position),
    facing,
    particles,
    gravity: config.gravity,
    drag: 1.45,
    worldGravity: true,
    scaleFrom: 0.9,
    scaleTo: step === 2 ? 1.14 : step === 5 ? 1.22 : 1.08,
    onUpdate: step === 3 || step === 4
      ? (effect, effectRoot, effectDelta, progress) => {
        effect.particles.forEach((particle) => {
          particle.mesh.visible = progress >= particle.revealAt
            && progress <= particle.revealAt + particle.trailWindow;
        });
      }
      : null,
    opacityCurve: (progress) => {
      const elapsed = progress * effectDuration;
      const remaining = (1 - progress) * effectDuration;
      const fadeIn = config.fadeIn <= 0.001
        ? 1
        : THREE.MathUtils.clamp(elapsed / config.fadeIn, 0, 1);
      const fadeOut = config.fadeOut <= 0.001
        ? 1
        : THREE.MathUtils.clamp(remaining / config.fadeOut, 0, 1);
      return Math.min(fadeIn, fadeOut);
    }
  });
}

function updateCombatEffects(delta) {
  for (let index = combatEffects.length - 1; index >= 0; index -= 1) {
    const effect = combatEffects[index];
    const root = combatEffectRoot(effect);
    effect.life -= delta;
    const progress = 1 - Math.max(0, effect.life) / effect.maxLife;
    updateCombatEffectAnchor(effect);
    if (!effect.anchor && effect.rootVelocity) {
      root.position.addScaledVector(effect.rootVelocity, delta);
      effect.rootVelocity.y += (effect.rootGravity ?? 0) * delta;
      effect.rootVelocity.multiplyScalar(Math.exp(-delta * (effect.rootDrag ?? 0)));
    }
    if (effect.rootSpin) {
      root.rotation.x += effect.rootSpin.x * delta;
      root.rotation.y += effect.rootSpin.y * delta;
      root.rotation.z += effect.rootSpin.z * delta;
    }
    if (effect.onUpdate?.(effect, root, delta, progress) === false) effect.life = 0;
    const gravityStep = effect.worldGravity && effect.gravity
      ? new THREE.Vector3(0, effect.gravity * delta, 0).applyQuaternion(root.quaternion.clone().invert())
      : null;
    effect.particles?.forEach((particle) => {
      if (particle.revealAt !== null && particle.revealAt !== undefined && progress < particle.revealAt) return;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      if (gravityStep) particle.velocity.add(gravityStep);
      else particle.velocity.y += (effect.gravity ?? 0) * delta;
      particle.velocity.multiplyScalar(Math.exp(-delta * (effect.drag ?? 0)));
      particle.mesh.rotation.x += particle.spin.x * delta;
      particle.mesh.rotation.y += particle.spin.y * delta;
      particle.mesh.rotation.z += particle.spin.z * delta;
    });
    const easedProgress = 1 - Math.pow(1 - progress, 2);
    const scale = THREE.MathUtils.lerp(effect.scaleFrom, effect.scaleTo, easedProgress);
    root.scale.copy(effect.baseScale).multiplyScalar(scale);
    const opacityFactor = effect.opacityCurve
      ? effect.opacityCurve(progress)
      : Math.pow(1 - progress, 1.25);
    setCombatEffectOpacity(root, opacityFactor);
    if (effect.light) effect.light.intensity = effect.lightBaseIntensity * opacityFactor;
    if (effect.life > 0) continue;
    disposeCombatEffect(effect);
    combatEffects.splice(index, 1);
  }
}

function updateCombatHud() {
  const maxHealth = playerMaxHealth();
  const playerRatio = Math.max(0, playerHealth / maxHealth);
  playerHealthFill.style.transform = `scaleX(${playerRatio})`;
  playerHealthText.textContent = `${Math.max(0, playerHealth)} / ${maxHealth}`;
  playerStaminaFill.style.transform = `scaleX(${Math.max(0, playerStamina)})`;

  const target = combatEnemies
    .filter((enemy) => enemy.active && enemy.alive)
    .map((enemy) => ({ enemy, distance: enemy.root.position.distanceTo(playerRoot.position) }))
    .sort((a, b) => Number(b.enemy.isBoss) - Number(a.enemy.isBoss) || a.distance - b.distance)[0];
  const showTarget = target && (target.enemy.isBoss || target.distance < CELL * 5);
  enemyHud.hidden = !showTarget;
  enemyHud.classList.toggle('boss-active', Boolean(showTarget && target.enemy.isBoss));
  if (!showTarget) {
    delete enemyHud.dataset.bossAction;
    delete enemyHud.dataset.bossPhase;
    return;
  }
  if (target.enemy.isBoss) {
    enemyHud.dataset.bossAction = target.enemy.bossAction;
    enemyHud.dataset.bossPhase = String(target.enemy.bossPhase);
  } else {
    delete enemyHud.dataset.bossAction;
    delete enemyHud.dataset.bossPhase;
  }
  enemyName.textContent = target.enemy.isBoss
    ? `${target.enemy.name} - Phase ${target.enemy.bossPhase}`
    : target.enemy.name;
  enemyHealthText.textContent = `${target.enemy.health} / ${target.enemy.maxHealth}`;
  enemyHealthFill.style.transform = `scaleX(${Math.max(0, target.enemy.health / target.enemy.maxHealth)})`;
}

function setInteractionPrompt(key, label, visible) {
  interactionPromptKey.textContent = key;
  interactionPromptLabel.textContent = label;
  interactionPrompt.hidden = !visible;
}

function applyEnemyRoomSpawns() {
  combatEnemies.forEach((enemy) => {
    enemy.spawn.copy(enemy.roomOneSpawn);
    enemy.spawnRotation = enemy.roomOneRotation;
  });
}

function applyRoomScene(room, teleportPlayer = false) {
  levelDirector.room = room;
  const roomId = roomIdForLevel(room);
  setRoomWachtmaleAwakened(roomId, false, { immediate: true });
  syncEntranceLandscapeVisibility();
  setActiveRewardChest(roomId);
  applyEnemyRoomSpawns();
  rebuildCombatNavigation(roomId);
  waveDirector.currentWaveIndex = 0;
  waveDirector.pendingSpawns = [];
  waveDirector.completionKind = 'exit';
  combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
  resetCombatTraps();
  setRoomRootVisibility(roomId);
  roomMusic.playExplore(roomId);
  if (!teleportPlayer) return;
  placePlayerAtRoomEntry(roomId);
  playActorAnimation(playerRoot, 'idle', { restart: true, fade: 0.04 });
  camera.position.copy(playerRoot.position).add(followOffset);
  camera.lookAt(playerRoot.position.clone().add(new THREE.Vector3(0, 0.78, 0)));
}

function resetLevelTransition(teleportPlayer = false, roomId = roomIdForLevel(1)) {
  levelDirector.phase = 'idle';
  levelDirector.timer = 0;
  levelDirector.targetRoomId = null;
  levelTransitionOverlay.hidden = true;
  levelTransitionOverlay.style.opacity = '0';
  applyRoomScene(roomLevelForId(roomId), teleportPlayer);
}

function startLevelTransition(targetRoomId = roomIdForLevel(levelDirector.room + 1)) {
  const currentRoomId = roomIdForLevel(levelDirector.room);
  const targetRoom = roomDefinition(targetRoomId);
  if (levelDirector.phase !== 'idle' || !targetRoom || targetRoom.id === currentRoomId) return;
  const currentRoom = roomDefinition(currentRoomId);
  levelDirector.targetRoomId = targetRoom.id;
  levelDirector.phase = 'fade-out';
  levelDirector.timer = 0;
  waveDirector.state = WAVE_STATES.TRANSITION;
  levelTransitionOverlay.querySelector('span').textContent = `${currentRoom?.name ?? 'Raum'} > Raum ${roomLevelForId(targetRoom.id)}`;
  levelTransitionOverlay.querySelector('strong').textContent = targetRoom.name;
  levelTransitionOverlay.hidden = false;
  levelTransitionOverlay.style.opacity = '0';
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  requireGamepadNeutral();
  setPlayerShielding(false);
  cancelPlayerHook();
  setInteractionPrompt('', '', false);
  updateWaveHud();
}

function updateLevelTransition(delta) {
  if (levelDirector.phase === 'idle') return;
  levelDirector.timer += delta;
  if (levelDirector.phase === 'fade-out') {
    const progress = THREE.MathUtils.clamp(levelDirector.timer / LEVEL_FADE_OUT_TIME, 0, 1);
    levelTransitionOverlay.style.opacity = String(progress);
    if (progress < 1) return;
    clearLootDrops();
    clearCombatEffects();
    const targetRoomId = levelDirector.targetRoomId ?? roomIdForLevel(levelDirector.room + 1);
    const targetLevel = roomLevelForId(targetRoomId);
    applyRoomScene(targetLevel, true);
    restoreRewardChestPresentation();
    waveDirector.wave = targetLevel;
    waveDirector.currentWaveIndex = 0;
    waveDirector.pendingSpawns = [];
    waveDirector.completionKind = 'exit';
    waveDirector.state = WAVE_STATES.TRANSITION;
    waveDirector.nextWaveTimer = 0;
    setArenaGate(false, true);
    levelDirector.phase = 'hold';
    levelDirector.timer = 0;
    updateCombatHud();
    updateWaveHud();
    return;
  }

  if (levelDirector.phase === 'hold') {
    levelTransitionOverlay.style.opacity = '1';
    if (levelDirector.timer < LEVEL_TRANSITION_HOLD_TIME) return;
    levelDirector.phase = 'fade-in';
    levelDirector.timer = 0;
  }

  const progress = THREE.MathUtils.clamp(levelDirector.timer / LEVEL_FADE_IN_TIME, 0, 1);
  levelTransitionOverlay.style.opacity = String(1 - progress);
  if (progress < 1) return;
  levelDirector.phase = 'idle';
  levelDirector.timer = 0;
  levelTransitionOverlay.hidden = true;
  waveDirector.state = WAVE_STATES.READY;
  const roomName = roomDefinition(roomIdForLevel(levelDirector.room))?.name ?? 'NEUER RAUM';
  showCombatMessage(`ANKUNFT: ${roomName.toUpperCase()}`, 1.65);
  levelDirector.targetRoomId = null;
  updateWaveHud();
  saveActiveGame('room-entry');
}

function updateWaveHud() {
  const currentRoom = roomDefinition(roomIdForLevel(levelDirector.room));
  if (combatLabActive) {
    waveLabel.textContent = 'Kampflabor';
    waveCount.textContent = combatLabEnemy?.alive
      ? `Schwert-Ork ${combatLabEnemy.health}/${combatLabEnemy.maxHealth}`
      : 'Neuer Durchlauf';
    return;
  }
  const targetRoom = roomDefinition(levelDirector.targetRoomId);
  const waves = roomWaves(currentRoom?.id);
  const wave = waves[waveDirector.currentWaveIndex] ?? waves[0];
  const waveEnemies = wave ? roomEnemiesForWave(currentRoom?.id, wave.id) : [];
  const defeated = waveEnemies.filter((enemy) => !enemy.alive).length;
  const wavePosition = waves.length ? `Welle ${waveDirector.currentWaveIndex + 1}/${waves.length}` : 'Keine Welle';
  let label = `Betritt ${currentRoom?.name ?? 'den Raum'}`;
  let count = `Raum ${levelDirector.room}`;
  if (waveDirector.state === WAVE_STATES.ACTIVE) {
    label = wave?.name ?? currentRoom?.name ?? 'Raumkampf';
    count = `${wavePosition} - ${defeated}/${waveEnemies.length}`;
  } else if (waveDirector.state === WAVE_STATES.BETWEEN) {
    const nextWave = waves[waveDirector.currentWaveIndex + 1];
    label = nextWave ? `${nextWave.name} naht` : 'Kurze Atempause';
    count = `${Math.max(0, waveDirector.nextWaveTimer).toFixed(1)} s`;
  } else if (waveDirector.state === WAVE_STATES.CLEARED) {
    label = 'Raum gesichert';
    count = `${waves.length} ${waves.length === 1 ? 'Welle' : 'Wellen'}`;
  } else if (waveDirector.state === WAVE_STATES.REWARD) {
    label = 'Beute bereit';
    count = currentRoom?.name ?? 'Belohnung';
  } else if (waveDirector.state === WAVE_STATES.SUPPLY) {
    label = 'Versorgung der Wacht';
    count = `${inventoryState.coins} Muenzen`;
  } else if (waveDirector.state === WAVE_STATES.EXIT_READY) {
    label = 'Ausgang offen';
    count = currentRoom?.name ?? `Raum ${levelDirector.room}`;
  } else if (waveDirector.state === WAVE_STATES.TRANSITION) {
    label = targetRoom?.name ?? 'Raumwechsel';
    count = targetRoom ? `Raum ${roomLevelForId(targetRoom.id)}` : '';
  } else if (waveDirector.state === WAVE_STATES.VICTORY) {
    label = 'Wacht gehalten';
    count = currentRoom?.name ?? '';
  } else if (waveDirector.state === WAVE_STATES.DEAD) {
    label = 'Wacht gebrochen';
    count = 'Ra ist gefallen';
  }
  waveLabel.textContent = label;
  waveCount.textContent = count;
}

function setArenaGate(closed, immediate = false) {
  waveDirector.gateClosed = closed;
  waveDirector.gateTargetY = closed ? 0 : ARENA_GATE_OPEN_Y;
  if (immediate && arenaGate) arenaGate.position.y = waveDirector.gateTargetY;
}

function closeRewardPanel() {
  rewardOpen = false;
  rewardPanelRevealTimer = 0;
  rewardPanel.hidden = true;
  document.body.classList.remove('reward-open');
}

function renderSupplyOffers() {
  supplyCoinCount.textContent = String(inventoryState.coins);
  supplyOptions.replaceChildren();
  const offers = supplyOfferIds
    .map((upgradeId) => RUN_UPGRADES.find((upgrade) => upgrade.id === upgradeId))
    .filter(Boolean);

  offers.forEach((upgrade) => {
    const stack = upgradeStackCount(upgrade.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'supply-option';
    button.dataset.upgradeId = upgrade.id;
    button.disabled = supplyPurchased || inventoryState.coins < upgrade.price || stack >= upgrade.maxStacks;

    const head = document.createElement('span');
    head.className = 'supply-option-head';
    const icon = document.createElement('i');
    icon.dataset.lucide = upgrade.icon;
    icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.textContent = upgrade.name;
    head.append(icon, name);

    const detail = document.createElement('span');
    detail.className = 'supply-option-detail';
    detail.textContent = upgrade.detail;
    const price = document.createElement('span');
    price.className = 'supply-price';
    price.innerHTML = `<span>${stack}/${upgrade.maxStacks}</span><span><i data-lucide="coins" aria-hidden="true"></i>${upgrade.price}</span>`;
    button.append(head, detail, price);
    button.addEventListener('click', () => purchaseSupplyUpgrade(upgrade.id));
    supplyOptions.append(button);
  });

  if (!offers.length) {
    const message = document.createElement('p');
    message.className = 'supply-status';
    message.textContent = 'Ra traegt bereits alle Fundstuecke dieser Wacht.';
    supplyOptions.append(message);
  }
  supplyRerollButton.disabled = supplyPurchased
    || inventoryState.coins < SUPPLY_REROLL_COST
    || availableRunUpgrades().length <= offers.length;
  supplyContinueButton.querySelector('span').textContent = supplyPurchased ? 'Weiter mit Fundstueck' : 'Ohne Kauf weiter';
  window.lucide?.createIcons();
}

function openSupplyPanel() {
  if (supplyOpen) return;
  setGameMenuOpen(false, { restoreFocus: false });
  supplyOpen = true;
  supplyPurchased = false;
  waveDirector.state = WAVE_STATES.SUPPLY;
  closeRewardPanel();
  setInventoryOpen(false);
  setEquipmentOpen(false);
  setPlayerShielding(false);
  cancelPlayerHook();
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  gamepadMoveVector.set(0, 0);
  requireGamepadNeutral();
  requireGuidedInputNeutral();
  rollSupplyOffers();
  supplyStatus.textContent = 'Waehle eine Verstaerkung oder ziehe weiter.';
  supplyPanel.hidden = false;
  document.body.classList.add('supply-open');
  renderSupplyOffers();
  updateWaveHud();
  focusGuidedPanel(supplyPanel, 0, true);
}

function closeSupplyPanel() {
  supplyOpen = false;
  supplyPanel.hidden = true;
  document.body.classList.remove('supply-open');
}

function purchaseSupplyUpgrade(upgradeId) {
  if (!supplyOpen || supplyPurchased) return;
  const upgrade = RUN_UPGRADES.find((candidate) => candidate.id === upgradeId);
  if (!upgrade || upgradeStackCount(upgrade.id) >= upgrade.maxStacks) return;
  if (inventoryState.coins < upgrade.price) {
    supplyStatus.textContent = 'Dafuer fehlen noch Muenzen.';
    return;
  }
  inventoryState.coins -= upgrade.price;
  applyRunUpgrade(upgrade);
  supplyPurchased = true;
  supplyStatus.textContent = `${upgrade.name} begleitet Ra in diesem Lauf.`;
  updateInventoryHud();
  updateCombatHud();
  playRewardChime('sword');
  renderSupplyOffers();
  supplyContinueButton.focus();
}

function rerollSupplyOffers() {
  if (!supplyOpen || supplyPurchased || inventoryState.coins < SUPPLY_REROLL_COST) return;
  inventoryState.coins -= SUPPLY_REROLL_COST;
  rollSupplyOffers();
  supplyStatus.textContent = 'Die Wacht zeigt drei andere Fundstuecke.';
  updateInventoryHud();
  renderSupplyOffers();
}

function continueFromSupply() {
  if (!supplyOpen) return;
  closeSupplyPanel();
  waveDirector.state = WAVE_STATES.EXIT_READY;
  waveDirector.nextWaveTimer = 0;
  combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
  showCombatMessage('DER AUSGANG IST OFFEN', 1.55);
  updateWaveHud();
  saveActiveGame('supply-complete');
  canvas.focus({ preventScroll: true });
}

function setEquippedWeapon(weapon, empowered = false) {
  equippedWeapon = weapon === 'spear' ? 'spear' : 'sword';
  swordEmpowered = equippedWeapon === 'sword' && empowered;
  spearInventorySlot.hidden = equippedWeapon !== 'spear';
  swordSlotState.textContent = equippedWeapon === 'sword' ? 'Ausgeruestet' : 'Im Rucksack';
  swordSlotName.textContent = swordEmpowered ? 'Waechterklinge' : 'Schwert von Ahnhoehe';
  INVENTORY_DETAILS.sword = swordEmpowered
    ? ['Waechterklinge', 'Schnelle Folge, starker Abschluss']
    : ['Schwert von Ahnhoehe', 'Hauptwaffe'];
  attackButton.dataset.tip = equippedWeapon === 'spear' ? 'Speerangriff' : 'Angreifen';
  selectInventoryItem(equippedWeapon);
  updatePlayerWeapon();
}

function configureRewardChestRoot(root) {
  if (!root) return;
  root.userData.rewardBasePosition = root.position.clone();
  root.userData.rewardBaseRotation = root.rotation.clone();
  root.userData.lidOpen = false;
}

function rewardChestForRoom(roomId) {
  return editableRootsForRoom(roomId).find((root) => root.userData.assetName === 'chest'
    && root.userData.placement.settings?.rewardChest) ?? null;
}

function setActiveRewardChest(roomId) {
  if (rewardChest) restoreRewardChestPresentation();
  rewardChest = rewardChestForRoom(roomId);
  configureRewardChestRoot(rewardChest);
  if (chestBeacon) chestBeacon.visible = false;
}

function setRewardChestGlow(intensity) {
  if (!rewardChest) return;
  rewardChest.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (!material.emissive) return;
      if (!material.userData.rewardBaseEmissive) {
        material.userData.rewardBaseEmissive = material.emissive.clone();
        material.userData.rewardBaseIntensity = material.emissiveIntensity ?? 1;
      }
      if (intensity > 0.001) {
        material.emissive.set('#d99a35');
        material.emissiveIntensity = material.userData.rewardBaseIntensity + intensity;
      } else {
        material.emissive.copy(material.userData.rewardBaseEmissive);
        material.emissiveIntensity = material.userData.rewardBaseIntensity;
      }
    });
  });
}

function restoreRewardChestPresentation() {
  rewardChestMotionTime = -1;
  rewardChestResolveTimer = 0;
  rewardPanelRevealTimer = 0;
  if (!rewardChest) return;
  if (rewardChest.userData.lidOpen) {
    playActorAnimation(rewardChest, 'close', {
      once: true,
      restart: true,
      speed: 3.6,
      fade: 0.01
    });
    rewardChest.userData.lidOpen = false;
  }
  rewardChest.position.copy(rewardChest.userData.rewardBasePosition);
  rewardChest.rotation.copy(rewardChest.userData.rewardBaseRotation);
  rewardChest.scale.setScalar(1);
  setRewardChestGlow(0);
}

function startRewardChestOpening() {
  rewardChestMotionTime = 0;
  rewardPanelRevealTimer = 0.58;
  playActorAnimation(rewardChest, 'open', {
    once: true,
    restart: true,
    speed: 0.78,
    fade: 0.015
  });
  rewardChest.userData.lidOpen = true;
  chestBeacon.visible = true;
  chestBeacon.userData.time = 0;
}

function revealRewardPanel() {
  if (!rewardOpen) return;
  const drop = normalizedChestDrop(rewardChest);
  if (drop.type !== 'choice') {
    resolveConfiguredRewardChest(drop);
    return;
  }
  rewardPanel.hidden = false;
  document.body.classList.add('reward-open');
  requireGamepadNeutral();
  requireGuidedInputNeutral();
  focusGuidedPanel(rewardPanel, 0, true);
}

function spawnRewardChestCoins(amount) {
  const count = THREE.MathUtils.clamp(Math.round(Number(amount) || 1), 1, 25);
  const origin = rewardChest.userData.rewardBasePosition?.clone() ?? rewardChest.position.clone();
  origin.y += 0.12;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + rewardChest.id * 0.23;
    lootDrops.push(createLootCoin(origin, angle, index));
  }
}

function finishRewardChestResolution(message, rewardTone = null) {
  closeRewardPanel();
  rewardChestResolveTimer = 1.35;
  chestBeacon.visible = true;
  setInteractionPrompt('', '', false);
  waveDirector.state = WAVE_STATES.EXIT_READY;
  waveDirector.nextWaveTimer = 0;
  openedRewardRoomIds.add(roomIdForLevel(levelDirector.room));
  combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
  if (rewardTone) playRewardChime(rewardTone);
  showCombatMessage(message, 1.55);
  updateWaveHud();
  updateCombatHud();
  saveActiveGame('reward-collected');
  canvas.focus({ preventScroll: true });
}

function resolveConfiguredRewardChest(drop) {
  if (!rewardOpen) return;
  if (drop.type === 'sword' || drop.type === 'spear') {
    chooseReward(drop.type);
    return;
  }
  if (drop.type === 'coins') {
    spawnRewardChestCoins(drop.amount);
    finishRewardChestResolution(`${drop.amount} MUENZEN`);
    return;
  }
  if (['helmet', 'hook', 'armband'].includes(drop.type)) {
    const result = unlockEquipmentForPlayer(drop.type, {
      revealOrigin: rewardChest.position
    });
    finishRewardChestResolution(
      result.definition?.displayName.toUpperCase() ?? 'AUSRUESTUNG GEFUNDEN',
      drop.type === 'helmet' ? 'sword' : 'spear'
    );
    return;
  }
  if (drop.type === 'healing') {
    playerHealth = playerMaxHealth();
    playerStamina = 1;
    finishRewardChestResolution('NEUE KRAFT', 'sword');
  }
}

function spawnRewardReveal(item, origin = rewardChest?.position ?? playerRoot.position) {
  const revealProfiles = {
    sword: { assetName: 'weapon-sword', scale: 0.94, tilt: 0.12, spin: 1.7 },
    spear: { assetName: 'weapon-spear', scale: 0.82, tilt: -0.32, spin: 1.35 },
    helmet: {
      assetName: 'wachthelm-ahnhoehe-mani-neufassung',
      scale: 1.32,
      tilt: 0.08,
      spin: 1.45
    },
    hook: { assetName: 'enterhaken-ahnhoehe', scale: 0.92, tilt: -0.18, spin: 1.55 }
  };
  const profile = revealProfiles[item] ?? revealProfiles.sword;
  const assetName = profile.assetName;
  const model = SkeletonUtils.clone(assets.get(assetName).scene);
  prepareModel(model);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (!material.emissive) return;
      material.emissive.set('#d99a35');
      material.emissiveIntensity = 0.72;
      material.transparent = true;
    });
  });

  const root = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(model);
  const baseScale = NATIVE_SCALE_MODELS.has(assetName) ? 1 : modelScale;
  frame.scale.setScalar(baseScale * profile.scale);
  root.add(frame);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  frame.position.set(-center.x, -bounds.min.y, -center.z);
  root.position.copy(origin);
  root.position.y += 0.68;
  root.rotation.set(-0.18, rewardChest?.rotation.y ?? playerRoot.rotation.y, profile.tilt);

  const light = new THREE.PointLight('#ffc65a', 3.8, 5.5, 2);
  light.position.y = 0.65;
  root.add(light);
  registerCombatEffect(root, 1.55, {
    kind: 'reward-reveal',
    rootVelocity: new THREE.Vector3(0, 1.32, 0),
    rootGravity: 0.12,
    rootDrag: 0.16,
    rootSpin: new THREE.Vector3(0.08, profile.spin, 0.12),
    light,
    lightBaseIntensity: 3.8,
    disposeGeometry: false,
    scaleFrom: 0.28,
    scaleTo: 1.08,
    opacityCurve: (progress) => {
      const fadeIn = THREE.MathUtils.clamp(progress / 0.14, 0, 1);
      const fadeOut = THREE.MathUtils.clamp((1 - progress) / 0.42, 0, 1);
      return Math.min(fadeIn, Math.pow(fadeOut, 1.35));
    }
  });
}

function updateChestBeacon(delta) {
  if (!chestBeacon || !rewardChest) return;
  chestBeacon.userData.time += delta;
  const time = chestBeacon.userData.time;
  let glow = 0;

  if (rewardPanelRevealTimer > 0) {
    rewardPanelRevealTimer = Math.max(0, rewardPanelRevealTimer - delta);
    if (rewardPanelRevealTimer <= 0) revealRewardPanel();
  }

  if (rewardChestMotionTime >= 0) {
    rewardChestMotionTime += delta;
    const progress = THREE.MathUtils.clamp(rewardChestMotionTime / 0.78, 0, 1);
    const envelope = 1 - progress;
    const basePosition = rewardChest.userData.rewardBasePosition;
    const baseRotation = rewardChest.userData.rewardBaseRotation;
    rewardChest.position.copy(basePosition);
    rewardChest.position.y += Math.sin(progress * Math.PI) * 0.58;
    rewardChest.rotation.copy(baseRotation);
    rewardChest.rotation.x += Math.sin(progress * Math.PI * 7) * envelope * 0.13;
    rewardChest.rotation.y += Math.sin(progress * Math.PI * 5) * envelope * 0.11;
    rewardChest.rotation.z += Math.sin(progress * Math.PI * 9) * envelope * 0.1;
    const squash = Math.sin(progress * Math.PI) * 0.08;
    rewardChest.scale.set(1 + squash * 0.55, 1 - squash, 1 + squash * 0.55);
    glow = 0.7 + Math.sin(progress * Math.PI) * 2.15;
    if (progress >= 1) {
      rewardChestMotionTime = -1;
      rewardChest.position.copy(basePosition);
      rewardChest.rotation.copy(baseRotation);
      rewardChest.scale.setScalar(1);
    }
  }

  if (rewardOpen) glow = Math.max(glow, 1.05 + Math.sin(time * 5.2) * 0.18);
  if (rewardChestResolveTimer > 0) {
    rewardChestResolveTimer = Math.max(0, rewardChestResolveTimer - delta);
    const resolveStrength = rewardChestResolveTimer / 1.35;
    glow = Math.max(glow, resolveStrength * 1.45);
    chestBeacon.visible = true;
    if (rewardChestResolveTimer <= 0) chestBeacon.visible = false;
  } else if (waveDirector.state === WAVE_STATES.REWARD && !rewardOpen) {
    glow = Math.max(glow, 0.34 + Math.sin(time * 3.8) * 0.08);
  }
  setRewardChestGlow(glow);

  chestBeacon.position.copy(rewardChest.position);
  chestBeacon.position.y += 0.2;

  const pulse = 0.92 + Math.sin(time * 3.8) * 0.09;
  chestBeacon.userData.ring.scale.setScalar(pulse);
  chestBeacon.userData.ring.rotation.z += delta * 0.65;
  chestBeacon.userData.light.intensity = chestBeacon.visible
    ? 2.2 + Math.sin(time * 4.6) * 0.35 + glow * 0.8
    : 0;

  const canOpen = waveDirector.state === WAVE_STATES.REWARD
    && !rewardOpen
    && rewardChest.position.distanceTo(playerRoot.position) <= CELL * 1.45;
  setInteractionPrompt('E', 'Truhe oeffnen', canOpen);
}

function unlockRewardChest() {
  if (waveDirector.state !== WAVE_STATES.CLEARED || !rewardChest) return;
  waveDirector.state = WAVE_STATES.REWARD;
  chestBeacon.visible = true;
  chestBeacon.userData.time = 0;
  playChestChime();
  showCombatMessage('DIE TRUHE ERWACHT', 1.7);
  updateWaveHud();
}

function canOpenRewardChest() {
  return Boolean(rewardChest)
    && waveDirector.state === WAVE_STATES.REWARD
    && !rewardOpen
    && rewardChest.position.distanceTo(playerRoot.position) <= CELL * 1.45;
}

function openRewardChest() {
  if (!canOpenRewardChest()) return false;
  setGameMenuOpen(false, { restoreFocus: false });
  rewardOpen = true;
  rewardPanel.hidden = true;
  interactionPrompt.hidden = true;
  document.body.classList.remove('reward-open');
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
  setPlayerShielding(false);
  startRewardChestOpening();
  playChestChime();
  return true;
}

function chooseReward(weapon) {
  if (!rewardOpen || !['sword', 'spear'].includes(weapon)) return;
  spawnRewardReveal(weapon);
  setEquippedWeapon(weapon, weapon === 'sword');
  playerHealth = playerMaxHealth();
  playerStamina = 1;
  finishRewardChestResolution('DER AUSGANG IST OFFEN', weapon);
}

function resetEnemyForWave(enemy, active) {
  enemy.active = active;
  enemy.maxHealth = enemy.isBoss
    ? enemy.baseHealth
    : enemy.baseHealth + Math.max(0, waveDirector.wave - 1);
  enemy.health = enemy.maxHealth;
  enemy.alive = true;
  enemy.attackCooldown = 0;
  if (enemy.isBoss) {
    resetBossAction(enemy);
    setBossPhase(enemy, 1, false, true);
    enemy.bossCooldown = 1.1;
    enemy.bossAuraTime = 0;
    if (enemy.bossAura) enemy.bossAura.visible = true;
  } else {
    resetEnemyAttack(enemy);
  }
  enemy.hurtTimer = 0;
  enemy.knockback.set(0, 0, 0);
  clearEnemyNavigation(enemy);
  enemy.root.position.copy(enemy.spawn);
  enemy.root.rotation.y = enemy.spawnRotation;
  enemy.formationRole = 'support';
  enemy.orbitAngle = playerRoot
    ? Math.atan2(enemy.spawn.x - playerRoot.position.x, enemy.spawn.z - playerRoot.position.z)
    : 0;
  enemy.root.visible = active;
  setRootHitFlash(enemy.root, false);
  playActorAnimation(enemy.root, 'idle', { restart: true });
}

function resetWaveDirector() {
  waveDirector.state = WAVE_STATES.READY;
  waveDirector.wave = 1;
  waveDirector.currentWaveIndex = 0;
  waveDirector.pendingSpawns = [];
  waveDirector.completionKind = 'exit';
  waveDirector.rewardUnlockTimer = 0;
  waveDirector.nextWaveTimer = 0;
  combatFormation.meleeLead = null;
  combatFormation.previousMeleeLead = null;
  setArenaGate(false, true);
  closeRewardPanel();
  restoreRewardChestPresentation();
  interactionPrompt.hidden = true;
  if (chestBeacon) chestBeacon.visible = false;
  if (exitBeacon) exitBeacon.visible = false;
  combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
  roomDefinitions.forEach((room) => {
    setRoomWachtmaleAwakened(room.id, false, { immediate: true });
  });
  updateWaveHud();
}

function startArenaWave() {
  if (waveDirector.state !== WAVE_STATES.READY) return;
  setArenaGate(true);
  const roomId = roomIdForLevel(levelDirector.room);
  const openingWave = roomWaves(roomId)[0];
  const bossOpening = Boolean(openingWave?.boss
    || roomEnemiesForWave(roomId, openingWave?.id).some((enemy) => enemy.isBoss));
  roomMusic.startCombat({ boss: bossOpening });
  waveDirector.currentWaveIndex = 0;
  startRoomWave(0, roomId);
}

function roomEnemiesForWave(roomId, waveId) {
  return combatEnemies.filter((enemy) => enemy.roomId === roomId && enemyWaveId(enemy.root) === waveId);
}

function currentRoomWave() {
  return roomWaves(roomIdForLevel(levelDirector.room))[waveDirector.currentWaveIndex] ?? null;
}

function activateWaveEnemy(enemy) {
  resetEnemyForWave(enemy, true);
  spawnHitImpact(enemy.root.position, false);
}

function startRoomWave(index, roomId = roomIdForLevel(levelDirector.room)) {
  const waves = roomWaves(roomId);
  const wave = waves[index];
  if (!wave) {
    completeArenaWave();
    return;
  }

  waveDirector.state = WAVE_STATES.ACTIVE;
  waveDirector.currentWaveIndex = index;
  waveDirector.pendingSpawns = [];
  combatFormation.meleeLead = null;
  combatFormation.previousMeleeLead = null;
  combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));

  roomEnemiesForWave(roomId, wave.id).forEach((enemy) => {
    const delay = enemySpawnDelay(enemy.root);
    if (delay <= 0.01) activateWaveEnemy(enemy);
    else waveDirector.pendingSpawns.push({ enemy, timer: delay });
  });

  showCombatMessage(`${index + 1}. WELLE: ${wave.name.toUpperCase()}`, 1.45);
  updateWaveHud();
  checkCurrentWaveCompletion();
}

function spawnWaveBonusCoins(amount) {
  const count = THREE.MathUtils.clamp(Math.round(Number(amount) || 0), 0, 25);
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / Math.max(1, count) + index * 0.29;
    const origin = playerRoot.position.clone();
    origin.x += Math.cos(angle) * 0.38;
    origin.z += Math.sin(angle) * 0.38;
    lootDrops.push(createLootCoin(origin, angle, index));
  }
}

function checkCurrentWaveCompletion() {
  if (combatLabActive) return;
  if (waveDirector.state !== WAVE_STATES.ACTIVE || waveDirector.pendingSpawns.length) return;
  const roomId = roomIdForLevel(levelDirector.room);
  const wave = currentRoomWave();
  if (!wave) {
    completeArenaWave();
    return;
  }
  if (roomEnemiesForWave(roomId, wave.id).some((enemy) => enemy.alive)) return;
  finishCurrentWave();
}

function finishCurrentWave() {
  if (waveDirector.state !== WAVE_STATES.ACTIVE) return;
  const roomId = roomIdForLevel(levelDirector.room);
  const waves = roomWaves(roomId);
  const wave = waves[waveDirector.currentWaveIndex];
  if (!wave) {
    completeArenaWave();
    return;
  }
  spawnWaveBonusCoins(wave.rewardCoins);
  if (runProgress.waveHeal > 0) {
    const before = playerHealth;
    playerHealth = Math.min(playerMaxHealth(), playerHealth + runProgress.waveHeal);
    if (playerHealth > before) showCombatMessage('ATEM DER WACHT', 0.8);
  }
  const nextWave = waves[waveDirector.currentWaveIndex + 1];
  if (nextWave) {
    waveDirector.state = WAVE_STATES.BETWEEN;
    waveDirector.nextWaveTimer = wave.intermission;
    showCombatMessage(`${wave.name.toUpperCase()} BESTANDEN`, Math.min(1.25, wave.intermission));
    updateWaveHud();
    return;
  }
  const waveEnemies = roomEnemiesForWave(roomId, wave.id);
  waveDirector.completionKind = wave.boss || waveEnemies.some((enemy) => enemy.isBoss)
    ? 'supply'
    : rewardChest ? 'reward' : 'exit';
  completeArenaWave();
}

function completeArenaWave() {
  if (waveDirector.state !== WAVE_STATES.ACTIVE) return;
  setArenaGate(false);
  const roomId = roomIdForLevel(levelDirector.room);
  const roomName = roomDefinition(roomId)?.name ?? 'RAUM';
  completedRoomIds.add(roomId);
  if (waveDirector.completionKind === 'supply') {
    defeatedBossRoomIds.add(roomId);
    awakenRoomWachtmale(roomId);
    roomMusic.playBossVictory(roomId);
  }
  else roomMusic.playExplore(roomId);
  if (waveDirector.completionKind === 'reward' || waveDirector.completionKind === 'supply') {
    waveDirector.state = WAVE_STATES.CLEARED;
    waveDirector.rewardUnlockTimer = waveDirector.completionKind === 'supply' ? 1.35 : 0.9;
    showCombatMessage(`${roomName.toUpperCase()} GESICHERT`, 1.5);
  } else {
    waveDirector.state = WAVE_STATES.EXIT_READY;
    showCombatMessage('DER AUSGANG IST OFFEN', 1.6);
    playRewardChime('sword');
    saveActiveGame('room-cleared');
  }
  updateWaveHud();
}

function horizontalDistanceBetween(first, second) {
  return Math.hypot(first.position.x - second.position.x, first.position.z - second.position.z);
}

function exitMarkerIsAvailable(marker) {
  const settings = marker.userData.placement.settings ?? {};
  const condition = settings.condition ?? 'clear';
  if (condition === 'signal') return signalAn(String(settings.signal ?? '').trim());
  return condition === 'always'
    || waveDirector.state === WAVE_STATES.EXIT_READY
    || waveDirector.state === WAVE_STATES.VICTORY;
}

function exitMarkerRadius(marker) {
  const settings = marker.userData.placement.settings ?? {};
  return THREE.MathUtils.clamp(Number(settings.radius) || CELL * 0.7, 0.5, 12);
}

function playerSharesMarkerHeight(marker) {
  const markerY = marker.position.y + ACTOR_GROUND_OFFSET;
  return Math.abs(playerRoot.position.y - markerY) <= EXIT_PROMPT_HEIGHT_TOLERANCE;
}

function lockRoomEntryExits(roomId) {
  levelDirector.exitLockMarkers.clear();
  systemMarkersForRoom(roomId, 'exit').forEach((marker) => {
    const radius = exitMarkerRadius(marker);
    if (horizontalDistanceBetween(playerRoot, marker) <= radius
      && playerSharesMarkerHeight(marker)) {
      levelDirector.exitLockMarkers.add(marker.id);
    }
  });
}

function exitMarkerIsEntryLocked(marker, distance) {
  if (!levelDirector.exitLockMarkers.has(marker.id)) return false;
  const radius = exitMarkerRadius(marker);
  if (distance > radius * 1.12) {
    levelDirector.exitLockMarkers.delete(marker.id);
    return false;
  }
  return true;
}

function updateExitBeacon(delta, roomId) {
  if (!exitBeacon) return;
  const exitReady = waveDirector.state === WAVE_STATES.EXIT_READY
    || waveDirector.state === WAVE_STATES.VICTORY;
  const marker = exitReady
    ? systemMarkersForRoom(roomId, 'exit').find(exitMarkerIsAvailable)
    : null;
  exitBeacon.visible = Boolean(gameMode && marker);
  if (!exitBeacon.visible) return;

  exitBeacon.userData.time += delta;
  exitBeacon.position.copy(marker.position);
  const pulse = 0.5 + Math.sin(exitBeacon.userData.time * 3.2) * 0.5;
  exitBeacon.userData.ring.rotation.z += delta * 0.55;
  exitBeacon.userData.groundRing.rotation.z -= delta * 0.28;
  exitBeacon.userData.ring.material.opacity = 0.56 + pulse * 0.22;
  exitBeacon.userData.groundRing.material.opacity = 0.32 + pulse * 0.2;
  exitBeacon.userData.light.intensity = 1.8 + pulse * 1.4;
  exitBeacon.scale.setScalar(0.96 + pulse * 0.05);
}

function updateRoomExitMarkers(roomId) {
  const exits = systemMarkersForRoom(roomId, 'exit');
  if (levelDirector.exitLockTimer > 0) {
    setInteractionPrompt('', '', false);
    return { hasMarkers: exits.length > 0, transitioned: false };
  }
  const available = exits
    .filter(exitMarkerIsAvailable)
    .map((marker) => ({ marker, distance: horizontalDistanceBetween(playerRoot, marker) }))
    .filter(({ marker, distance }) => !exitMarkerIsEntryLocked(marker, distance))
    .sort((first, second) => first.distance - second.distance);
  const nearest = available[0];
  if (!nearest) return { hasMarkers: exits.length > 0, transitioned: false };

  const settings = nearest.marker.userData.placement.settings ?? {};
  const radius = exitMarkerRadius(nearest.marker);
  const targetRoom = roomDefinition(settings.targetRoomId);
  const insideExitRadius = nearest.distance <= radius && playerSharesMarkerHeight(nearest.marker);
  setInteractionPrompt('UP', targetRoom ? `Nach ${targetRoom.name}` : 'Zielraum fehlt', insideExitRadius);
  if (targetRoom && insideExitRadius) {
    startLevelTransition(targetRoom.id);
    return { hasMarkers: true, transitioned: true };
  }
  return { hasMarkers: true, transitioned: false };
}

function playerHasClearedArenaGate(roomId) {
  const entry = roomEntryMarker(roomId);
  const entryZ = entry?.position.z ?? playerStart.z;
  const entrySide = Math.sign(entryZ - ARENA_GATE_Z) || 1;
  const clearance = ARENA_GATE_COLLISION_HALF_DEPTH + PLAYER_BODY_RADIUS + BODY_CONTACT_GAP;
  return (playerRoot.position.z - ARENA_GATE_Z) * entrySide <= -clearance;
}

function updateWaveDirector(delta) {
  if (arenaGate) {
    arenaGate.position.y = THREE.MathUtils.damp(
      arenaGate.position.y,
      waveDirector.gateTargetY,
      7.5,
      delta
    );
  }
  updateChestBeacon(delta);
  if (waveDirector.state === WAVE_STATES.ACTIVE && waveDirector.pendingSpawns.length) {
    for (let index = waveDirector.pendingSpawns.length - 1; index >= 0; index -= 1) {
      const pending = waveDirector.pendingSpawns[index];
      pending.timer -= delta;
      if (pending.timer > 0) continue;
      waveDirector.pendingSpawns.splice(index, 1);
      activateWaveEnemy(pending.enemy);
    }
    checkCurrentWaveCompletion();
  }
  if (waveDirector.state === WAVE_STATES.BETWEEN) {
    waveDirector.nextWaveTimer = Math.max(0, waveDirector.nextWaveTimer - delta);
    if (waveDirector.nextWaveTimer <= 0) startRoomWave(waveDirector.currentWaveIndex + 1);
    else updateWaveHud();
  }
  if (waveDirector.state === WAVE_STATES.CLEARED && lootDrops.length === 0) {
    waveDirector.rewardUnlockTimer = Math.max(0, waveDirector.rewardUnlockTimer - delta);
    if (waveDirector.rewardUnlockTimer <= 0) {
      if (waveDirector.completionKind === 'supply') openSupplyPanel();
      else if (rewardChest) unlockRewardChest();
    }
  }
  const roomId = roomIdForLevel(levelDirector.room);
  updateExitBeacon(delta, roomId);
  const exitResult = updateRoomExitMarkers(roomId);
  if (exitResult.transitioned) return;
  if (waveDirector.state === WAVE_STATES.EXIT_READY) {
    if (!exitResult.hasMarkers) setInteractionPrompt('', '', false);
    return;
  }
  if (waveDirector.state === WAVE_STATES.VICTORY && exitResult.hasMarkers) return;
  if (waveDirector.state === WAVE_STATES.READY && playerHealth > 0) {
    const combatTriggers = systemMarkersForRoom(roomId, 'combat-trigger');
    if (combatTriggers.length) {
      const enteredTrigger = combatTriggers.some((marker) => {
        const radius = THREE.MathUtils.clamp(
          Number(marker.userData.placement.settings?.radius) || CELL * 0.95,
          0.5,
          12
        );
        return horizontalDistanceBetween(playerRoot, marker) <= radius;
      });
      if (enteredTrigger && playerHasClearedArenaGate(roomId)) startArenaWave();
    } else if (playerRoot.position.z <= ARENA_TRIGGER_Z) {
      startArenaWave();
    }
  }
}

function resetCombatState(startRoomId = activeEditorRoomId, options = {}) {
  const preserveRun = Boolean(options.preserveRun);
  if (gameOverOpen) closeGameOver();
  if (!preserveRun) {
    resetRunProgression();
    resetEquipmentProgress(equipmentProgress);
    completedRoomIds.clear();
    openedRewardRoomIds.clear();
    defeatedBossRoomIds.clear();
    inventoryState.coins = 0;
    inventoryState.potions = 3;
  }
  closeSupplyPanel();
  playerHealth = playerMaxHealth();
  playerStamina = 1;
  playerInvulnerability = 0;
  playerHurtTimer = 0;
  playerKnockback.set(0, 0, 0);
  playerAttackTimer = 0;
  playerAttackActiveDuration = 0;
  playerAttackSpeedMultiplier = 1;
  playerAttackCooldown = 0;
  playerShieldBashCooldown = 0;
  playerAttackStep = 0;
  playerSpecialAttack = null;
  playerComboTimer = 0;
  playerAttackQueued = false;
  playerAttackEffectSpawned = false;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerAttackLungeRemaining = 0;
  playerAttackTotalLunge = 0;
  playerChargeReleaseTriggered = false;
  playerChargeEffectSpawned = false;
  playerAttackBaseRotation = 0;
  playerAttackWorldContactResolved = false;
  playerAttackReboundTimer = 0;
  playerAttackReboundDuration = 0;
  playerAttackReboundDistanceRemaining = 0;
  playerAttackReboundSide = 1;
  playerAttackReboundWeapon = 'sword';
  playerAttackReboundDirection.set(0, 0, 0);
  cancelPlayerAttackCharge({ restoreAnimation: false });
  playerIdleVariantIndex = 0;
  playerIdleVariantTimer = 2.8;
  playerIdleVariantElapsed = 0;
  playerIdleActive = false;
  playerProceduralHeadYaw = 0;
  playerProceduralHeadPitch = 0;
  playerProceduralTorsoPitch = 0;
  playerProceduralTorsoYaw = 0;
  playerProceduralTorsoRoll = 0;
  playerFaceHitTimer = 0;
  playerDodgeTimer = 0;
  playerDustTimer = 0;
  playerDustStepSide = 1;
  playerHookCooldown = 0;
  playerFallTimer = 0;
  playerFallMode = 'none';
  playerFallDropHeight = 0;
  playerLandingTimer = 0;
  playerLandingDuration = 0;
  playerLandingStrength = 0;
  restorePlayerLandingPose();
  playerLandingPoseStored = false;
  playerRecoveryStunTimer = 0;
  playerBlinkVisible = true;
  resetPlayerDropIntent();
  combatHitStop = 0;
  combatImpactSlowTimer = 0;
  combatImpactTimeScale = 1;
  cameraShake = 0;
  playerRoot.position.copy(playerStart);
  playerRoot.rotation.y = Math.PI;
  playerRoot.visible = true;
  setEquippedWeapon('sword', false);
  setPlayerShielding(false);
  cancelPlayerHook();
  lastMoveDirection.set(0, 0, -1);
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  requireGamepadNeutral();
  gamepadShieldHeld = false;
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
  playActorAnimation(playerRoot, 'idle', { restart: true });

  resetLevelTransition(true, startRoomId);
  snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
  rememberPlayerSafePosition();
  combatCameraFocus.copy(playerRoot.position).add(COMBAT_CAMERA_TARGET_OFFSET);
  combatCameraLead.set(0, 0, 0);
  resetCombatDestructibles();
  resetCombatTraps();
  resetWaveDirector();
  waveDirector.wave = levelDirector.room;
  setRoomRootVisibility(roomIdForLevel(levelDirector.room));
  clearCombatEffects();
  clearLootDrops();
  combatMessage.hidden = true;
  combatMessageTimer = 0;
  updateInventoryHud();
  updateWaveHud();
  updateCombatHud();
  updatePlayerWeapon();
}

function setGameMode(enabled, options = {}) {
  if (!enabled) {
    cancelPlayerAttackCharge();
    setQaPanelOpen(false, { restoreFocus: false });
    combatLabActive = false;
    combatLabEnemy = null;
    combatLabRespawnTimer = 0;
    qaInvulnerable = false;
    qaInvulnerableInput.checked = false;
    setGameMenuOpen(false, { restoreFocus: false });
    setEquipmentOpen(false);
  }
  gameMode = enabled;
  syncEntranceLandscapeVisibility();
  playToggle.setAttribute('aria-pressed', String(gameMode));
  document.body.classList.toggle('game-active', gameMode);
  combatHud.hidden = !gameMode;
  combatActions.hidden = !gameMode;
  combatStick.hidden = !gameMode;
  inventoryToggle.hidden = !gameMode;
  gameMenuToggle.hidden = !gameMode;
  if (gameMode) {
    setBuildMode(false);
    controls.enabled = false;
    controls.autoRotate = false;
    resetCombatState(options.startRoomId ?? activeEditorRoomId, {
      preserveRun: Boolean(options.preserveRun)
    });
    syncQaControls();
    canvas.focus({ preventScroll: true });
    const lookTarget = playerRoot.position.clone().add(COMBAT_CAMERA_TARGET_OFFSET);
    combatCameraFocus.copy(lookTarget);
    combatCameraLead.set(0, 0, 0);
    camera.position.copy(playerRoot.position).add(followOffset);
    camera.lookAt(lookTarget);
    showCombatMessage('WACHTBRUCH', 1.15);
    roomMusic.setGameActive(true);
  } else {
    roomMusic.setGameActive(false);
    setInventoryOpen(false);
    closeRewardPanel();
    closeSupplyPanel();
    interactionPrompt.hidden = true;
    controls.enabled = true;
    setPlayerShielding(false);
    cancelPlayerHook();
    enemyHud.hidden = true;
    combatMessage.hidden = true;
    pressedKeys.clear();
    touchMoveVector.set(0, 0);
    gamepadMoveVector.set(0, 0);
    gamepadShieldHeld = false;
    combatStickKnob.style.transform = 'translate(-50%, -50%)';
    resetLevelTransition(false, activeEditorRoomId);
    resetCombatDestructibles();
    resetCombatTraps();
    restoreRewardChestPresentation();
    combatEnemies.forEach((enemy) => setRootHitFlash(enemy.root, false));
    combatEnemies.forEach((enemy) => resetEnemyForWave(enemy, false));
    waveDirector.state = WAVE_STATES.READY;
    waveDirector.wave = 1;
    waveDirector.currentWaveIndex = 0;
    waveDirector.pendingSpawns = [];
    waveDirector.completionKind = 'exit';
    waveDirector.rewardUnlockTimer = 0;
    waveDirector.nextWaveTimer = 0;
    waveDirector.gateClosed = false;
    waveDirector.gateTargetY = 0;
    if (arenaGate) arenaGate.position.y = 0;
    if (chestBeacon) chestBeacon.visible = false;
    if (exitBeacon) exitBeacon.visible = false;
    clearCombatEffects();
    clearLootDrops();
    resetCamera();
    updatePlayerWeapon();
    setRoomRootVisibility(activeEditorRoomId);
  }
  if (!gameMode) updatePlayerWeapon();
}

function combatBodyRadius(root) {
  if (root === playerRoot) return PLAYER_BODY_RADIUS;
  return root?.userData.combatEnemy?.bodyRadius ?? ENEMY_BODY_RADIUS;
}

function activeCombatBodies() {
  const bodies = combatEnemies
    .filter((enemy) => enemy.active && enemy.alive)
    .map((enemy) => enemy.root);
  if (playerRoot && playerHealth > 0) bodies.push(playerRoot);
  return bodies;
}

function isCombatBodyBlocked(position, radius, movingRoot) {
  if (!gameMode || !movingRoot) return false;
  return activeCombatBodies().some((otherRoot) => {
    if (otherRoot === movingRoot) return false;
    if (Math.abs(position.y - otherRoot.position.y) > LEVEL_HEIGHT * 0.55) return false;
    const minimumDistance = radius + combatBodyRadius(otherRoot) + BODY_CONTACT_GAP;
    const nextDx = position.x - otherRoot.position.x;
    const nextDz = position.z - otherRoot.position.z;
    const nextDistanceSq = nextDx * nextDx + nextDz * nextDz;
    if (nextDistanceSq >= minimumDistance * minimumDistance) return false;

    const currentDx = movingRoot.position.x - otherRoot.position.x;
    const currentDz = movingRoot.position.z - otherRoot.position.z;
    const currentDistanceSq = currentDx * currentDx + currentDz * currentDz;
    return currentDistanceSq >= minimumDistance * minimumDistance
      || nextDistanceSq < currentDistanceSq;
  });
}

function combatRoomIdForRoot(root) {
  if (root === playerRoot) return roomIdForLevel(levelDirector.room);
  return root?.userData.combatEnemy?.roomId ?? root?.userData.roomId ?? roomIdForLevel(levelDirector.room);
}

function actorsShareCombatHeight(first, second, tolerance = COMBAT_HEIGHT_TOLERANCE) {
  if (!first || !second) return false;
  if (Math.abs(first.position.y - second.position.y) <= tolerance) return true;
  const firstSurface = combatSurfaceAt(first.position, first, { allowAnyHeight: true });
  const secondSurface = combatSurfaceAt(second.position, second, { allowAnyHeight: true });
  const sameStair = firstSurface?.root
    && firstSurface.root === secondSurface?.root
    && firstSurface.root.userData.assetName === 'stairs';
  if (!sameStair) return false;
  const horizontal = horizontalDistanceBetween(first, second);
  return horizontal <= CELL * 1.05
    && Math.abs(first.position.y - second.position.y) <= LEVEL_HEIGHT * 1.08;
}

function stairFlankOverlapDepth(position, radius, actorHeight, stair) {
  const wallMinY = stair.position.y - 0.04;
  const wallMaxY = stair.position.y + LEVEL_HEIGHT + 0.12;
  const actorMinY = position.y;
  const actorMaxY = actorMinY + actorHeight;
  if (actorMaxY <= wallMinY || actorMinY >= wallMaxY) return 0;

  stair.updateMatrixWorld(true);
  const local = stair.worldToLocal(position.clone());
  const scale = THREE.MathUtils.clamp(Number(stair.userData.placement?.scale) || 1, 0.35, 3);
  const halfWidth = STAIR_WALKABLE_HALF_WIDTH * scale;
  const halfThickness = STAIR_FLANK_HALF_THICKNESS * scale;
  const halfLength = STAIR_COLLISION_HALF_LENGTH * scale;
  return stairFlankOverlapDepthLocal({
    x: local.x,
    z: local.z,
    radius,
    walkableHalfWidth: halfWidth,
    collisionHalfLength: halfLength,
    flankHalfThickness: halfThickness
  });
}

function stairFlanksOccupyPosition(position, radius, actorHeight, roomId) {
  return editableRootsForRoom(roomId).some((root) => root.visible
    && root.userData.assetName === 'stairs'
    && stairFlankOverlapDepth(position, radius, actorHeight, root) > 0);
}

function stairFlanksBlockPosition(position, radius, actorHeight, movingRoot, roomId) {
  return editableRootsForRoom(roomId).some((root) => {
    if (!root.visible || root.userData.assetName !== 'stairs') return false;
    const nextDepth = stairFlankOverlapDepth(position, radius, actorHeight, root);
    if (nextDepth <= 0) return false;
    const currentDepth = movingRoot
      ? stairFlankOverlapDepth(movingRoot.position, radius, actorHeight, root)
      : 0;
    return stairFlankMoveBlocked(currentDepth, nextDepth);
  });
}

function clearEnemyNavigation(enemy) {
  if (!enemy) return;
  enemy.navigationPath = [];
  enemy.navigationIndex = 0;
  enemy.navigationTargetNodeId = null;
  enemy.navigationRepathTimer = 0;
  enemy.navigationUsingStairs = false;
  enemy.navigationStairRoot = null;
}

function navigationSurfaceLevel(root) {
  const lift = root.userData.assetName === 'wood-structure' ? 0.18 : 0;
  return Math.round((root.position.y + lift) / LEVEL_HEIGHT);
}

function navigationSurfacePosition(root) {
  const lift = root.userData.assetName === 'wood-structure' ? 0.18 : 0;
  return new THREE.Vector3(
    root.position.x,
    root.position.y + lift + ACTOR_GROUND_OFFSET,
    root.position.z
  );
}

function navigationPositionHasFallZone(position, roomRoots) {
  return roomRoots.some((root) => {
    if (!root.userData.fallZone) return false;
    const local = root.worldToLocal(position.clone());
    const half = CELL * 0.53;
    return Math.abs(local.x) <= half && Math.abs(local.z) <= half;
  });
}

function navigationPositionBlocked(position, sourceRoot, roomRoots) {
  const actorRadius = ENEMY_BODY_RADIUS * 0.72;
  const actorMinY = position.y;
  const actorMaxY = actorMinY + CELL * 0.72;
  const roomId = sourceRoot?.userData.roomId ?? roomRoots[0]?.userData.roomId ?? activeEditorRoomId;
  if (elevationBoundaryBlocksPosition(position, actorRadius, CELL * 0.72, roomId)) return true;
  if (stairFlanksOccupyPosition(position, actorRadius, CELL * 0.72, roomId)) return true;
  return roomRoots.some((root) => {
    if (root === sourceRoot || !SOLID_ASSETS.has(root.userData.assetName)) return false;
    if (root.userData.combatDestructible?.destroyed || root.userData.getragen || root.userData.offen) return false;
    const obstacleMinY = root.position.y;
    const obstacleMaxY = obstacleMinY
      + Math.max(CELL * 0.16, Number(root.userData.modelHeight) || CELL * 0.82);
    if (actorMaxY <= obstacleMinY + 0.03 || actorMinY >= obstacleMaxY - 0.03) return false;
    const compact = ['barrel', 'chest', 'rocks', 'column'].includes(root.userData.assetName);
    const collisionScale = THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
    const half = (compact ? CELL * 0.28 : CELL * 0.43) * collisionScale;
    const closestX = Math.max(root.position.x - half, Math.min(position.x, root.position.x + half));
    const closestZ = Math.max(root.position.z - half, Math.min(position.z, root.position.z + half));
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    return dx * dx + dz * dz < actorRadius * actorRadius;
  });
}

function addCombatNavigationNode(graph, node) {
  node.neighbors = new Map();
  graph.nodes.set(node.id, node);
  return node;
}

function connectCombatNavigationNodes(graph, firstId, secondId, cost = 1) {
  if (firstId === secondId) return;
  const first = graph.nodes.get(firstId);
  const second = graph.nodes.get(secondId);
  if (!first || !second) return;
  const edgeCost = Math.max(0.05, cost);
  first.neighbors.set(secondId, Math.min(first.neighbors.get(secondId) ?? Infinity, edgeCost));
  second.neighbors.set(firstId, Math.min(second.neighbors.get(firstId) ?? Infinity, edgeCost));
}

function combatNavigationBucketKey(level, position) {
  const bucketSize = CELL * 0.5;
  return `${level}:${Math.round(position.x / bucketSize)}:${Math.round(position.z / bucketSize)}`;
}

function combatNavigationSpatialIndex(roots) {
  const buckets = new Map();
  const bucketSize = CELL * 0.5;
  roots.forEach((root) => {
    const key = `${Math.round(root.position.x / bucketSize)}:${Math.round(root.position.z / bucketSize)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(root);
    buckets.set(key, bucket);
  });
  return buckets;
}

function nearbyCombatNavigationRoots(index, position, bucketRadius = 2) {
  const bucketSize = CELL * 0.5;
  const centerX = Math.round(position.x / bucketSize);
  const centerZ = Math.round(position.z / bucketSize);
  const roots = [];
  for (let dx = -bucketRadius; dx <= bucketRadius; dx += 1) {
    for (let dz = -bucketRadius; dz <= bucketRadius; dz += 1) {
      roots.push(...(index.get(`${centerX + dx}:${centerZ + dz}`) ?? []));
    }
  }
  return roots;
}

function buildCombatNavigationGraph(roomId) {
  const graph = { roomId, nodes: new Map(), floorNodes: [], stairs: [] };
  const roomRoots = editableRootsForRoom(roomId);
  const surfaceKeys = new Set();
  const fallZoneIndex = combatNavigationSpatialIndex(
    roomRoots.filter((root) => root.userData.fallZone)
  );
  const obstacleIndex = combatNavigationSpatialIndex(
    roomRoots.filter((root) => SOLID_ASSETS.has(root.userData.assetName)
      && !root.userData.combatDestructible?.destroyed && !root.userData.getragen && !root.userData.offen)
  );

  roomRoots.forEach((root) => {
    if (!WALKABLE_SURFACE_ASSETS.has(root.userData.assetName)) return;
    const level = navigationSurfaceLevel(root);
    if (level < COMBAT_NAV_MIN_LEVEL || level > COMBAT_NAV_MAX_LEVEL) return;
    const position = navigationSurfacePosition(root);
    const nearbyFallZones = nearbyCombatNavigationRoots(fallZoneIndex, position);
    const nearbyObstacles = nearbyCombatNavigationRoots(obstacleIndex, position);
    if (navigationPositionHasFallZone(position, nearbyFallZones)) return;
    if (navigationPositionBlocked(position, root, nearbyObstacles)) return;
    const surfaceKey = `${level}:${Math.round(position.x * 100)}:${Math.round(position.z * 100)}`;
    if (surfaceKeys.has(surfaceKey)) return;
    surfaceKeys.add(surfaceKey);
    const node = addCombatNavigationNode(graph, {
      id: `floor:${root.id}`,
      kind: 'floor',
      level,
      position,
      root
    });
    graph.floorNodes.push(node);
  });

  const buckets = new Map();
  graph.floorNodes.forEach((node) => {
    const key = combatNavigationBucketKey(node.level, node.position);
    const bucket = buckets.get(key) ?? [];
    bucket.push(node);
    buckets.set(key, bucket);
  });

  const nearbyFloorNodes = (level, position, bucketRadius = 2) => {
    const bucketSize = CELL * 0.5;
    const centerX = Math.round(position.x / bucketSize);
    const centerZ = Math.round(position.z / bucketSize);
    const result = [];
    for (let dx = -bucketRadius; dx <= bucketRadius; dx += 1) {
      for (let dz = -bucketRadius; dz <= bucketRadius; dz += 1) {
        result.push(...(buckets.get(`${level}:${centerX + dx}:${centerZ + dz}`) ?? []));
      }
    }
    return result;
  };

  graph.floorNodes.forEach((node) => {
    nearbyFloorNodes(node.level, node.position).forEach((other) => {
      if (other.id === node.id) return;
      const dx = Math.abs(other.position.x - node.position.x);
      const dz = Math.abs(other.position.z - node.position.z);
      const cardinal = (dx <= CELL * 0.18 && dz <= CELL * 1.08)
        || (dz <= CELL * 0.18 && dx <= CELL * 1.08);
      const distance = Math.hypot(dx, dz);
      if (!cardinal || distance < CELL * 0.2) return;
      connectCombatNavigationNodes(graph, node.id, other.id, distance / CELL);
    });
  });

  const upAxis = new THREE.Vector3(0, 1, 0);
  roomRoots.filter((root) => root.userData.assetName === 'stairs').forEach((root) => {
    const lowerLevel = Math.round(root.position.y / LEVEL_HEIGHT);
    if (lowerLevel < COMBAT_NAV_MIN_LEVEL || lowerLevel >= COMBAT_NAV_MAX_LEVEL) return;
    const localLow = new THREE.Vector3(0, 0, CELL * 0.42)
      .applyAxisAngle(upAxis, root.rotation.y);
    const localHigh = new THREE.Vector3(0, 0, -CELL * 0.42)
      .applyAxisAngle(upAxis, root.rotation.y);
    const lowNode = addCombatNavigationNode(graph, {
      id: `stairs:${root.id}:low`,
      kind: 'stairs-low',
      level: lowerLevel,
      position: root.position.clone().add(localLow).setY(root.position.y + ACTOR_GROUND_OFFSET),
      root
    });
    const highNode = addCombatNavigationNode(graph, {
      id: `stairs:${root.id}:high`,
      kind: 'stairs-high',
      level: lowerLevel + 1,
      position: root.position.clone().add(localHigh)
        .setY(root.position.y + LEVEL_HEIGHT + ACTOR_GROUND_OFFSET),
      root
    });
    graph.stairs.push({ root, lowNode, highNode });
    connectCombatNavigationNodes(graph, lowNode.id, highNode.id, 1.25);

    const connectEndpoint = (endpoint, highSide) => {
      nearbyFloorNodes(endpoint.level, endpoint.position, 3)
        .map((node) => {
          const local = node.position.clone().sub(root.position)
            .applyAxisAngle(upAxis, -root.rotation.y);
          const onCorrectSide = highSide ? local.z <= CELL * 0.1 : local.z >= -CELL * 0.1;
          return { node, distance: node.position.distanceTo(endpoint.position), onCorrectSide };
        })
        .filter((candidate) => candidate.onCorrectSide && candidate.distance <= CELL * 0.98)
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 3)
        .forEach((candidate) => {
          connectCombatNavigationNodes(
            graph,
            endpoint.id,
            candidate.node.id,
            Math.max(0.3, candidate.distance / CELL)
          );
        });
    };
    connectEndpoint(lowNode, false);
    connectEndpoint(highNode, true);
  });

  graph.nodeBuckets = new Map();
  graph.nodes.forEach((node) => {
    const key = combatNavigationBucketKey(node.level, node.position);
    const bucket = graph.nodeBuckets.get(key) ?? [];
    bucket.push(node);
    graph.nodeBuckets.set(key, bucket);
  });

  return graph;
}

function rebuildCombatNavigation(roomId = roomIdForLevel(levelDirector.room)) {
  combatNavigationGraph = buildCombatNavigationGraph(roomId);
  combatEnemies.forEach(clearEnemyNavigation);
  return combatNavigationGraph;
}

function nearestCombatNavigationNode(position, graph = combatNavigationGraph) {
  if (!graph?.nodes.size) return null;
  let nearest = null;
  let nearestScore = Infinity;
  const bucketSize = CELL * 0.5;
  const centerX = Math.round(position.x / bucketSize);
  const centerZ = Math.round(position.z / bucketSize);
  for (let level = COMBAT_NAV_MIN_LEVEL; level <= COMBAT_NAV_MAX_LEVEL; level += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      for (let dz = -4; dz <= 4; dz += 1) {
        const nodes = graph.nodeBuckets?.get(`${level}:${centerX + dx}:${centerZ + dz}`) ?? [];
        nodes.forEach((node) => {
          const horizontal = Math.hypot(node.position.x - position.x, node.position.z - position.z);
          if (horizontal > CELL * 1.7) return;
          const vertical = Math.abs(node.position.y - position.y);
          const score = horizontal / CELL + vertical / LEVEL_HEIGHT * 1.35;
          if (score >= nearestScore) return;
          nearest = node;
          nearestScore = score;
        });
      }
    }
  }
  return nearest;
}

function combatNavigationHeuristic(first, second) {
  const horizontal = Math.hypot(
    first.position.x - second.position.x,
    first.position.z - second.position.z
  ) / CELL;
  return horizontal + Math.abs(first.level - second.level) * 1.1;
}

function findCombatNavigationPath(startNode, targetNode, graph = combatNavigationGraph) {
  if (!startNode || !targetNode || !graph) return [];
  if (startNode.id === targetNode.id) return [startNode.id];
  const cameFrom = new Map();
  const gScore = new Map([[startNode.id, 0]]);
  const fScore = new Map([[startNode.id, combatNavigationHeuristic(startNode, targetNode)]]);
  const open = [{ id: startNode.id, score: fScore.get(startNode.id) }];
  const pushOpen = (entry) => {
    open.push(entry);
    let index = open.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (open[parent].score <= entry.score) break;
      open[index] = open[parent];
      index = parent;
    }
    open[index] = entry;
  };
  const popOpen = () => {
    const first = open[0];
    const last = open.pop();
    if (!open.length) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= open.length) break;
      const child = right < open.length && open[right].score < open[left].score ? right : left;
      if (open[child].score >= last.score) break;
      open[index] = open[child];
      index = child;
    }
    open[index] = last;
    return first;
  };

  while (open.length) {
    const currentEntry = popOpen();
    let currentId = currentEntry.id;
    if (currentEntry.score > (fScore.get(currentId) ?? Infinity) + 0.0001) continue;
    if (currentId === targetNode.id) {
      const path = [currentId];
      while (cameFrom.has(currentId)) {
        currentId = cameFrom.get(currentId);
        path.unshift(currentId);
      }
      return path;
    }
    const current = graph.nodes.get(currentId);
    current.neighbors.forEach((edgeCost, neighborId) => {
      const tentative = (gScore.get(currentId) ?? Infinity) + edgeCost;
      if (tentative >= (gScore.get(neighborId) ?? Infinity)) return;
      cameFrom.set(neighborId, currentId);
      gScore.set(neighborId, tentative);
      fScore.set(
        neighborId,
        tentative + combatNavigationHeuristic(graph.nodes.get(neighborId), targetNode)
      );
      pushOpen({ id: neighborId, score: fScore.get(neighborId) });
    });
  }
  return [];
}

function stairWaypointTravelDirection(waypoint) {
  if (!waypoint?.root) return null;
  const localZ = waypoint.kind === 'stairs-high' ? -1 : 1;
  return new THREE.Vector3(0, 0, localZ)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), waypoint.root.rotation.y)
    .normalize();
}

function enemyNavigationDirection(enemy, targetPosition, delta, required = false) {
  enemy.navigationUsingStairs = false;
  enemy.navigationStairRoot = null;
  const direct = targetPosition.clone().sub(enemy.root.position).setY(0);
  if (direct.lengthSq() > 0.0001) direct.normalize();
  if (!combatNavigationGraph || combatNavigationGraph.roomId !== enemy.roomId) {
    return required ? new THREE.Vector3() : direct;
  }
  enemy.navigationRepathTimer = Math.max(0, enemy.navigationRepathTimer - delta);
  const activeWaypoint = combatNavigationGraph.nodes.get(
    enemy.navigationPath?.[enemy.navigationIndex]
  );
  const onStairSurface = combatSurfaceAt(enemy.root.position, enemy.root, { allowAnyHeight: true })?.slope;
  const followingStairs = activeWaypoint?.kind === 'stairs-low' || activeWaypoint?.kind === 'stairs-high';
  const stairWaypointDistance = followingStairs
    ? Math.hypot(
      activeWaypoint.position.x - enemy.root.position.x,
      activeWaypoint.position.z - enemy.root.position.z
    )
    : Infinity;
  const enteringStairs = followingStairs && stairWaypointDistance <= CELL * 0.65;
  enemy.navigationUsingStairs = Boolean(onStairSurface || enteringStairs || followingStairs);
  enemy.navigationStairRoot = followingStairs
    ? activeWaypoint.root
    : onStairSurface?.root ?? null;
  const shouldRepath = !enemy.navigationTargetNodeId
    || (enemy.navigationRepathTimer <= 0 && !onStairSurface && !enteringStairs);
  if (shouldRepath) {
    const startNode = nearestCombatNavigationNode(enemy.root.position);
    const targetNode = nearestCombatNavigationNode(targetPosition);
    if (!startNode || !targetNode) return required ? new THREE.Vector3() : direct;
    enemy.navigationPath = findCombatNavigationPath(startNode, targetNode);
    enemy.navigationIndex = enemy.navigationPath[0] === startNode.id ? 1 : 0;
    enemy.navigationTargetNodeId = targetNode.id;
    enemy.navigationRepathTimer = COMBAT_NAV_REPATH_TIME + (enemy.root.id % 5) * 0.025;
  }

  while (enemy.navigationIndex < enemy.navigationPath.length) {
    const waypoint = combatNavigationGraph.nodes.get(enemy.navigationPath[enemy.navigationIndex]);
    if (!waypoint) {
      enemy.navigationIndex += 1;
      continue;
    }
    const horizontal = Math.hypot(
      waypoint.position.x - enemy.root.position.x,
      waypoint.position.z - enemy.root.position.z
    );
    const vertical = Math.abs(waypoint.position.y - enemy.root.position.y);
    const stairWaypoint = waypoint.kind === 'stairs-low' || waypoint.kind === 'stairs-high';
    const horizontalTolerance = CELL * (stairWaypoint ? 0.28 : 0.22);
    const verticalTolerance = LEVEL_HEIGHT * (stairWaypoint ? 0.42 : 0.28);
    if (stairWaypoint && horizontal <= horizontalTolerance && vertical > verticalTolerance) {
      const stairDirection = stairWaypointTravelDirection(waypoint);
      if (stairDirection) return stairDirection;
    }
    if (horizontal > horizontalTolerance || vertical > verticalTolerance) {
      const direction = waypoint.position.clone().sub(enemy.root.position).setY(0);
      if (stairWaypoint && direction.lengthSq() > 0.0001) {
        const stairDirection = stairWaypointTravelDirection(waypoint);
        if (stairDirection) {
          const normalized = direction.normalize();
          const stairBlend = horizontal <= CELL * 0.75 ? 0.7 : 0.38;
          return normalized.lerp(stairDirection, stairBlend).normalize();
        }
      }
      return direction.lengthSq() > 0.0001 ? direction.normalize() : direct;
    }
    enemy.navigationIndex += 1;
  }
  if (!enemy.navigationPath.length && required) return new THREE.Vector3();
  return direct;
}

function enemyStairLaneDirection(enemy, travelDirection) {
  const direction = travelDirection.clone().setY(0);
  const stair = enemy.navigationStairRoot
    ?? combatSurfaceAt(enemy.root.position, enemy.root, { allowAnyHeight: true })?.root;
  if (!stair || stair.userData.assetName !== 'stairs') {
    return direction.lengthSq() > 0.0001 ? direction.normalize() : direction;
  }

  stair.updateMatrixWorld(true);
  const local = stair.worldToLocal(enemy.root.position.clone());
  const scale = THREE.MathUtils.clamp(Number(stair.userData.placement?.scale) || 1, 0.35, 3);
  const halfWidth = STAIR_WALKABLE_HALF_WIDTH * scale;
  const sideAxis = new THREE.Vector3(1, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), stair.rotation.y)
    .normalize();
  const centerCorrection = THREE.MathUtils.clamp(
    -local.x / Math.max(0.001, halfWidth * 0.78),
    -1,
    1
  );
  if (Math.abs(centerCorrection) > 0.08) {
    direction.addScaledVector(
      sideAxis,
      centerCorrection * ENEMY_STAIR_CENTERING_STRENGTH
    );
  }
  return direction.lengthSq() > 0.0001 ? direction.normalize() : direction;
}

function combatSurfaceCandidate(root, position) {
  const assetName = root.userData.assetName;
  const local = root.worldToLocal(position.clone());
  if (assetName === 'stairs') {
    const scale = THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
    const halfWidth = STAIR_WALKABLE_HALF_WIDTH * scale;
    const halfLength = STAIR_COLLISION_HALF_LENGTH * scale;
    if (Math.abs(local.x) > halfWidth || Math.abs(local.z) > halfLength) return null;
    const progress = THREE.MathUtils.clamp((halfLength - local.z) / (halfLength * 2), 0, 1);
    return {
      y: root.position.y + ACTOR_GROUND_OFFSET + progress * LEVEL_HEIGHT,
      slope: true,
      root
    };
  }
  if (!WALKABLE_SURFACE_ASSETS.has(assetName)) return null;
  // Bauteile duerfen eine eigene Gehflaeche mitbringen. Ohne Angabe gilt wie
  // bisher eine Zelle und die Oberkante des Fusses.
  const flaeche = BUILD_ASSET_DEFINITIONS[assetName]?.begehbar;
  if (flaeche) {
    const gesamtSkalierung = (Number(root.userData.baseModelScale) || 1)
      * THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
    const achsen = BUILD_ASSET_DEFINITIONS[assetName]?.achsen ?? {};
    if (Math.abs(local.x) > flaeche.halbeBreite * gesamtSkalierung * (achsen.x ?? 1)) return null;
    if (Math.abs(local.z) > flaeche.halbeLaenge * gesamtSkalierung * (achsen.z ?? 1)) return null;
    const deckHoehe = flaeche.deckIstBoden
      ? 0
      : flaeche.hoehe * gesamtSkalierung * (achsen.y ?? 1);
    return {
      y: root.position.y + deckHoehe + ACTOR_GROUND_OFFSET,
      slope: false,
      root
    };
  }
  const half = CELL * 0.53;
  if (Math.abs(local.x) > half || Math.abs(local.z) > half) return null;
  const bridgeLift = assetName === 'wood-structure' ? 0.18 : 0;
  return { y: root.position.y + bridgeLift + ACTOR_GROUND_OFFSET, slope: false, root };
}

function combatFallZoneAt(position, movingRoot) {
  const roomId = combatRoomIdForRoot(movingRoot);
  return editableRootsForRoom(roomId).some((root) => {
    if (!root.userData.fallZone) return false;
    const local = root.worldToLocal(position.clone());
    const half = CELL * 0.53;
    return Math.abs(local.x) <= half && Math.abs(local.z) <= half;
  });
}

function combatSurfaceAt(position, movingRoot, options = {}) {
  const roomId = combatRoomIdForRoot(movingRoot);
  const currentY = movingRoot?.position.y ?? ACTOR_GROUND_OFFSET;
  const roomRoots = editableRootsForRoom(roomId);
  if (combatFallZoneAt(position, movingRoot)) return null;
  const candidates = roomRoots
    .filter((root) => root.visible && (root.userData.assetName === 'stairs'
      || WALKABLE_SURFACE_ASSETS.has(root.userData.assetName)))
    .map((root) => combatSurfaceCandidate(root, position))
    .filter(Boolean);
  const allowed = (candidate) => options.allowAnyHeight
    || Math.abs(candidate.y - currentY) <= COMBAT_SURFACE_STEP;
  const slope = candidates
    .filter((candidate) => candidate.slope && allowed(candidate))
    .sort((first, second) => Math.abs(first.y - currentY) - Math.abs(second.y - currentY))[0];
  if (slope) return slope;
  return candidates.filter(allowed).sort((first, second) => second.y - first.y)[0] ?? null;
}

function rememberPlayerSafePosition() {
  if (!playerRoot || playerFallTimer > 0 || playerHookTimer > 0) return;
  playerLastSafePosition.copy(playerRoot.position);
}

function snapActorToCombatSurface(root, options = {}) {
  const surface = combatSurfaceAt(root.position, root, options);
  if (!surface) return false;
  root.position.y = surface.y;
  if (root === playerRoot) rememberPlayerSafePosition();
  return true;
}

function resetPlayerDropIntent() {
  playerDropIntentTimer = 0;
  playerDropIntentDirection.set(0, 0, 0);
}

function playerDropIntentReady(movement, delta) {
  if (delta <= 0 || movement.lengthSq() < 0.0001) return false;
  const direction = movement.clone().setY(0).normalize();
  if (playerDropIntentDirection.lengthSq() && playerDropIntentDirection.dot(direction) < 0.82) {
    resetPlayerDropIntent();
  }
  playerDropIntentDirection.copy(direction);
  playerDropIntentTimer += delta;
  return playerDropIntentTimer >= PLAYER_DROP_HOLD_TIME;
}

function beginPlayerFall() {
  if (!gameMode || playerFallTimer > 0 || playerHealth <= 0) return;
  cancelPlayerAttackCharge();
  playerHurtTimer = 0;
  playerKnockback.set(0, 0, 0);
  playerLandingTimer = 0;
  restorePlayerLandingPose();
  playerFallMode = 'void';
  playerFallDuration = PLAYER_VOID_FALL_TIME;
  playerFallTimer = playerFallDuration;
  playerFallStartPosition.copy(playerRoot.position);
  playerFallDropHeight = 0;
  playerFallArcHeight = 0;
  playerInvulnerability = Math.max(playerInvulnerability, playerFallDuration + 0.2);
  resetPlayerDropIntent();
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  gamepadMoveVector.set(0, 0);
  setPlayerShielding(false);
  cancelPlayerHook();
  showCombatMessage('ABGRUND', 0.7);
}

function playerGroundFallLanding(targetPosition, movement, fallbackSurface, radius) {
  const direction = playerDropIntentDirection.lengthSq() > 0.0001
    ? playerDropIntentDirection.clone().normalize()
    : movement.clone().setY(0).normalize();
  const distances = [1, 0.86, 0.7, 0.54]
    .map((factor) => PLAYER_DROP_FORWARD_DISTANCE * factor);
  const candidates = distances.map((distance) => ({
    position: playerRoot.position.clone().addScaledVector(direction, distance),
    surface: null
  }));
  candidates.push({ position: targetPosition.clone(), surface: fallbackSurface });

  for (const candidate of candidates) {
    const surface = candidate.surface
      ?? combatSurfaceAt(candidate.position, playerRoot, { allowAnyHeight: true });
    if (!surface || surface.y >= playerRoot.position.y - COMBAT_SURFACE_STEP) continue;
    const landingProbe = candidate.position.clone().setY(surface.y);
    if (isCombatPositionBlocked(landingProbe, radius, playerRoot)) continue;
    return { position: candidate.position, surface };
  }
  return null;
}

function beginPlayerGroundFall(targetPosition, surface) {
  if (!gameMode || playerFallTimer > 0 || playerHealth <= 0 || !surface) return false;
  playerHurtTimer = 0;
  playerKnockback.set(0, 0, 0);
  playerLandingTimer = 0;
  restorePlayerLandingPose();
  playerFallMode = 'ground';
  playerFallStartPosition.copy(playerRoot.position);
  playerFallLandingPosition.copy(targetPosition);
  playerFallLandingPosition.y = surface.y;
  playerFallDropHeight = Math.max(0, playerFallStartPosition.y - playerFallLandingPosition.y);
  const horizontalDistance = Math.hypot(
    playerFallLandingPosition.x - playerFallStartPosition.x,
    playerFallLandingPosition.z - playerFallStartPosition.z
  );
  playerFallArcHeight = THREE.MathUtils.clamp(
    PLAYER_DROP_ARC_HEIGHT + horizontalDistance * 0.08,
    CELL * 0.36,
    CELL * 0.56
  );
  playerFallDuration = THREE.MathUtils.clamp(
    0.36 + playerFallDropHeight * 0.08 + horizontalDistance * 0.045,
    0.5,
    0.78
  );
  playerFallTimer = playerFallDuration;
  playerInvulnerability = Math.max(playerInvulnerability, playerFallDuration + 0.16);
  const jumpDirection = playerFallLandingPosition.clone().sub(playerFallStartPosition).setY(0);
  if (jumpDirection.lengthSq() > 0.0001) {
    playerRoot.rotation.y = Math.atan2(jumpDirection.x, jumpDirection.z);
  }
  resetPlayerDropIntent();
  setPlayerShielding(false);
  cancelPlayerHook();
  playActorAnimation(playerRoot, 'jump', { restart: true, speed: 1.08, fade: 0.05 });
  return true;
}

function restorePlayerLandingPose() {
  if (!playerLandingPoseStored) return;
  const frame = playerRoot?.userData.frame;
  if (frame) frame.scale.copy(playerLandingBaseScale);
  playerLandingPoseStored = false;
}

function beginPlayerLandingFeedback(dropHeight = 0) {
  if (!playerRoot || playerHealth <= 0) return;
  const frame = playerRoot.userData.frame;
  if (frame) {
    playerLandingBaseScale.copy(frame.scale);
    playerLandingPoseStored = true;
  }
  playerLandingStrength = THREE.MathUtils.clamp(dropHeight / LEVEL_HEIGHT, 0.38, 1);
  playerLandingDuration = THREE.MathUtils.lerp(
    PLAYER_LANDING_MIN_HOLD,
    PLAYER_LANDING_MAX_HOLD,
    playerLandingStrength
  );
  playerLandingTimer = playerLandingDuration;
  playerDustTimer = 0;
  spawnPlayerLandingDust(playerLandingStrength);
  playTone(68, 0.08, 0.018 + playerLandingStrength * 0.018, 0, 'triangle');
  playTone(112, 0.07, 0.012 + playerLandingStrength * 0.01, 0.025, 'sine');
  playActorAnimation(playerRoot, 'idle', { restart: true, fade: 0.04 });
}

function playerVoidRecoveryPosition() {
  const fallDirection = lastMoveDirection.clone().setY(0);
  if (fallDirection.lengthSq() <= 0.0001) {
    fallDirection.set(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
  }
  fallDirection.normalize();
  const inward = fallDirection.negate();
  const distances = [PLAYER_VOID_RECOVERY_STEP_IN, PLAYER_VOID_RECOVERY_STEP_IN * 1.55, 0];

  for (const distance of distances) {
    const candidate = playerLastSafePosition.clone().addScaledVector(inward, distance);
    const surface = combatSurfaceAt(candidate, playerRoot, { allowAnyHeight: true });
    if (!surface) continue;
    candidate.y = surface.y;
    if (isCombatPositionBlocked(candidate, PLAYER_BODY_RADIUS, playerRoot)) continue;
    return candidate;
  }

  return playerLastSafePosition.clone();
}

function beginPlayerVoidRecovery() {
  playerRecoveryStunTimer = PLAYER_VOID_RECOVERY_STUN_TIME;
  playerBlinkVisible = true;
  playerInvulnerability = Math.max(playerInvulnerability, PLAYER_VOID_RECOVERY_STUN_TIME + 0.28);
  setPlayerShielding(false);
  resetPlayerDropIntent();
  pressedKeys.clear();
  touchMoveVector.set(0, 0);
  gamepadMoveVector.set(0, 0);
  playActorAnimation(playerRoot, 'emote-no', { once: true, restart: true, speed: 1.25, fade: 0.04 });
}

function updatePlayerVoidRecovery(delta) {
  if (playerRecoveryStunTimer <= 0) {
    if (!playerBlinkVisible) {
      playerBlinkVisible = true;
      updatePlayerWeapon();
    }
    return false;
  }
  playerRecoveryStunTimer = Math.max(0, playerRecoveryStunTimer - delta);
  playerBlinkVisible = Math.floor(playerRecoveryStunTimer * 16) % 2 === 0;
  if (playerRecoveryStunTimer <= 0) playerBlinkVisible = true;
  updatePlayerWeapon();
  if (playerRecoveryStunTimer <= 0) playActorAnimation(playerRoot, 'idle', { fade: 0.08 });
  return playerRecoveryStunTimer > 0;
}

function updatePlayerLandingFeedback(delta) {
  if (playerLandingTimer <= 0) return false;
  playerLandingTimer = Math.max(0, playerLandingTimer - delta);
  const frame = playerRoot?.userData.frame;
  if (frame) {
    const progress = 1 - playerLandingTimer / Math.max(0.001, playerLandingDuration);
    const impact = Math.pow(1 - progress, 2.2);
    const rebound = Math.sin(progress * Math.PI) * Math.pow(1 - progress, 0.75);
    const squash = playerLandingStrength * impact * 0.18;
    const bounce = playerLandingStrength * rebound * 0.045;
    frame.scale.set(
      playerLandingBaseScale.x * (1 + squash * 0.62),
      playerLandingBaseScale.y * (1 - squash + bounce),
      playerLandingBaseScale.z * (1 + squash * 0.62)
    );
  }
  if (playerLandingTimer > 0) return true;
  restorePlayerLandingPose();
  playerLandingDuration = 0;
  playerLandingStrength = 0;
  return false;
}

function updatePlayerFall(delta) {
  if (playerFallTimer <= 0) return false;
  playerFallTimer = Math.max(0, playerFallTimer - delta);
  const progress = 1 - playerFallTimer / playerFallDuration;
  if (playerFallMode === 'ground') {
    const travelProgress = progress * progress * (3 - 2 * progress);
    playerRoot.position.x = THREE.MathUtils.lerp(
      playerFallStartPosition.x,
      playerFallLandingPosition.x,
      travelProgress
    );
    playerRoot.position.z = THREE.MathUtils.lerp(
      playerFallStartPosition.z,
      playerFallLandingPosition.z,
      travelProgress
    );
    const descendingY = THREE.MathUtils.lerp(
      playerFallStartPosition.y,
      playerFallLandingPosition.y,
      progress
    );
    playerRoot.position.y = descendingY + Math.sin(progress * Math.PI) * playerFallArcHeight;
  } else {
    playerRoot.position.y = playerFallStartPosition.y - Math.pow(progress, 1.7) * CELL * 1.75;
    playerRoot.rotation.y += delta * 2.4;
  }
  if (playerFallTimer > 0) return true;

  if (playerFallMode === 'ground') {
    const dropHeight = playerFallDropHeight;
    playerRoot.position.copy(playerFallLandingPosition);
    playerFallMode = 'none';
    playerFallArcHeight = 0;
    playerInvulnerability = 0;
    snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
    rememberPlayerSafePosition();
    if (dropHeight >= PLAYER_DROP_MIN_DAMAGE_HEIGHT) {
      applyCombatDamage({ kind: 'player' }, {
        amount: 1,
        direction: lastMoveDirection.clone().negate(),
        blockable: false,
        knockback: 0,
        invulnerability: 0.72,
        source: 'ground-fall'
      });
      if (playerHealth > 0) showCombatMessage('HART GELANDET', 0.62);
    }
    if (playerHealth > 0) beginPlayerLandingFeedback(dropHeight);
    return true;
  }

  playerRoot.position.copy(playerVoidRecoveryPosition());
  playerFallMode = 'none';
  playerFallArcHeight = 0;
  playerInvulnerability = 0;
  applyCombatDamage({ kind: 'player' }, {
    amount: 1,
    direction: lastMoveDirection.clone().negate(),
    blockable: false,
    knockback: 0,
    invulnerability: 0.9,
    source: 'fall-zone'
  });
  if (playerHealth > 0) {
    beginPlayerVoidRecovery();
    snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
    rememberPlayerSafePosition();
    showCombatMessage('SICHERER GRUND', 0.72);
  }
  return true;
}

function arenaGateOverlapDepth(position, radius) {
  const depthX = ARENA_GATE_HALF_WIDTH + radius - Math.abs(position.x);
  const depthZ = ARENA_GATE_COLLISION_HALF_DEPTH + radius - Math.abs(position.z - ARENA_GATE_Z);
  if (depthX <= 0 || depthZ <= 0) return 0;
  return Math.min(depthX, depthZ);
}

function isArenaGateBlocked(position, radius, movingRoot) {
  if (!waveDirector.gateClosed) return false;
  const nextDepth = arenaGateOverlapDepth(position, radius);
  if (nextDepth <= 0) return false;
  const currentDepth = movingRoot ? arenaGateOverlapDepth(movingRoot.position, radius) : 0;
  return currentDepth <= 0 || nextDepth >= currentDepth - 0.0001;
}

function fallbackWeaponWorldContact(position, direction, kind) {
  const normal = direction.clone().setY(0).normalize().negate();
  const contactPosition = position.clone().addScaledVector(normal, WEAPON_REBOUND_PROFILE.probeRadius * 0.55);
  contactPosition.y = playerRoot.position.y + 0.72;
  return {
    kind,
    position: contactPosition,
    normal
  };
}

function weaponWorldContactAt(position, radius, direction, options = {}) {
  const roomId = roomIdForLevel(levelDirector.room);
  const actorHeight = Math.max(CELL * 0.42, Number(playerRoot?.userData.modelHeight) || CELL * 0.72);
  const maxX = CELL * 6.35;
  const maxZ = CELL * 4.35;
  if (position.x < -maxX || position.x > maxX || position.z < -maxZ || position.z > maxZ) {
    return fallbackWeaponWorldContact(position, direction, 'room-boundary');
  }
  if (waveDirector.gateClosed && arenaGateOverlapDepth(position, radius) > 0) {
    return fallbackWeaponWorldContact(position, direction, 'arena-gate');
  }
  if (stairFlanksOccupyPosition(position, radius, actorHeight, roomId)) {
    return fallbackWeaponWorldContact(position, direction, 'stair-flank');
  }
  if (elevationBoundaryBlocksPosition(position, radius, actorHeight, roomId)) {
    return fallbackWeaponWorldContact(position, direction, 'height-boundary');
  }

  const actorMinY = playerRoot.position.y;
  const actorMaxY = actorMinY + actorHeight;
  for (const root of editableRootsForRoom(roomId)) {
    if (!root.visible || root === options.ignoreRoot || !SOLID_ASSETS.has(root.userData.assetName)) continue;
    if (root.userData.combatDestructible?.destroyed || root.userData.getragen || root.userData.offen) continue;
    const obstacleMinY = root.position.y;
    const obstacleMaxY = obstacleMinY
      + Math.max(CELL * 0.16, Number(root.userData.modelHeight) || CELL * 0.82);
    if (actorMaxY <= obstacleMinY + 0.03 || actorMinY >= obstacleMaxY - 0.03) continue;
    const compact = ['barrel', 'chest', 'rocks', 'column'].includes(root.userData.assetName);
    const collisionScale = THREE.MathUtils.clamp(
      Number(root.userData.placement?.scale) || 1,
      0.35,
      3
    );
    const half = (compact ? CELL * 0.28 : CELL * 0.43) * collisionScale;
    const closestX = Math.max(root.position.x - half, Math.min(position.x, root.position.x + half));
    const closestZ = Math.max(root.position.z - half, Math.min(position.z, root.position.z + half));
    const deltaX = position.x - closestX;
    const deltaZ = position.z - closestZ;
    if (deltaX * deltaX + deltaZ * deltaZ >= radius * radius) continue;
    const normal = new THREE.Vector3(deltaX, 0, deltaZ);
    if (normal.lengthSq() < 0.0001) normal.copy(direction).negate();
    normal.normalize();
    const contactPosition = new THREE.Vector3(
      closestX,
      THREE.MathUtils.clamp(
        playerRoot.position.y + 0.72,
        obstacleMinY + 0.06,
        Math.max(obstacleMinY + 0.06, obstacleMaxY - 0.06)
      ),
      closestZ
    );
    return {
      kind: 'solid-asset',
      root,
      position: contactPosition,
      normal
    };
  }
  return null;
}

function findWeaponWorldContact(direction, maxDistance, options = {}) {
  if (!WEAPON_REBOUND_PROFILE.enabled || !playerRoot || maxDistance <= 0) return null;
  const normalizedDirection = direction.clone().setY(0);
  if (normalizedDirection.lengthSq() < 0.0001) return null;
  normalizedDirection.normalize();
  const distances = createWeaponProbeDistances({
    start: WEAPON_REBOUND_PROFILE.probeStart,
    range: maxDistance,
    step: WEAPON_REBOUND_PROFILE.probeStep
  });
  for (const distance of distances) {
    const probe = playerRoot.position.clone().addScaledVector(normalizedDirection, distance);
    const contact = weaponWorldContactAt(
      probe,
      WEAPON_REBOUND_PROFILE.probeRadius,
      normalizedDirection,
      options
    );
    if (!contact) continue;
    return {
      ...contact,
      direction: normalizedDirection.clone(),
      distance
    };
  }
  return null;
}

function isCombatPositionBlocked(position, radius, movingRoot) {
  const maxX = CELL * 6.35;
  const maxZ = CELL * 4.35;
  if (position.x < -maxX || position.x > maxX || position.z < -maxZ || position.z > maxZ) return true;
  if (isArenaGateBlocked(position, radius, movingRoot)) return true;

  const collisionRoots = editableRoots;
  const actorHeight = Math.max(CELL * 0.42, Number(movingRoot?.userData.modelHeight) || CELL * 0.72);
  const roomId = combatRoomIdForRoot(movingRoot);
  if (stairFlanksBlockPosition(position, radius, actorHeight, movingRoot, roomId)) return true;
  if (elevationBoundaryBlocksPosition(
    position,
    radius,
    actorHeight,
    roomId
  )) return true;
  const actorMinY = position.y;
  const actorMaxY = actorMinY + actorHeight;
  const blockedByWorld = collisionRoots.some((root) => {
    if (!root.visible || root === movingRoot || !SOLID_ASSETS.has(root.userData.assetName)) return false;
    if (root.userData.combatDestructible?.destroyed || root.userData.getragen || root.userData.offen) return false;
    const obstacleMinY = root.position.y;
    const obstacleMaxY = obstacleMinY + Math.max(CELL * 0.16, Number(root.userData.modelHeight) || CELL * 0.82);
    if (actorMaxY <= obstacleMinY + 0.03 || actorMinY >= obstacleMaxY - 0.03) return false;
    const compact = ['barrel', 'chest', 'rocks', 'column'].includes(root.userData.assetName);
    const collisionScale = THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
    const half = (compact ? CELL * 0.28 : CELL * 0.43) * collisionScale;
    const closestX = Math.max(root.position.x - half, Math.min(position.x, root.position.x + half));
    const closestZ = Math.max(root.position.z - half, Math.min(position.z, root.position.z + half));
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  });
  return blockedByWorld || isCombatBodyBlocked(position, radius, movingRoot);
}

function moveCombatRoot(root, movement, radius = PLAYER_BODY_RADIUS, options = {}) {
  const startX = root.position.x;
  const startZ = root.position.z;
  const target = root.position.clone().add(movement);
  const targetSurface = combatSurfaceAt(target, root, options);
  if (!targetSurface && !options.allowVoid) {
    const unrestrictedSurface = combatSurfaceAt(target, root, { ...options, allowAnyHeight: true });
    if (unrestrictedSurface) {
      const descending = unrestrictedSurface.y < root.position.y - COMBAT_SURFACE_STEP;
      if (root === playerRoot && descending) {
        if (!playerDropIntentReady(movement, Number(options.dropIntentDelta) || 0)) return false;
        const landing = playerGroundFallLanding(target, movement, unrestrictedSurface, radius);
        if (!landing) {
          resetPlayerDropIntent();
          return false;
        }
        return beginPlayerGroundFall(landing.position, landing.surface);
      }
      if (root === playerRoot) resetPlayerDropIntent();
      return false;
    }
    if (root !== playerRoot || isCombatPositionBlocked(target, radius, root)) return false;
    root.position.x = target.x;
    root.position.z = target.z;
    beginPlayerFall();
    return true;
  }
  if (root === playerRoot) resetPlayerDropIntent();
  const nextX = root.position.clone();
  nextX.x += movement.x;
  const nextXSurface = combatSurfaceAt(nextX, root, options);
  if (nextXSurface && !options.preserveHeight) nextX.y = nextXSurface.y;
  if (!isCombatPositionBlocked(nextX, radius, root)) root.position.x = nextX.x;

  const nextZ = root.position.clone();
  nextZ.z += movement.z;
  const nextZSurface = combatSurfaceAt(nextZ, root, options);
  if (nextZSurface && !options.preserveHeight) nextZ.y = nextZSurface.y;
  if (!isCombatPositionBlocked(nextZ, radius, root)) root.position.z = nextZ.z;
  const moved = Math.abs(root.position.x - startX) + Math.abs(root.position.z - startZ) > 0.0001;
  if (!moved || options.preserveHeight) return moved;
  const surface = combatSurfaceAt(root.position, root, options) ?? targetSurface;
  if (surface) root.position.y = surface.y;
  if (root === playerRoot && surface) rememberPlayerSafePosition();
  return moved;
}

function moveCombatRootSwept(root, movement, radius = PLAYER_BODY_RADIUS, options = {}) {
  const distance = Math.hypot(movement.x, movement.z);
  const segmentCount = Math.max(1, Math.ceil(distance / (CELL * 0.1)));
  const segment = movement.clone().multiplyScalar(1 / segmentCount);
  let moved = false;

  for (let index = 0; index < segmentCount; index += 1) {
    const segmentMoved = moveCombatRoot(root, segment, radius, options);
    moved = segmentMoved || moved;
    if (!segmentMoved || (root === playerRoot && playerFallTimer > 0)) break;
  }

  if (root === playerRoot && playerFallTimer <= 0 && playerHookTimer <= 0) {
    snapActorToCombatSurface(root);
  }
  return moved;
}

function connectedGamepad() {
  if (GAMEPAD_INPUT_DISABLED) return null;
  if (typeof navigator.getGamepads !== 'function') return null;
  const gamepads = [...navigator.getGamepads()].filter(Boolean);
  const active = gamepads.find((gamepad) => gamepad.index === activeGamepadIndex && gamepad.connected);
  return active ?? gamepads.find((gamepad) => gamepad.connected) ?? null;
}

function gamepadButtonDown(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.55));
}

function applyGamepadDeadzone(horizontal, vertical) {
  const length = Math.hypot(horizontal, vertical);
  if (length <= GAMEPAD_DEADZONE) return new THREE.Vector2();
  const magnitude = THREE.MathUtils.clamp((length - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE), 0, 1);
  const easedMagnitude = Math.pow(magnitude, 1.12);
  return new THREE.Vector2(horizontal / length, vertical / length).multiplyScalar(easedMagnitude);
}

function requireGamepadNeutral() {
  gamepadMovementArmed = false;
  gamepadNeutralReady = false;
  gamepadNeutralTimer = 0;
  gamepadMoveVector.set(0, 0);
}

function requireGuidedInputNeutral() {
  guidedInputArmed = false;
  guidedInputNeutralTimer = 0;
  guidedNavigationLatch = 0;
}

function updateGamepadInput(delta) {
  const gamepad = connectedGamepad();
  if (!gamepad) {
    gamepadMoveVector.multiplyScalar(Math.exp(-delta * 13));
    if (gamepadMoveVector.lengthSq() < 0.0001) gamepadMoveVector.set(0, 0);
    if (gamepadShieldHeld) {
      gamepadShieldHeld = false;
      setPlayerShielding(false);
    }
    gamepadButtonState = [];
    activeGamepadIndex = null;
    gamepadMovementArmed = false;
    gamepadNeutralReady = false;
    gamepadNeutralTimer = 0;
    requireGuidedInputNeutral();
    return;
  }

  const changedController = activeGamepadIndex !== gamepad.index;
  activeGamepadIndex = gamepad.index;
  const analogHorizontal = Number(gamepad.axes?.[0] ?? 0);
  const analogVertical = -Number(gamepad.axes?.[1] ?? 0);
  const analogLength = Math.hypot(analogHorizontal, analogVertical);
  let horizontal = analogHorizontal;
  let vertical = analogVertical;
  const dpadHorizontal = (gamepadButtonDown(gamepad, 15) ? 1 : 0)
    - (gamepadButtonDown(gamepad, 14) ? 1 : 0);
  const dpadVertical = (gamepadButtonDown(gamepad, 12) ? 1 : 0)
    - (gamepadButtonDown(gamepad, 13) ? 1 : 0);
  if (dpadHorizontal || dpadVertical) {
    horizontal = dpadHorizontal;
    vertical = dpadVertical;
  }

  if (changedController) {
    requireGamepadNeutral();
    requireGuidedInputNeutral();
  }
  const currentButtons = gamepad.buttons.map((button) => Boolean(button.pressed || button.value > 0.55));
  const buttonPressed = (index) => Boolean(!changedController
    && gamepadButtonState.length
    && currentButtons[index]
    && !gamepadButtonState[index]);

  if ((buttonPressed(9) || buttonPressed(8)) && gameMode && !rewardOpen && !supplyOpen && !equipmentOpen) {
    if (inventoryOpen) {
      setInventoryOpen(false);
      setGameMenuOpen(true);
    } else {
      setGameMenuOpen(!gameMenuOpen);
    }
  }

  const guidedPanel = activeGuidedPanel();
  if (guidedPanel) {
    gamepadMoveVector.set(0, 0);
    let navigationDirection = 0;
    if (dpadHorizontal) navigationDirection = dpadHorizontal > 0 ? 1 : -1;
    else if (dpadVertical) navigationDirection = dpadVertical > 0 ? -1 : 1;
    else if (Math.abs(analogHorizontal) > 0.58 || Math.abs(analogVertical) > 0.58) {
      if (Math.abs(analogHorizontal) > Math.abs(analogVertical)) navigationDirection = analogHorizontal > 0 ? 1 : -1;
      else navigationDirection = analogVertical > 0 ? -1 : 1;
    }
    if (!guidedInputArmed) {
      const controlsReleased = !navigationDirection
        && !currentButtons[0]
        && !currentButtons[1]
        && !currentButtons[8]
        && !currentButtons[9];
      if (controlsReleased) {
        guidedInputNeutralTimer += delta;
        if (guidedInputNeutralTimer >= GUIDED_INPUT_NEUTRAL_HOLD_TIME) guidedInputArmed = true;
      } else {
        guidedInputNeutralTimer = 0;
      }
      if (gamepadShieldHeld) {
        gamepadShieldHeld = false;
        setPlayerShielding(false);
      }
      gamepadButtonState = currentButtons;
      return;
    }
    if (!navigationDirection) guidedNavigationLatch = 0;
    else if (!guidedNavigationLatch) {
      guidedNavigationLatch = navigationDirection;
      focusGuidedPanel(guidedPanel, navigationDirection);
    }
    if (buttonPressed(0)) activateGuidedSelection(guidedPanel);
    if (buttonPressed(1)) closeGuidedPanel(guidedPanel);
    if (gamepadShieldHeld) {
      gamepadShieldHeld = false;
      setPlayerShielding(false);
    }
    gamepadButtonState = currentButtons;
    return;
  }

  guidedNavigationLatch = 0;
  const dpadActive = Boolean(dpadHorizontal || dpadVertical);
  if (!gamepadMovementArmed) {
    gamepadMoveVector.set(0, 0);
    if (!gamepadNeutralReady) {
      if (!dpadActive && analogLength <= GAMEPAD_NEUTRAL_THRESHOLD) {
        gamepadNeutralTimer += delta;
        if (gamepadNeutralTimer >= GAMEPAD_NEUTRAL_HOLD_TIME) gamepadNeutralReady = true;
      } else {
        gamepadNeutralTimer = 0;
      }
    } else if (dpadActive || analogLength >= GAMEPAD_REARM_THRESHOLD) {
      gamepadMovementArmed = true;
    }
  }
  if (gamepadMovementArmed) {
    const target = applyGamepadDeadzone(horizontal, vertical);
    const smoothing = 1 - Math.exp(-delta * 10.5);
    gamepadMoveVector.lerp(target, smoothing);
    if (!target.lengthSq() && gamepadMoveVector.lengthSq() < 0.0001) gamepadMoveVector.set(0, 0);
  }

  if (!changedController && gamepadButtonState.length) {
    if (currentButtons[2] && !gamepadButtonState[2]) beginPlayerAttackInput();
    if (!currentButtons[2] && gamepadButtonState[2]) releasePlayerAttackInput();
    if (currentButtons[0] && !gamepadButtonState[0]) startPlayerDodge();
    if (currentButtons[3] && !gamepadButtonState[3]) startPlayerHook();
  }

  const shieldHeld = Boolean(currentButtons[4] || currentButtons[6]);
  if (shieldHeld !== gamepadShieldHeld) {
    gamepadShieldHeld = shieldHeld;
    setPlayerShielding(shieldHeld);
  }
  gamepadButtonState = currentButtons;
}

function movementInputVector() {
  const horizontal = (pressedKeys.has('d') ? 1 : 0)
    - (pressedKeys.has('a') ? 1 : 0)
    + (pressedKeys.has('arrowright') ? 1 : 0)
    - (pressedKeys.has('arrowleft') ? 1 : 0)
    + touchMoveVector.x
    + gamepadMoveVector.x;
  const vertical = (pressedKeys.has('w') || pressedKeys.has('arrowup') ? 1 : 0)
    - (pressedKeys.has('s') || pressedKeys.has('arrowdown') ? 1 : 0)
    + touchMoveVector.y
    + gamepadMoveVector.y;
  const screenInput = new THREE.Vector2(horizontal, vertical);
  if (screenInput.lengthSq() < 0.0004) return new THREE.Vector3();
  if (screenInput.lengthSq() > 1) screenInput.normalize();

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  return forward.multiplyScalar(screenInput.y).add(right.multiplyScalar(screenInput.x));
}

function playerFacingFromDirection(direction) {
  return Math.atan2(direction.x, direction.z);
}

function turnPlayerToward(direction, delta, speed = PLAYER_FACING_SMOOTH_SPEED) {
  if (!playerRoot || direction.lengthSq() <= 0.0001) return;
  const target = playerFacingFromDirection(direction);
  const blend = delta > 0 ? 1 - Math.exp(-delta * speed) : 1;
  const shortest = Math.atan2(
    Math.sin(target - playerRoot.rotation.y),
    Math.cos(target - playerRoot.rotation.y)
  );
  playerRoot.rotation.y += shortest * THREE.MathUtils.clamp(blend, 0, 1);
}

function beginPlayerWeaponRebound(contact, attack) {
  if (!contact || playerAttackWorldContactResolved) return false;
  const isShieldBash = playerSpecialAttack?.id === 'shield-bash';
  const isChargedSpin = attack?.profile === 'attack6';
  const reboundWeapon = isShieldBash ? 'shield' : equippedWeapon;
  const reboundCount = Math.max(0, Number(canvas.dataset.weaponReboundCount) || 0) + 1;
  canvas.dataset.weaponReboundCount = String(reboundCount);
  canvas.dataset.weaponReboundKind = contact.kind ?? 'unknown';
  canvas.dataset.weaponReboundWeapon = reboundWeapon;
  playerAttackWorldContactResolved = true;
  playerAttackReboundDuration = WEAPON_REBOUND_PROFILE.recoilSeconds;
  playerAttackReboundTimer = playerAttackReboundDuration;
  playerAttackReboundDistanceRemaining = WEAPON_REBOUND_PROFILE.recoilDistance;
  playerAttackReboundDirection.copy(contact.normal ?? contact.direction.clone().negate()).setY(0);
  if (playerAttackReboundDirection.lengthSq() < 0.0001) {
    playerAttackReboundDirection.set(
      -Math.sin(playerRoot.rotation.y),
      0,
      -Math.cos(playerRoot.rotation.y)
    );
  }
  playerAttackReboundDirection.normalize();
  playerAttackReboundSide = contact.swingAngle < 0 ? -1 : 1;
  playerAttackReboundWeapon = reboundWeapon;

  spawnWeaponReboundSparks(contact, reboundWeapon);
  playWeaponReboundSound(reboundWeapon);
  triggerCombatImpact('block', WEAPON_REBOUND_PROFILE.impactScale);
  clearCombatEffectsByKind('attack-3d-trail');
  clearCombatEffectsByKind('attack-charge-ring');
  finishPlayerAttackMotion(attack, isChargedSpin);
  playerAttackTimer = 0;
  playerAttackQueued = false;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerComboTimer = 0;
  playerSpecialAttack = null;
  playerAttackCooldown = Math.max(playerAttackCooldown, WEAPON_REBOUND_PROFILE.recoverySeconds);
  cancelPlayerAttackCharge({ restoreAnimation: false });
  attackButton.classList.remove('is-active');
  playActorAnimation(playerRoot, isShieldBash ? 'holding-left' : 'holding-right', {
    restart: true,
    speed: 1.45,
    fade: 0.025
  });
  return true;
}

function resolvePlayerAttackWorldContact(attack) {
  if (!attack || playerAttackWorldContactResolved || playerAttackHits.size > 0) return false;
  const progress = currentPlayerAttackProgress(attack);
  const hitWindow = attackHitWindowFor(attack);
  if (progress < hitWindow.hitStart || progress > hitWindow.hitEnd) return false;
  const windowProgress = THREE.MathUtils.clamp(
    (progress - hitWindow.hitStart) / Math.max(0.001, hitWindow.hitEnd - hitWindow.hitStart),
    0,
    1
  );
  const angles = createWeaponProbeAngles({
    profile: attack.profile,
    windowProgress,
    raySpreadDegrees: WEAPON_REBOUND_PROFILE.raySpreadDegrees
  });
  const attackRange = attackRangeFor(attack);
  let nearestContact = null;
  angles.forEach((swingAngle) => {
    const facing = playerRoot.rotation.y + swingAngle;
    const direction = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const contact = findWeaponWorldContact(direction, attackRange);
    if (!contact || (nearestContact && nearestContact.distance <= contact.distance)) return;
    nearestContact = { ...contact, swingAngle };
  });
  return nearestContact ? beginPlayerWeaponRebound(nearestContact, attack) : false;
}

function updatePlayerAttackRebound(delta) {
  if (playerAttackReboundTimer <= 0) return false;
  playerAttackReboundTimer = Math.max(0, playerAttackReboundTimer - delta);
  if (playerAttackReboundDistanceRemaining > 0) {
    const recoilSpeed = WEAPON_REBOUND_PROFILE.recoilDistance
      / Math.max(0.001, WEAPON_REBOUND_PROFILE.recoilSeconds);
    const distance = Math.min(playerAttackReboundDistanceRemaining, recoilSpeed * delta);
    const moved = moveCombatRootSwept(
      playerRoot,
      playerAttackReboundDirection.clone().multiplyScalar(distance),
      PLAYER_BODY_RADIUS
    );
    if (moved) playerAttackReboundDistanceRemaining -= distance;
    else playerAttackReboundDistanceRemaining = 0;
  }
  if (playerAttackReboundTimer <= 0) {
    playerAttackReboundDistanceRemaining = 0;
    playActorAnimation(playerRoot, playerShielding ? 'holding-left' : 'idle', { fade: 0.07 });
  }
  return true;
}

function applyPlayerWeaponReboundPose() {
  if (playerAttackReboundTimer <= 0 || playerAttackReboundDuration <= 0) return;
  const mounted = equipmentSockets.get(playerAttackReboundWeapon);
  if (!mounted) return;
  const progress = THREE.MathUtils.clamp(
    1 - playerAttackReboundTimer / playerAttackReboundDuration,
    0,
    1
  );
  const kick = Math.sin(Math.PI * progress);
  mounted.motion.rotation.order = 'YXZ';
  mounted.motion.rotation.x -= kick * 0.34;
  mounted.motion.rotation.z += playerAttackReboundSide * kick * 0.62;
  mounted.motion.position.y += kick * 0.045;
  mounted.motion.position.z -= kick * 0.1;
}

function applyCombatInputTap() {
  if (!gameMode || qaPanelOpen || gameMenuOpen || inventoryOpen || equipmentOpen || rewardOpen || supplyOpen || playerHealth <= 0 || playerAttackTimer > 0
    || playerDodgeTimer > 0 || playerHookTimer > 0 || playerFallTimer > 0
    || playerRecoveryStunTimer > 0 || playerHurtTimer > 0 || playerAttackReboundTimer > 0) return;
  const movement = movementInputVector();
  if (!movement.lengthSq()) return;
  lastMoveDirection.copy(movement);
  const moved = moveCombatRoot(playerRoot, movement.clone().multiplyScalar(CELL * 0.12), PLAYER_BODY_RADIUS);
  if (moved && playerDustTimer <= 0) {
    spawnPlayerDust(movement, 0.9);
    playerDustTimer = 0.13;
  }
  turnPlayerToward(movement, 0, 1);
}

function activatePlayerAttack(attack, step, options = {}) {
  if (combatLabActive) {
    combatLabStats.attacks += 1;
    updateCombatLabMetrics();
  }
  playerSpecialAttack = options.special ? attack : null;
  playerAttackStep = step;
  playerAttackSpeedMultiplier = attackSpeedMultiplierFor(equippedWeapon, attack.profile);
  playerAttackActiveDuration = attack.duration / playerAttackSpeedMultiplier;
  playerAttackTimer = playerAttackActiveDuration;
  playerAttackCooldown = 0.08;
  playerAttackQueued = false;
  playerAttackEffectSpawned = false;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerAttackTotalLunge = attackLungeFor(attack);
  playerAttackLungeRemaining = playerAttackTotalLunge;
  playerChargeReleaseTriggered = false;
  playerChargeEffectSpawned = false;
  playerAttackBaseRotation = playerRoot.rotation.y;
  playerAttackWorldContactResolved = false;
  playerAttackHits.clear();
  const usesInternalCharge = Boolean(attack.chargeAnimation && !options.precharged);
  playActorAnimation(playerRoot, usesInternalCharge ? attack.chargeAnimation : attack.animation, {
    once: !usesInternalCharge,
    restart: true,
    speed: (usesInternalCharge ? 0.82 : attack.animationSpeed) * playerAttackSpeedMultiplier,
    fade: 0.04
  });
  if (usesInternalCharge) {
    playTone(equippedWeapon === 'spear' ? 142 : 118, 0.18, 0.022, 0, 'triangle');
  } else {
    playPlayerAttackSound(step);
  }
  if (options.precharged) {
    playerChargeReleaseTriggered = true;
    playerChargeEffectSpawned = true;
  }
  startBladeTrail(equippedWeapon, step);
  attackButton.classList.add('is-active');
  return true;
}

function beginPlayerAttack(step) {
  const attack = currentAttackSet()[step];
  if (!attack || attack.holdOnly) return false;
  return activatePlayerAttack(attack, step);
}

function beginPlayerChargedWhirl(chargeRatio) {
  const attacks = currentAttackSet();
  const step = attacks.findIndex((attack) => attack.holdOnly && attack.profile === 'attack6');
  if (step < 0 || chargedAttackSettings[equippedWeapon] === false) return false;
  const base = attacks[step];
  const power = THREE.MathUtils.clamp(chargeRatio, 0, 1);
  const attack = {
    ...base,
    id: `${base.id}-charged`,
    chargeAnimation: null,
    chargeEnd: 0,
    spinStart: 0.04,
    duration: THREE.MathUtils.lerp(0.68, 0.78, power),
    hitStart: 0.2,
    hitEnd: 0.78,
    range: base.range * THREE.MathUtils.lerp(0.88, 1.08, power),
    chargePower: power
  };
  playerComboTimer = 0;
  spawnAttackChargeRing(equippedWeapon);
  playTone(equippedWeapon === 'spear' ? 242 : 214, 0.12, 0.028, 0, 'triangle');
  return activatePlayerAttack(attack, step, { special: true, precharged: true });
}

function beginPlayerShieldBash() {
  if (!playerShielding || playerShieldBashCooldown > 0 || playerStamina < SHIELD_BASH_STAMINA_COST || playerAttackTimer > 0) return false;
  playerSpecialAttack = SHIELD_BASH_ATTACK;
  playerAttackStep = 0;
  playerAttackActiveDuration = SHIELD_BASH_ATTACK.duration;
  playerAttackSpeedMultiplier = 1;
  playerAttackTimer = SHIELD_BASH_ATTACK.duration;
  playerAttackCooldown = 0.08;
  playerShieldBashCooldown = SHIELD_BASH_COOLDOWN;
  playerAttackQueued = false;
  playerAttackEffectSpawned = false;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerAttackLungeRemaining = 0;
  playerAttackTotalLunge = 0;
  playerChargeReleaseTriggered = false;
  playerChargeEffectSpawned = false;
  playerAttackWorldContactResolved = false;
  playerComboTimer = 0;
  playerAttackHits.clear();
  playerStamina = Math.max(0, playerStamina - SHIELD_BASH_STAMINA_COST);
  spawnShieldFlash();
  playActorAnimation(playerRoot, SHIELD_BASH_ATTACK.animation, {
    once: true,
    restart: true,
    speed: SHIELD_BASH_ATTACK.animationSpeed,
    fade: 0.035
  });
  playTone(96, 0.08, 0.025, 0, 'square');
  playTone(148, 0.1, 0.018, 0.025, 'triangle');
  attackButton.classList.add('is-active');
  return true;
}

function playerCanAcceptAttackInput() {
  return gameMode && !qaPanelOpen && !gameMenuOpen && !inventoryOpen && !equipmentOpen && !rewardOpen && !supplyOpen
    && playerHealth > 0 && playerDodgeTimer <= 0 && playerHookTimer <= 0
    && playerFallTimer <= 0 && playerRecoveryStunTimer <= 0 && playerHurtTimer <= 0
    && playerAttackReboundTimer <= 0;
}

function startPlayerAttack() {
  if (!playerCanAcceptAttackInput()) return;
  if (playerAttackTransitionTimer > 0 || playerAttackPendingStep >= 0) return;
  if (playerShielding) {
    beginPlayerShieldBash();
    return;
  }
  if (playerAttackTimer > 0) {
    resetPlayerDropIntent();
    if (playerAttackCooldown <= 0) playerAttackQueued = true;
    return;
  }
  if (playerAttackCooldown > 0) return;
  const nearest = combatEnemies
    .filter((enemy) => enemy.active && enemy.alive)
    .map((enemy) => ({ enemy, distance: enemy.root.position.distanceTo(playerRoot.position) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (nearest && nearest.distance < CELL * 2.35) {
    const toEnemy = nearest.enemy.root.position.clone().sub(playerRoot.position).setY(0);
    if (toEnemy.lengthSq() > 0.0001) {
      lastMoveDirection.copy(toEnemy).normalize();
      playerRoot.rotation.y = Math.atan2(toEnemy.x, toEnemy.z);
    }
  }
  const nextStep = playerComboTimer > 0 ? nextEnabledAttackStep(playerAttackStep) : firstEnabledAttackStep();
  playerComboTimer = 0;
  beginPlayerAttack(nextStep);
}

function activePlayerWeaponRoot(weapon = equippedWeapon) {
  return weapon === 'spear' ? playerSpear : playerWeapon;
}

function setPlayerWeaponChargeGlow(ratio = 0, enabled = false, weapon = equippedWeapon) {
  const config = weaponChargeGlowSettings[weapon] ?? WEAPON_CHARGE_GLOW_DEFAULTS[weapon];
  const activeRoot = activePlayerWeaponRoot(weapon);
  const glowEnabled = Boolean(enabled && config?.enabled);
  PLAYER_ATTACK_CHARGE_COLOR_START.set(config?.startColor ?? '#ffd759');
  PLAYER_ATTACK_CHARGE_COLOR_END.set(config?.endColor ?? '#64d9ff');
  [playerWeapon, playerSpear].filter(Boolean).forEach((root) => {
    const active = glowEnabled && root === activeRoot;
    root.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach((material) => {
        if (!material.emissive) return;
        if (!material.userData.playerChargeBaseEmissive) {
          material.userData.playerChargeBaseEmissive = material.emissive.clone();
          material.userData.playerChargeBaseIntensity = material.emissiveIntensity ?? 1;
        }
        if (active) {
          material.emissive.copy(PLAYER_ATTACK_CHARGE_COLOR_START).lerp(PLAYER_ATTACK_CHARGE_COLOR_END, ratio);
          material.emissiveIntensity = material.userData.playerChargeBaseIntensity
            + 0.35 + ratio * config.intensity;
        } else {
          material.emissive.copy(material.userData.playerChargeBaseEmissive);
          material.emissiveIntensity = material.userData.playerChargeBaseIntensity;
        }
      });
    });
    let light = root.userData.playerChargeLight;
    if (active && !light) {
      light = new THREE.PointLight(PLAYER_ATTACK_CHARGE_COLOR_START, 0, CELL * 2.4, 2);
      light.position.set(0, 0.12, 0);
      root.add(light);
      root.userData.playerChargeLight = light;
    }
    if (light) {
      light.color.copy(PLAYER_ATTACK_CHARGE_COLOR_START).lerp(PLAYER_ATTACK_CHARGE_COLOR_END, ratio);
      light.intensity = active ? 0.52 + ratio * config.intensity : 0;
    }
  });
}

function cancelPlayerAttackCharge(options = {}) {
  const wasCharging = playerAttackCharging;
  playerAttackInputHeld = false;
  playerAttackHoldTimer = 0;
  playerAttackCharging = false;
  playerAttackChargeRatio = 0;
  playerAttackChargeFullSignaled = false;
  setPlayerWeaponChargeGlow(0, false);
  attackButton.classList.remove('is-charging');
  if (playerAttackTimer <= 0) attackButton.classList.remove('is-active');
  attackButton.setAttribute('aria-label', equippedWeapon === 'spear' ? 'Speerangriff' : 'Angreifen');
  if (options.restoreAnimation !== false && wasCharging && playerRoot && playerHealth > 0
    && playerAttackTimer <= 0 && playerRoot.userData.currentAnimation === 'holding-both') {
    playActorAnimation(playerRoot, playerShielding ? 'holding-left' : 'idle', { fade: 0.08 });
  }
}

function beginPlayerAttackInput() {
  if (getragenesFass) return wirfFass();
  if (!playerCanAcceptAttackInput()) return false;
  if (playerAttackTransitionTimer > 0 || playerAttackPendingStep >= 0) {
    return true;
  }
  if (playerShielding || playerAttackTimer > 0) {
    startPlayerAttack();
    return true;
  }
  if (playerAttackCooldown > 0 || playerAttackInputHeld) return false;
  playerAttackInputHeld = true;
  playerAttackHoldTimer = 0;
  playerAttackCharging = false;
  playerAttackChargeRatio = 0;
  playerAttackChargeFullSignaled = false;
  attackButton.classList.add('is-active');
  return true;
}

function releasePlayerAttackInput() {
  if (!playerAttackInputHeld) return false;
  const charged = playerAttackCharging;
  const chargeRatio = playerAttackChargeRatio;
  cancelPlayerAttackCharge({ restoreAnimation: false });
  if (charged && beginPlayerChargedWhirl(chargeRatio)) return true;
  startPlayerAttack();
  return true;
}

function updatePlayerAttackCharge(delta) {
  if (!playerAttackInputHeld) return false;
  if (!playerCanAcceptAttackInput() || playerShielding || playerAttackTimer > 0) {
    cancelPlayerAttackCharge();
    return false;
  }
  playerAttackHoldTimer += delta;
  if (playerAttackHoldTimer < PLAYER_ATTACK_HOLD_THRESHOLD) return false;
  if (!playerAttackCharging) {
    playerAttackCharging = true;
    playerComboTimer = 0;
    attackButton.classList.add('is-charging');
    attackButton.setAttribute('aria-label', 'Rundumschlag wird aufgeladen');
    playActorAnimation(playerRoot, 'holding-both', {
      restart: true,
      speed: 0.72 * attackSpeedMultiplierFor(equippedWeapon, 'attack6'),
      fade: 0.08
    });
    spawnAttackChargeRing(equippedWeapon);
    playTone(equippedWeapon === 'spear' ? 138 : 112, 0.18, 0.02, 0, 'triangle');
  }
  playerAttackChargeRatio = THREE.MathUtils.clamp(
    (playerAttackHoldTimer - PLAYER_ATTACK_HOLD_THRESHOLD)
      / (PLAYER_ATTACK_FULL_CHARGE_TIME - PLAYER_ATTACK_HOLD_THRESHOLD),
    0,
    1
  );
  setPlayerWeaponChargeGlow(playerAttackChargeRatio, true);
  if (playerAttackChargeRatio >= 1 && !playerAttackChargeFullSignaled) {
    playerAttackChargeFullSignaled = true;
    spawnAttackChargeRing(equippedWeapon);
    playTone(equippedWeapon === 'spear' ? 330 : 294, 0.2, 0.026, 0, 'sine');
  }
  return true;
}

function startPlayerDodge() {
  const dodgeCost = 0.34 * runProgress.dodgeCostMultiplier;
  if (!gameMode || qaPanelOpen || gameMenuOpen || inventoryOpen || equipmentOpen || rewardOpen || supplyOpen || playerHealth <= 0 || playerDodgeTimer > 0
    || playerAttackTimer > 0 || playerHookTimer > 0 || playerFallTimer > 0
    || playerRecoveryStunTimer > 0 || playerHurtTimer > 0 || playerAttackReboundTimer > 0
    || playerShielding
    || playerStamina < dodgeCost) return;
  cancelPlayerAttackCharge();
  const input = movementInputVector();
  dodgeDirection.copy(input.lengthSq() ? input : lastMoveDirection).normalize();
  lastMoveDirection.copy(dodgeDirection);
  playerDodgeTimer = 0.32;
  playerInvulnerability = Math.max(playerInvulnerability, 0.42);
  playerStamina = Math.max(0, playerStamina - dodgeCost);
  playActorAnimation(playerRoot, 'sprint', { restart: true, speed: 1.4, fade: 0.04 });
  document.getElementById('dodge-button').classList.add('is-active');
}

function triggerCombatImpact(kind = 'normal', scale = 1) {
  const presets = {
    block: { stop: 0.022, slow: 0.07, scale: 0.68, shake: 0.08 },
    normal: { stop: 0.036, slow: 0.11, scale: 0.56, shake: 0.16 },
    player: { stop: 0.042, slow: 0.13, scale: 0.52, shake: 0.2 },
    lethal: { stop: 0.065, slow: 0.18, scale: 0.42, shake: 0.28 }
  };
  const impact = presets[kind] ?? presets.normal;
  const force = THREE.MathUtils.clamp(Number(scale) || 1, 0.55, 1.8);
  const hitStopScale = combatTuningSettings.impact.hitStopScale;
  const slowMotionScale = combatTuningSettings.impact.slowMotionScale;
  const cameraShakeScale = combatTuningSettings.impact.cameraShakeScale;
  combatHitStop = Math.max(combatHitStop, impact.stop * force * hitStopScale);
  combatImpactSlowTimer = Math.max(
    combatImpactSlowTimer,
    impact.slow * Math.sqrt(force) * slowMotionScale
  );
  combatImpactTimeScale = Math.min(
    combatImpactTimeScale,
    THREE.MathUtils.clamp(
      Math.pow(impact.scale, slowMotionScale) / Math.sqrt(force),
      0.3,
      0.88
    )
  );
  cameraShake = Math.max(cameraShake, impact.shake * force * cameraShakeScale);
}

function normalizedDamageDirection(direction) {
  const result = direction?.isVector3 ? direction.clone() : new THREE.Vector3(0, 0, 1);
  result.y = 0;
  if (result.lengthSq() < 0.0001) result.set(0, 0, 1);
  return result.normalize();
}

function applyCombatDamage(target, hit = {}) {
  const amount = Math.max(0, Number(hit.amount) || 0);
  if (amount <= 0 || !target) return false;
  const direction = normalizedDamageDirection(hit.direction);
  const damage = { ...hit, amount, direction };
  if (target.kind === 'player') return damagePlayer(amount, direction, damage);
  if (target.kind === 'enemy') return damageEnemy(target.entity, amount, direction, damage);
  if (target.kind === 'destructible') return damageCombatDestructible(target.entity, amount, direction, damage);
  return false;
}

function damageCombatDestructible(destructible, amount, direction, options = {}) {
  if (destructible.destroyed) return false;
  destructible.health = Math.max(0, destructible.health - amount);
  destructible.hurtTimer = 0.24;
  destructible.hitDirection.copy(direction);
  setRootHitFlash(destructible.root, true);
  const lethal = destructible.health <= 0;
  triggerCombatImpact(lethal ? 'lethal' : 'normal', options.impactScale);
  spawnHitImpact(destructible.root.position, lethal);
  playBarrelImpactSound(lethal);
  if (!lethal) return true;

  destructible.destroyed = true;
  destructible.root.visible = false;
  setRootHitFlash(destructible.root, false);
  spawnBarrelBreakEffect(destructible.root.position, direction);
  spawnBarrelLoot(destructible);
  rebuildCombatNavigation(combatRoomIdForRoot(destructible.root));
  return true;
}

function updateCombatDestructibles(delta) {
  combatDestructibles.forEach((destructible) => {
    if (destructible.destroyed || destructible.hurtTimer <= 0) return;
    destructible.hurtTimer = Math.max(0, destructible.hurtTimer - delta);
    const strength = destructible.hurtTimer / 0.24;
    const wobble = Math.sin((1 - strength) * Math.PI * 5) * strength;
    destructible.frame.rotation.x = destructible.hitDirection.z * wobble * 0.11;
    destructible.frame.rotation.z = -destructible.hitDirection.x * wobble * 0.11;
    destructible.frame.scale.copy(destructible.baseScale).multiplyScalar(1 + strength * 0.045);
    if (destructible.hurtTimer > 0) return;
    destructible.frame.rotation.set(0, 0, 0);
    destructible.frame.scale.copy(destructible.baseScale);
    setRootHitFlash(destructible.root, false);
  });
}

function trapTargetsInRange(trap, settings) {
  const targets = [];
  const acceptsPlayer = settings.targets === 'both' || settings.targets === 'player';
  const acceptsEnemies = settings.targets === 'both' || settings.targets === 'enemies';
  const inRange = (root, radius) => Math.abs(root.position.y - trap.root.position.y) <= CELL * 0.82
    && horizontalDistanceBetween(root, trap.root) <= settings.radius + radius * 0.35;

  if (acceptsPlayer && playerRoot?.visible && playerHealth > 0 && inRange(playerRoot, PLAYER_BODY_RADIUS)) {
    targets.push({ key: playerRoot, root: playerRoot, target: { kind: 'player' } });
  }
  if (acceptsEnemies) {
    combatEnemies.forEach((enemy) => {
      if (!enemy.active || !enemy.alive || !enemy.root.visible || !inRange(enemy.root, enemy.bodyRadius)) return;
      targets.push({ key: enemy.root, root: enemy.root, target: { kind: 'enemy', entity: enemy } });
    });
  }
  return targets;
}

function beginTrapWarning(trap, settings) {
  trap.state = 'warning';
  trap.timer = settings.warning;
  trap.hitTargets.clear();
  trap.telegraph.visible = true;
  trap.telegraph.userData.material.color.set('#ffb13b');
  trap.telegraph.userData.light.color.set('#ffb13b');
  playTone(116, 0.1, 0.018, 0, 'square');
}

function activateCombatTrap(trap, settings) {
  trap.state = 'active';
  trap.timer = settings.active;
  trap.hitTargets.clear();
  trap.telegraph.visible = true;
  trap.telegraph.userData.material.color.set('#ff5138');
  trap.telegraph.userData.material.opacity = 0.86;
  trap.telegraph.userData.light.color.set('#ff5138');
  trap.telegraph.userData.light.intensity = 3.2;
  setRootHitFlash(trap.root, true);
  spawnEnemyProjectileImpact(trap.root.position.clone().add(new THREE.Vector3(0, 0.24, 0)));
  playTone(72, 0.16, 0.055, 0, 'sawtooth');
}

function resolveCombatTrapHits(trap, settings) {
  trapTargetsInRange(trap, settings).forEach((candidate) => {
    if (trap.hitTargets.has(candidate.key)) return;
    const direction = candidate.root.position.clone().sub(trap.root.position);
    const hit = candidate.target.kind === 'player'
      ? {
        amount: settings.damage,
        direction,
        source: 'floor-trap',
        faction: 'environment',
        knockback: TRAP_DEFAULTS.playerKnockback,
        blockable: false
      }
      : {
        amount: settings.damage,
        direction,
        source: 'floor-trap',
        faction: 'environment',
        knockback: TRAP_DEFAULTS.enemyKnockback,
        healPlayerOnKill: false
      };
    if (applyCombatDamage(candidate.target, hit)) trap.hitTargets.add(candidate.key);
  });
}

function updateCombatTrap(trap, delta) {
  if (!trap.root.visible) {
    if (trap.state !== 'idle') restoreCombatTrap(trap);
    return;
  }
  const settings = normalizedTrapSettings(trap.root);
  trap.telegraph.scale.setScalar(settings.radius);

  if (trap.state === 'idle') {
    if (trapTargetsInRange(trap, settings).length) beginTrapWarning(trap, settings);
    return;
  }

  trap.timer = Math.max(0, trap.timer - delta);
  if (trap.state === 'warning') {
    const progress = 1 - trap.timer / settings.warning;
    const pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
    trap.telegraph.userData.material.opacity = 0.2 + progress * 0.38 + pulse * 0.16;
    trap.telegraph.userData.light.intensity = 0.45 + progress * 1.8;
    trap.frame.position.copy(trap.baseFramePosition);
    trap.frame.position.y += Math.sin(progress * Math.PI * 6) * 0.025 * progress;
    if (trap.timer <= 0) activateCombatTrap(trap, settings);
    return;
  }

  if (trap.state === 'active') {
    const progress = 1 - trap.timer / settings.active;
    trap.frame.position.copy(trap.baseFramePosition);
    trap.frame.position.y += Math.sin(progress * Math.PI) * 0.22;
    trap.frame.scale.copy(trap.baseFrameScale).multiplyScalar(1 + Math.sin(progress * Math.PI) * 0.08);
    resolveCombatTrapHits(trap, settings);
    if (trap.timer <= 0) {
      trap.state = 'cooldown';
      trap.timer = settings.cooldown;
      setRootHitFlash(trap.root, false);
    }
    return;
  }

  const cooldownProgress = 1 - trap.timer / settings.cooldown;
  trap.frame.position.lerp(trap.baseFramePosition, Math.min(1, delta * 14));
  trap.frame.scale.lerp(trap.baseFrameScale, Math.min(1, delta * 14));
  trap.telegraph.userData.material.opacity = Math.max(0, 0.24 * (1 - cooldownProgress));
  trap.telegraph.userData.light.intensity = Math.max(0, 0.5 * (1 - cooldownProgress));
  if (trap.timer <= 0) restoreCombatTrap(trap);
}

function updateCombatTraps(delta) {
  combatTraps.forEach((trap) => updateCombatTrap(trap, delta));
}

function setEnemyWeaponGlow(enemy, intensity) {
  if (!enemy.weapon) return;
  enemy.weapon.root.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (!material.emissive) return;
      if (!material.userData.enemyBaseEmissive) {
        material.userData.enemyBaseEmissive = material.emissive.clone();
        material.userData.enemyBaseIntensity = material.emissiveIntensity ?? 1;
      }
      if (intensity > 0.001) {
        material.emissive.set('#ff7138');
        material.emissiveIntensity = material.userData.enemyBaseIntensity + intensity;
      } else {
        material.emissive.copy(material.userData.enemyBaseEmissive);
        material.emissiveIntensity = material.userData.enemyBaseIntensity;
      }
    });
  });
}

function resetEnemyAttack(enemy) {
  enemy.attackTimer = 0;
  enemy.attackState = 'idle';
  enemy.attackConnected = false;
  if (enemy.telegraph) {
    enemy.telegraph.visible = false;
    enemy.telegraph.scale.setScalar(1);
    enemy.telegraph.userData.material.opacity = 0;
    enemy.telegraph.userData.light.intensity = 0;
  }
  if (enemy.weapon) enemy.weapon.root.visible = true;
  setEnemyWeaponGlow(enemy, 0);
}

function enemyAttackTimings(enemy) {
  if (enemy.attackType === 'ranged') {
    return {
      total: ENEMY_RANGED_ATTACK_TOTAL,
      strikeAt: ENEMY_RANGED_ATTACK_STRIKE_AT,
      recoveryAt: ENEMY_RANGED_ATTACK_RECOVERY_AT
    };
  }
  const tuning = combatTuningSettings.meleeEnemy;
  return {
    total: tuning.windup + tuning.active + tuning.recovery,
    strikeAt: tuning.active + tuning.recovery,
    recoveryAt: tuning.recovery,
    hitStart: tuning.recovery + tuning.active * 0.6,
    hitEnd: tuning.recovery + tuning.active * 0.15,
    cooldown: tuning.cooldown
  };
}

function enemyMeleeTriggerRange() {
  return ENEMY_ATTACK_TRIGGER_RANGE * combatTuningSettings.meleeEnemy.triggerRangeScale;
}

function enemyMeleeHitRange() {
  return ENEMY_ATTACK_HIT_RANGE * combatTuningSettings.meleeEnemy.hitRangeScale;
}

function updateEnemyAttackTelegraph(enemy) {
  if (!enemy.telegraph || enemy.attackTimer <= 0) return;
  const timings = enemyAttackTimings(enemy);
  const material = enemy.telegraph.userData.material;
  const light = enemy.telegraph.userData.light;
  if (enemy.attackState === 'windup') {
    const progress = THREE.MathUtils.clamp(
      (timings.total - enemy.attackTimer) / (timings.total - timings.strikeAt),
      0,
      1
    );
    const pulse = Math.sin(progress * Math.PI * 5) * 0.045;
    enemy.telegraph.scale.setScalar(0.82 + progress * 0.3 + pulse);
    material.opacity = 0.2 + progress * 0.68;
    light.intensity = 0.4 + progress * 2.5;
    setEnemyWeaponGlow(enemy, 0.18 + progress * 1.45);
  } else if (enemy.attackState === 'strike') {
    const strength = THREE.MathUtils.clamp(
      (enemy.attackTimer - timings.recoveryAt)
        / (timings.strikeAt - timings.recoveryAt),
      0,
      1
    );
    enemy.telegraph.scale.setScalar(1.12 + (1 - strength) * 0.16);
    material.opacity = strength * 0.72;
    light.intensity = strength * 2.2;
    setEnemyWeaponGlow(enemy, strength * 1.15);
  }
}

function spawnEnemyAttackArc(enemy) {
  const root = new THREE.Group();
  root.position.copy(enemy.root.position);
  root.position.y += 0.16;
  root.rotation.y = enemy.root.rotation.y;
  const material = new THREE.MeshBasicMaterial({
    color: '#ff8a32',
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.76, 24, 1, -Math.PI * 0.72, Math.PI * 1.44),
    material
  );
  arc.rotation.x = -Math.PI * 0.5;
  root.add(arc);
  registerCombatEffect(root, 0.24, {
    kind: 'enemy-attack-arc',
    scaleFrom: 0.68,
    scaleTo: 1.24,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.6)
  });
}

function spawnEnemyProjectileImpact(position) {
  const root = new THREE.Group();
  root.position.copy(position);
  const material = new THREE.MeshBasicMaterial({
    color: '#fff4d2',
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const star = new THREE.Mesh(createStarGeometry(0.26, 0.065, 0.055), material);
  star.rotation.set(-0.5, 0.35, 0.2);
  root.add(star);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.035, 5, 16),
    new THREE.MeshBasicMaterial({
      color: '#ff8a32', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false
    })
  );
  ring.rotation.x = Math.PI * 0.5;
  root.add(ring);
  registerCombatEffect(root, 0.24, {
    kind: 'enemy-spear-impact',
    rootSpin: new THREE.Vector3(1.4, 2.8, 4.5),
    scaleFrom: 0.55,
    scaleTo: 1.42,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.45)
  });
}

function spawnEnemySpearProjectile(enemy, direction, options = {}) {
  const model = SkeletonUtils.clone(assets.get('weapon-spear').scene);
  prepareModel(model);
  const root = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(model);
  frame.scale.setScalar(modelScale * (options.scale ?? 0.72));
  root.add(frame);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  frame.position.set(-center.x, -center.y, -center.z);
  frame.rotation.x = Math.PI * 0.5;
  if (enemy.weapon && !options.fromRoot) enemy.weapon.socket.getWorldPosition(root.position);
  else root.position.copy(enemy.root.position).setY(enemy.root.position.y + (options.originHeight ?? 0.78));
  root.rotation.y = Math.atan2(direction.x, direction.z);

  const velocity = direction.clone().setY(0).normalize().multiplyScalar(options.speed ?? ENEMY_SPEAR_SPEED);
  const launchSurfaceY = enemy.root.position.y;
  const verticalHitTolerance = Math.max(0.56, (options.originHeight ?? 0.78) * 0.72);
  registerCombatEffect(root, options.life ?? 1.25, {
    kind: 'enemy-spear-projectile',
    rootVelocity: velocity,
    rootSpin: new THREE.Vector3(0, 0, 7.5),
    rootDrag: 0,
    disposeGeometry: false,
    scaleFrom: 1,
    scaleTo: 1,
    opacityCurve: (progress) => progress < 0.88 ? 1 : (1 - progress) / 0.12,
    onUpdate: (_effect, projectileRoot) => {
      const playerTarget = playerRoot.position.clone().add(new THREE.Vector3(0, 0.62, 0));
      const toPlayer = playerTarget.sub(projectileRoot.position);
      const groundDistance = Math.hypot(toPlayer.x, toPlayer.z);
      const verticalDistance = Math.abs(toPlayer.y);
      if (playerHealth > 0
        && groundDistance <= PLAYER_BODY_RADIUS + 0.16
        && verticalDistance <= verticalHitTolerance
        && Math.abs(playerRoot.position.y - launchSurfaceY) <= COMBAT_HEIGHT_TOLERANCE) {
        applyCombatDamage({ kind: 'player' }, {
          amount: options.damage ?? 1,
          direction,
          source: options.source ?? 'enemy-projectile',
          faction: 'enemy',
          knockback: options.knockback ?? 1.1,
          blockable: options.blockable ?? true
        });
        spawnEnemyProjectileImpact(projectileRoot.position);
        return false;
      }
      if (isCombatPositionBlocked(projectileRoot.position, 0.08, null)) {
        spawnEnemyProjectileImpact(projectileRoot.position);
        return false;
      }
      return true;
    }
  });
}

function damageEnemy(enemy, amount, direction, options = {}) {
  if (!enemy?.active || !enemy.alive) return false;
  const combatLabTarget = combatLabActive && enemy === combatLabEnemy;
  if (combatLabTarget) {
    combatLabStats.hits += 1;
    updateCombatLabMetrics();
  }
  if (!enemy.isBoss) resetEnemyAttack(enemy);
  enemy.health = Math.max(0, enemy.health - amount);
  enemy.hurtTimer = enemy.isBoss ? 0.1 : 0.24;
  const knockback = Number.isFinite(options.knockback)
    ? options.knockback
    : equippedWeapon === 'spear' ? 9.4 : 7.2;
  enemy.knockback.copy(direction).multiplyScalar(knockback * (enemy.isBoss ? 0.16 : 1));
  setRootHitFlash(enemy.root, true);
  const lethal = enemy.health <= 0;
  if (enemy.isBoss && !lethal) setBossPhase(enemy, bossPhaseFor(enemy), true);
  triggerCombatImpact(lethal ? 'lethal' : 'normal', options.impactScale);
  spawnHitImpact(enemy.root.position, lethal);
  if (enemy.health > 0) {
    playActorAnimation(enemy.root, 'emote-no', { once: true, restart: true, speed: 1.8, fade: 0.03 });
  } else {
    enemy.alive = false;
    enemy.attackTimer = 0;
    if (enemy.isBoss) {
      resetBossAction(enemy);
      if (enemy.bossAura) enemy.bossAura.visible = false;
      showCombatMessage('DER BRUCHHAUPTMANN FAELLT', 1.65);
    }
    if (options.healPlayerOnKill !== false) {
      playerHealth = Math.min(playerMaxHealth(), playerHealth + 1);
      playerInvulnerability = Math.max(playerInvulnerability, 0.34);
    }
    playActorAnimation(enemy.root, 'die', { once: true, restart: true, speed: 1.15, fade: 0.05 });
    if (combatLabTarget) {
      combatLabRespawnTimer = 1.15;
      showCombatMessage('TREFFERBILD GESPEICHERT', 0.8);
    } else {
      spawnEnemyLoot(enemy);
      checkCurrentWaveCompletion();
    }
  }
  updateWaveHud();
  updateCombatHud();
  return true;
}

function interruptPlayerActionsForHit() {
  cancelPlayerAttackCharge({ restoreAnimation: false });
  setPlayerShielding(false);
  cancelPlayerHook();
  playerAttackTimer = 0;
  playerAttackActiveDuration = 0;
  playerAttackSpeedMultiplier = 1;
  playerAttackCooldown = Math.max(playerAttackCooldown, 0.12);
  playerAttackQueued = false;
  playerAttackTransitionTimer = 0;
  playerAttackPendingStep = -1;
  playerAttackLungeRemaining = 0;
  playerAttackTotalLunge = 0;
  playerSpecialAttack = null;
  playerComboTimer = 0;
  playerDodgeTimer = 0;
  playerAttackHits.clear();
  setPlayerWeaponChargeGlow(0, false);
  attackButton.classList.remove('is-active');
  document.getElementById('dodge-button').classList.remove('is-active');
}

function beginPlayerHitReaction(direction, knockback, duration = null) {
  const strength = Math.max(0, Number(knockback) || 0);
  const reactionDuration = Number.isFinite(duration)
    ? duration
    : THREE.MathUtils.clamp(0.2 + strength * 0.045, 0.23, 0.35);
  playerHurtTimer = Math.max(playerHurtTimer, reactionDuration);

  const impulseDirection = direction.clone().setY(0);
  if (strength <= 0 || impulseDirection.lengthSq() <= 0.0001) {
    playerKnockback.set(0, 0, 0);
    return;
  }
  playerKnockback.copy(impulseDirection.normalize())
    .multiplyScalar(strength * PLAYER_KNOCKBACK_IMPULSE_SCALE);
}

function updatePlayerHitReaction(delta) {
  const stopSpeedSq = PLAYER_KNOCKBACK_STOP_SPEED * PLAYER_KNOCKBACK_STOP_SPEED;
  if (playerKnockback.lengthSq() > stopSpeedSq) {
    const movement = playerKnockback.clone().multiplyScalar(delta);
    const moved = moveCombatRootSwept(playerRoot, movement, PLAYER_BODY_RADIUS);
    playerKnockback.multiplyScalar(Math.exp(-delta * PLAYER_KNOCKBACK_DAMPING));
    if (!moved) playerKnockback.multiplyScalar(0.18);
  } else {
    playerKnockback.set(0, 0, 0);
  }

  playerHurtTimer = Math.max(0, playerHurtTimer - delta);
  if (playerFallTimer > 0) return true;
  if (playerHurtTimer <= 0) return false;
  resetPlayerDropIntent();
  playerDustTimer = 0;
  updatePlayerWeapon();
  return true;
}

function damagePlayer(amount, direction, options = {}) {
  if (playerHealth <= 0 || playerInvulnerability > 0) return false;
  if (qaInvulnerable) return false;
  if (combatLabActive) {
    combatLabStats.received += 1;
    updateCombatLabMetrics();
  }
  if (playerShielding && options.blockable !== false) {
    const forward = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
    const toAttacker = direction.clone().negate().normalize();
    if (forward.dot(toAttacker) > 0.08) {
      const reaction = resolvePlayerHitReaction({
        source: options.source,
        amount,
        knockback: 0.35,
        blocked: true
      });
      playerStamina = Math.max(0, playerStamina - 0.28);
      playerInvulnerability = 0.24;
      beginPlayerHitReaction(
        direction,
        0.35 * reaction.impulseMultiplier,
        reaction.hurtSeconds
      );
      triggerCombatImpact('block', reaction.impactMultiplier);
      spawnShieldFlash();
      showCombatMessage('Geblockt', 0.42);
      if (playerStamina <= 0.02) setPlayerShielding(false);
      updateCombatHud();
      return true;
    }
  }
  interruptPlayerActionsForHit();
  playerHealth = Math.max(combatLabActive ? 1 : 0, playerHealth - amount);
  playerFaceHitTimer = PLAYER_FACE_HIT_DURATION;
  playerInvulnerability = Number.isFinite(options.invulnerability) ? options.invulnerability : 0.82;
  const knockback = Number.isFinite(options.knockback) ? options.knockback : 1.25;
  const reaction = resolvePlayerHitReaction({
    source: options.source,
    amount,
    knockback,
    profile: options.reactionProfile
  });
  const lethal = playerHealth <= 0;
  triggerCombatImpact(
    lethal ? 'lethal' : 'player',
    (Number(options.impactScale) || 1) * reaction.impactMultiplier
  );
  spawnHitImpact(playerRoot.position, lethal);
  setRootHitFlash(playerRoot, true);
  if (!lethal) {
    beginPlayerHitReaction(
      direction,
      knockback * reaction.impulseMultiplier,
      reaction.hurtSeconds
    );
    if (reaction.animation) {
      playActorAnimation(playerRoot, reaction.animation, {
        once: true,
        restart: true,
        speed: reaction.animationSpeed,
        fade: 0.03
      });
    }
  } else {
    playerHurtTimer = 0;
    playerKnockback.set(0, 0, 0);
    playActorAnimation(playerRoot, 'die', { once: true, restart: true, speed: 1.1, fade: 0.05 });
    waveDirector.state = WAVE_STATES.DEAD;
    setArenaGate(false);
    updateWaveHud();
    showCombatMessage('Ra ist gefallen', 1.35);
    beginGameOver();
  }
  updateCombatHud();
  return true;
}

function resolvePlayerAttackHits() {
  const attack = currentPlayerAttack();
  const isShieldBash = playerSpecialAttack?.id === 'shield-bash';
  const progress = currentPlayerAttackProgress(attack);
  const hitWindow = attackHitWindowFor(attack);
  if (progress < hitWindow.hitStart || progress > hitWindow.hitEnd) return false;
  const attackRange = attackRangeFor(attack);
  const impactScale = playerAttackImpactScale(attack, { isShieldBash });
  const forward = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
  let resolvedHit = false;
  combatEnemies.forEach((enemy) => {
    if (!enemy.active || !enemy.alive || playerAttackHits.has(enemy)) return;
    if (!actorsShareCombatHeight(playerRoot, enemy.root)) return;
    const toEnemy = enemy.root.position.clone().sub(playerRoot.position);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    const contactDistance = Math.max(0, distance - enemy.bodyRadius);
    if (contactDistance > attackRange || distance < 0.001) return;
    const direction = toEnemy.normalize();
    if (forward.dot(direction) < attack.cone) return;
    if (contactDistance > WEAPON_REBOUND_PROFILE.probeStart
      && findWeaponWorldContact(direction, contactDistance)) return;
    playerAttackHits.add(enemy);
    applyCombatDamage({ kind: 'enemy', entity: enemy }, {
      amount: playerAttackDamage(attack, { targetKind: 'enemy', isShieldBash }),
      direction,
      source: isShieldBash ? 'player-shield-bash' : 'player-attack',
      faction: 'player',
      knockback: playerAttackKnockback(attack, { isShieldBash }) * impactScale,
      impactScale,
      healPlayerOnKill: true
    });
    resolvedHit = true;
  });
  combatDestructibles.forEach((destructible) => {
    if (destructible.destroyed || playerAttackHits.has(destructible)) return;
    if (!actorsShareCombatHeight(playerRoot, destructible.root)) return;
    const toBarrel = destructible.root.position.clone().sub(playerRoot.position);
    toBarrel.y = 0;
    const distance = toBarrel.length();
    const contactDistance = Math.max(0, distance - BARREL_BODY_RADIUS);
    if (contactDistance > attackRange || distance < 0.001) return;
    const direction = toBarrel.normalize();
    if (forward.dot(direction) < attack.cone) return;
    if (contactDistance > WEAPON_REBOUND_PROFILE.probeStart
      && findWeaponWorldContact(direction, contactDistance, {
        ignoreRoot: destructible.root
      })) return;
    playerAttackHits.add(destructible);
    applyCombatDamage({ kind: 'destructible', entity: destructible }, {
      amount: playerAttackDamage(attack, { targetKind: 'destructible', isShieldBash }),
      direction,
      source: isShieldBash ? 'player-shield-bash' : 'player-attack',
      faction: 'player',
      impactScale
    });
    resolvedHit = true;
  });
  return resolvedHit;
}

function updatePlayerWeapon() {
  if (!playerRoot || !playerWeapon || !playerSpear || !playerShield) return;
  applyEquipmentSocketTransform('sword');
  applyEquipmentSocketTransform('spear');
  applyEquipmentSocketTransform('shield');
  const sickleMotion = playerSickleMotionState();
  if (sickleMotion?.flach) {
    const mounted = equipmentSockets.get(sickleMotion.weapon);
    const swing = sickleSweepProgress(sickleMotion.progress, sickleMotion.reverse);
    const direction = sickleMotion.direction;
    if (mounted) {
      mounted.motion.rotation.order = 'YXZ';
      mounted.motion.rotation.y = direction * THREE.MathUtils.lerp(-0.08, 0.08, swing);
      mounted.motion.rotation.z = -direction * Math.PI * 0.5;
    }
  }
  applyPlayerWeaponReboundPose();

  const actorPresent = gameMode && (playerHealth > 0 || gameOverOpen);
  const visibleActor = actorPresent && playerBlinkVisible;
  const previewWeapon = selectedEquipmentPart === 'spear'
    ? 'spear'
    : selectedEquipmentPart === 'sword' ? 'sword' : equippedWeapon;
  const visibleWeapon = equipmentOpen ? previewWeapon : equippedWeapon;
  playerRoot.visible = visibleActor;
  playerWeapon.visible = visibleActor && visibleWeapon === 'sword';
  playerSpear.visible = visibleActor && visibleWeapon === 'spear';
  playerShield.visible = visibleActor;
}

function schedulePlayerComboTransition(nextStep) {
  const delay = comboPauseAfterStep(playerAttackStep);
  playerSpecialAttack = null;
  playerAttackQueued = false;
  setPlayerWeaponChargeGlow(0, false);
  if (delay <= 0.001) {
    beginPlayerAttack(nextStep);
    return;
  }
  playerAttackPendingStep = nextStep;
  playerAttackTransitionTimer = delay;
  playActorAnimation(playerRoot, 'holding-right', { restart: true, fade: 0.065, speed: 0.82 });
}

function finishPlayerAttackMotion(attack, isChargedSpin) {
  stopBladeTrail();
  setPlayerWeaponChargeGlow(0, false);
  playerAttackActiveDuration = 0;
  playerAttackSpeedMultiplier = 1;
  playerAttackLungeRemaining = 0;
  playerAttackTotalLunge = 0;
  if (isChargedSpin) {
    playerRoot.rotation.y = Math.atan2(
      Math.sin(playerAttackBaseRotation),
      Math.cos(playerAttackBaseRotation)
    );
  }
}

function updatePlayerCombat(delta) {
  playerAttackCooldown = Math.max(0, playerAttackCooldown - delta);
  playerShieldBashCooldown = Math.max(0, playerShieldBashCooldown - delta);
  if (playerAttackTimer <= 0 && playerAttackTransitionTimer <= 0) {
    playerComboTimer = Math.max(0, playerComboTimer - delta);
  }
  playerInvulnerability = Math.max(0, playerInvulnerability - delta);
  if (playerInvulnerability <= 0) setRootHitFlash(playerRoot, false);
  if (!playerShielding) {
    playerStamina = Math.min(1, playerStamina + delta * 0.24 * runProgress.staminaRegenMultiplier);
  }
  if (playerAttackInputHeld && !playerCanAcceptAttackInput()) cancelPlayerAttackCharge();

  if (playerHealth <= 0) {
    setPlayerShielding(false);
    cancelPlayerHook();
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerFall(delta)) {
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerLandingFeedback(delta)) {
    resetPlayerDropIntent();
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerVoidRecovery(delta)) {
    resetPlayerDropIntent();
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerHitReaction(delta)) {
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerAttackRebound(delta)) {
    resetPlayerDropIntent();
    playerDustTimer = 0;
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerHook(delta)) {
    updatePlayerWeapon();
    return;
  }

  if (updatePlayerAttackCharge(delta)) {
    resetPlayerDropIntent();
    playerDustTimer = 0;
    updatePlayerWeapon();
    return;
  }

  if (playerAttackTransitionTimer > 0) {
    playerAttackTransitionTimer = Math.max(0, playerAttackTransitionTimer - delta);
    if (playerAttackTransitionTimer <= 0 && playerAttackPendingStep >= 0) {
      const nextStep = playerAttackPendingStep;
      playerAttackPendingStep = -1;
      beginPlayerAttack(nextStep);
    }
    updatePlayerWeapon();
    return;
  }

  if (playerAttackTimer > 0) {
    playerAttackTimer = Math.max(0, playerAttackTimer - delta);
    const attack = currentPlayerAttack();
    const isShieldBash = playerSpecialAttack?.id === 'shield-bash';
    const isChargedSpin = attack.profile === 'attack6';
    const spinStart = attack.chargeAnimation ? attack.chargeEnd : (attack.spinStart ?? 0.04);
    const progress = currentPlayerAttackProgress(attack);
    const hitWindow = attackHitWindowFor(attack);
    if (attack.chargeAnimation && !playerChargeEffectSpawned && progress >= 0.08) {
      playerChargeEffectSpawned = true;
      spawnAttackChargeRing(equippedWeapon);
    }
    if (attack.chargeAnimation && !playerChargeReleaseTriggered && progress >= spinStart) {
      playerChargeReleaseTriggered = true;
      playActorAnimation(playerRoot, attack.animation, {
        once: true,
        restart: true,
        speed: attack.animationSpeed * playerAttackSpeedMultiplier,
        fade: 0.025
      });
      playPlayerAttackSound(playerAttackStep);
    }
    if (isChargedSpin && progress >= spinStart) {
      const releaseProgress = THREE.MathUtils.clamp(
        (progress - spinStart) / Math.max(0.001, hitWindow.hitEnd - spinStart),
        0,
        1
      );
      const easedSpin = 1 - (1 - releaseProgress) ** 3;
      playerRoot.rotation.y = playerAttackBaseRotation + easedSpin * Math.PI * 2;
    }
    if (attack.horizontalSweep) {
      const glowStrength = Math.sin(Math.PI * progress) * (attack.reverseSweep ? 0.96 : 0.72);
      setPlayerWeaponChargeGlow(glowStrength, glowStrength > 0.03);
    } else if (!isChargedSpin && !attack.chargeAnimation) {
      setPlayerWeaponChargeGlow(0, false);
    }
    if (!playerAttackEffectSpawned && progress >= Math.max(0, hitWindow.hitStart - 0.06)) {
      playerAttackEffectSpawned = true;
      if (isShieldBash) spawnShieldFlash();
      else spawnAttackArc(playerAttackStep);
    }
    const resolvedAttackHit = resolvePlayerAttackHits();
    if (!resolvedAttackHit && resolvePlayerAttackWorldContact(attack)) {
      updatePlayerWeapon();
      return;
    }
    if (!isShieldBash && playerAttackLungeRemaining > 0) {
      const lungeStart = attack.lungeStart ?? 0.24;
      const lungeEnd = attack.lungeEnd ?? 0.68;
      if (progress > lungeStart && progress < lungeEnd) {
        const lungeDuration = Math.max(0.08, playerAttackActiveDuration * (lungeEnd - lungeStart));
        const lungeSpeed = playerAttackTotalLunge / lungeDuration * 1.12;
        const lunge = Math.min(playerAttackLungeRemaining, delta * lungeSpeed);
        const forward = new THREE.Vector3(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
        moveCombatRoot(playerRoot, forward.multiplyScalar(lunge), PLAYER_BODY_RADIUS);
        playerAttackLungeRemaining -= lunge;
      }
    }
    const chainAt = THREE.MathUtils.clamp(attack.chainAt ?? 1, hitWindow.hitEnd, 1);
    if (!isShieldBash && playerAttackQueued && progress >= chainAt) {
      playerAttackTimer = 0;
      finishPlayerAttackMotion(attack, isChargedSpin);
      schedulePlayerComboTransition(nextEnabledAttackStep(playerAttackStep));
      updatePlayerWeapon();
      return;
    }
    if (playerAttackTimer <= 0) {
      finishPlayerAttackMotion(attack, isChargedSpin);
      if (isShieldBash) {
        playerSpecialAttack = null;
        playerComboTimer = 0;
        attackButton.classList.remove('is-active');
        playActorAnimation(playerRoot, playerShielding ? 'holding-left' : 'idle', { fade: 0.06 });
      } else if (playerAttackQueued) {
        schedulePlayerComboTransition(nextEnabledAttackStep(playerAttackStep));
      } else {
        playerSpecialAttack = null;
        playerComboTimer = 0.52;
        attackButton.classList.remove('is-active');
        playActorAnimation(playerRoot, 'idle', { fade: 0.06 });
      }
    }
  }

  if (playerDodgeTimer > 0) {
    resetPlayerDropIntent();
    playerDodgeTimer = Math.max(0, playerDodgeTimer - delta);
    const moved = moveCombatRoot(playerRoot, dodgeDirection.clone().multiplyScalar(delta * 11.5), PLAYER_BODY_RADIUS);
    if (moved) updatePlayerDustTrail(delta, dodgeDirection, 1.65);
    playerRoot.rotation.y = playerFacingFromDirection(dodgeDirection);
    if (playerDodgeTimer <= 0) {
      document.getElementById('dodge-button').classList.remove('is-active');
      playActorAnimation(playerRoot, 'idle', { fade: 0.06 });
    }
    updatePlayerWeapon();
    return;
  }

  const movement = movementInputVector();
  if (movement.lengthSq() && playerAttackTimer <= 0) {
    const movementStrength = THREE.MathUtils.clamp(movement.length(), 0, 1);
    lastMoveDirection.copy(movement);
    const moved = moveCombatRoot(
      playerRoot,
      movement.clone().multiplyScalar(delta * (playerShielding ? 3.15 : 5.4)),
      PLAYER_BODY_RADIUS,
      { dropIntentDelta: delta }
    );
    if (moved && movementStrength > 0.16) {
      updatePlayerDustTrail(delta, movement, (playerShielding ? 0.5 : 0.68) + movementStrength * 0.34);
    }
    else playerDustTimer = 0;
    turnPlayerToward(movement, delta);
    playActorAnimation(playerRoot, 'walk', {
      speed: THREE.MathUtils.lerp(0.72, 1.28, movementStrength),
      fade: 0.08
    });
  } else if (playerAttackTimer <= 0) {
    resetPlayerDropIntent();
    playerDustTimer = 0;
    playActorAnimation(playerRoot, playerShielding ? 'holding-left' : 'idle', { fade: 0.1 });
  }
  updatePlayerWeapon();
}

function updateCombatFormation(delta) {
  const meleeEnemies = combatEnemies.filter((enemy) => enemy.active
    && enemy.alive && enemy.attackType !== 'ranged' && !enemy.isBoss);
  if (meleeEnemies.length === 0) {
    combatFormation.meleeLead = null;
    return;
  }

  const attackingMelee = meleeEnemies.find((enemy) => enemy.attackTimer > 0);
  const currentLeadValid = meleeEnemies.includes(combatFormation.meleeLead);
  let nextLead = attackingMelee ?? (currentLeadValid ? combatFormation.meleeLead : null);
  const leadNeedsRelief = !attackingMelee && (!nextLead
    || nextLead.attackCooldown > 0.12
    || nextLead.hurtTimer > 0);

  if (leadNeedsRelief) {
    const readyEnemies = meleeEnemies
      .filter((enemy) => enemy.attackCooldown <= 0.12 && enemy.hurtTimer <= 0)
      .sort((a, b) => a.root.position.distanceToSquared(playerRoot.position)
        - b.root.position.distanceToSquared(playerRoot.position));
    const alternatingEnemies = readyEnemies
      .filter((enemy) => enemy !== combatFormation.previousMeleeLead);
    const replacement = alternatingEnemies[0] ?? readyEnemies[0]
      ?? meleeEnemies.slice().sort((a, b) => a.attackCooldown - b.attackCooldown)[0];
    if (replacement && replacement !== nextLead) {
      combatFormation.previousMeleeLead = nextLead;
      nextLead = replacement;
    }
  }

  combatFormation.meleeLead = nextLead;
  meleeEnemies.forEach((enemy) => {
    enemy.formationRole = enemy === nextLead ? 'lead' : 'support';
    if (enemy.formationRole === 'support' && enemy.attackTimer <= 0) {
      enemy.orbitAngle += delta * ENEMY_MELEE_ORBIT_SPEED * enemy.orbitDirection;
    }
  });
}

function meleeSupportTarget(enemy) {
  const radiusVariation = ((enemy.root.id % 3) - 1) * 0.12;
  const radius = ENEMY_MELEE_SUPPORT_RADIUS + radiusVariation;
  return playerRoot.position.clone().add(new THREE.Vector3(
    Math.sin(enemy.orbitAngle) * radius,
    0,
    Math.cos(enemy.orbitAngle) * radius
  ));
}

function hasClearEnemyThrowLane(enemy, direction, distance) {
  const laneRadius = 0.13;
  const laneLength = Math.max(0, distance - PLAYER_BODY_RADIUS - laneRadius - BODY_CONTACT_GAP);
  const sampleStep = 0.38;
  for (let travel = sampleStep; travel < laneLength; travel += sampleStep) {
    const sample = enemy.root.position.clone().addScaledVector(direction, travel);
    if (isCombatPositionBlocked(sample, laneRadius, enemy.root)) return false;
  }
  return true;
}

function bossSeekThrowLane(enemy, direction, delta) {
  const side = new THREE.Vector3(-direction.z, 0, direction.x)
    .multiplyScalar(enemy.orbitDirection * delta * CELL * 1.55);
  let moved = moveCombatRoot(enemy.root, side, enemy.bodyRadius);
  if (!moved) {
    enemy.orbitDirection *= -1;
    side.multiplyScalar(-1);
    moved = moveCombatRoot(enemy.root, side, enemy.bodyRadius);
  }
  if (!moved) {
    const retreat = direction.clone().negate().multiplyScalar(delta * CELL * 0.82);
    moved = moveCombatRoot(enemy.root, retreat, enemy.bodyRadius);
  }
  playActorAnimation(enemy.root, moved ? 'walk' : 'holding-right-shoot', {
    restart: false,
    speed: moved ? 0.82 : 0.68,
    fade: 0.08
  });
  return moved;
}

function bossPhaseFor(enemy) {
  const ratio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 0;
  if (ratio > 2 / 3) return 1;
  if (ratio > 1 / 3) return 2;
  return 3;
}

function setBossPhasePresentation(enemy) {
  if (!enemy.bossAura) return;
  const color = BOSS_PHASE_COLORS[enemy.bossPhase - 1];
  enemy.bossAura.userData.material.color.set(color);
  enemy.bossAura.userData.light.color.set(color);
}

function resetBossAction(enemy) {
  resetEnemyAttack(enemy);
  enemy.bossAction = 'idle';
  enemy.bossActionTimer = 0;
  enemy.bossActionDuration = 0;
  enemy.bossSpearShots = 0;
  enemy.bossSpearTimer = 0;
  enemy.bossTrailTimer = 0;
}

function setBossAction(enemy, action, duration) {
  enemy.bossAction = action;
  enemy.bossActionTimer = duration;
  enemy.bossActionDuration = duration;
  enemy.attackTimer = duration;
  enemy.attackState = action;
  enemy.attackConnected = false;
  updateCombatHud();
}

function finishBossAction(enemy, cooldown = 0.9) {
  resetBossAction(enemy);
  enemy.bossCooldown = cooldown;
  playActorAnimation(enemy.root, 'idle', { fade: 0.08 });
  updateCombatHud();
}

function spawnBossPhaseBurst(enemy) {
  const color = BOSS_PHASE_COLORS[enemy.bossPhase - 1];
  const root = new THREE.Group();
  root.position.copy(enemy.root.position);
  root.position.y += 0.08;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 48), material);
  ring.rotation.x = -Math.PI * 0.5;
  root.add(ring);
  const light = new THREE.PointLight(color, 4.4, CELL * 5, 2);
  light.position.y = 0.85;
  root.add(light);
  registerCombatEffect(root, 0.62, {
    kind: 'boss-phase-burst',
    light,
    lightBaseIntensity: 4.4,
    scaleFrom: 0.55,
    scaleTo: CELL * 1.85,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.35)
  });
}

function setBossPhase(enemy, phase, announce = false, force = false) {
  if (!force && enemy.bossPhase === phase) return false;
  enemy.bossPhase = phase;
  enemy.bossActionCycle = 0;
  setBossPhasePresentation(enemy);
  updateCombatHud();
  if (!announce) return true;
  resetBossAction(enemy);
  enemy.bossCooldown = 0.72;
  spawnBossPhaseBurst(enemy);
  const message = phase === 2 ? 'PHASE 2: BEBEN UND STURM' : 'PHASE 3: SPEERSALVE';
  showCombatMessage(message, 1.45);
  playTone(phase === 2 ? 88 : 132, 0.42, 0.06, 0, 'sawtooth');
  return true;
}

function updateBossAura(enemy, delta) {
  if (!enemy.bossAura) return;
  enemy.bossAuraTime = (enemy.bossAuraTime ?? 0) + delta;
  const pulse = 0.5 + Math.sin(enemy.bossAuraTime * (3.2 + enemy.bossPhase * 0.65)) * 0.5;
  enemy.bossAura.userData.ring.rotation.z += delta * (0.38 + enemy.bossPhase * 0.14);
  enemy.bossAura.userData.material.opacity = 0.15 + pulse * 0.12 + enemy.bossPhase * 0.035;
  enemy.bossAura.userData.light.intensity = 0.75 + enemy.bossPhase * 0.42 + pulse * 0.55;
}

function updateBossTelegraph(enemy, mode, progress) {
  const telegraph = enemy.telegraph;
  if (!telegraph) return;
  const ring = telegraph.userData.ring;
  const aimLine = telegraph.userData.aimLine;
  const material = telegraph.userData.material;
  const light = telegraph.userData.light;
  const pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
  const phaseColor = BOSS_PHASE_COLORS[enemy.bossPhase - 1];
  const color = mode === 'charge' ? '#ff3f32' : mode === 'stomp' ? '#ff9d32' : phaseColor;
  telegraph.visible = true;
  telegraph.scale.setScalar(mode === 'stomp'
    ? THREE.MathUtils.lerp(1.1, BOSS_STOMP_RADIUS / 0.74, progress)
    : mode === 'standard' ? 1.3 + progress * 0.22 : 1);
  ring.visible = true;
  if (aimLine) aimLine.visible = mode === 'charge' || mode === 'salvo';
  material.color.set(color);
  material.opacity = 0.24 + progress * 0.56 + pulse * 0.12;
  light.color.set(color);
  light.intensity = 0.6 + progress * 2.7 + pulse * 0.45;
  setEnemyWeaponGlow(enemy, 0.25 + progress * 1.3);
}

function spawnBossAttackArc(enemy) {
  const root = new THREE.Group();
  root.position.copy(enemy.root.position);
  root.position.y += 0.18;
  root.rotation.y = enemy.root.rotation.y;
  const material = new THREE.MeshBasicMaterial({
    color: BOSS_PHASE_COLORS[enemy.bossPhase - 1],
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1.34, 34, 1, -Math.PI * 0.68, Math.PI * 1.36),
    material
  );
  arc.rotation.x = -Math.PI * 0.5;
  root.add(arc);
  registerCombatEffect(root, 0.3, {
    kind: 'boss-attack-arc',
    scaleFrom: 0.75,
    scaleTo: 1.32,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.5)
  });
}

function spawnBossStompShockwave(enemy) {
  const root = new THREE.Group();
  root.position.copy(enemy.root.position);
  root.position.y += 0.065;
  const material = new THREE.MeshBasicMaterial({
    color: '#ff9d32',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.62, 56), material);
  ring.rotation.x = -Math.PI * 0.5;
  root.add(ring);
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), material.clone());
  inner.rotation.x = -Math.PI * 0.5;
  root.add(inner);
  const light = new THREE.PointLight('#ff9d32', 4.8, CELL * 4.6, 2);
  light.position.y = 0.42;
  root.add(light);
  registerCombatEffect(root, 0.48, {
    kind: 'boss-stomp-wave',
    light,
    lightBaseIntensity: 4.8,
    scaleFrom: 0.48,
    scaleTo: BOSS_STOMP_RADIUS / 0.55,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.22)
  });
}

function spawnBossChargeDust(enemy) {
  const backward = enemy.bossDirection.clone().negate();
  const right = new THREE.Vector3(enemy.bossDirection.z, 0, -enemy.bossDirection.x);
  const root = new THREE.Group();
  root.position.copy(enemy.root.position).addScaledVector(backward, enemy.bodyRadius * 0.7);
  root.position.y += 0.07;
  const geometry = new RoundedBoxGeometry(0.18, 0.12, 0.14, 2, 0.025);
  const particles = [];
  for (let index = 0; index < 5; index += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: index % 2 ? '#c5bda8' : '#8f9186',
      roughness: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const block = new THREE.Mesh(geometry, material);
    const spread = index / 4 - 0.5;
    block.position.addScaledVector(right, spread * 0.72);
    block.position.y = (index % 2) * 0.07;
    root.add(block);
    const velocity = backward.clone().multiplyScalar(0.8 + index * 0.08)
      .addScaledVector(right, spread * 1.35);
    velocity.y = 0.35 + (index % 3) * 0.12;
    particles.push({
      mesh: block,
      velocity,
      spin: new THREE.Vector3(1.2 + index * 0.2, spread * 2.2, index % 2 ? -1.4 : 1.4)
    });
  }
  registerCombatEffect(root, 0.42, {
    kind: 'boss-charge-dust',
    particles,
    gravity: -1.15,
    drag: 1.8,
    scaleFrom: 0.78,
    scaleTo: 1.42,
    opacityCurve: (progress) => Math.pow(1 - progress, 1.4)
  });
}

function beginBossStandard(enemy) {
  setBossAction(enemy, 'standard-windup', 0.56);
  enemy.telegraph.visible = true;
  playActorAnimation(enemy.root, 'holding-right', { restart: true, speed: 0.82, fade: 0.06 });
}

function beginBossCharge(enemy, windup = 0.72) {
  setBossAction(enemy, 'charge-windup', windup);
  enemy.telegraph.visible = true;
  playActorAnimation(enemy.root, 'holding-right', { restart: true, speed: 0.72, fade: 0.06 });
}

function beginBossStomp(enemy) {
  setBossAction(enemy, 'stomp-windup', 0.92);
  enemy.telegraph.visible = true;
  playActorAnimation(enemy.root, 'emote-yes', { once: true, restart: true, speed: 0.72, fade: 0.05 });
}

function beginBossSalvo(enemy) {
  setBossAction(enemy, 'salvo-windup', 0.72);
  enemy.bossSpearShots = 0;
  enemy.bossSpearTimer = 0;
  enemy.telegraph.visible = true;
  playActorAnimation(enemy.root, 'holding-right-shoot', { restart: true, speed: 0.78, fade: 0.06 });
}

function chooseBossAction(enemy, distance) {
  enemy.bossActionCycle += 1;
  const standardRange = enemy.bodyRadius + PLAYER_BODY_RADIUS + 0.7;
  if (enemy.bossPhase === 1) {
    if (distance > standardRange * 1.05 && enemy.bossActionCycle % 2 === 1) beginBossCharge(enemy);
    else beginBossStandard(enemy);
    return;
  }
  if (enemy.bossPhase === 2) {
    if (distance < standardRange && enemy.bossActionCycle % 3 === 0) beginBossStandard(enemy);
    else beginBossStomp(enemy);
    return;
  }
  if (distance < standardRange && enemy.bossActionCycle % 2 === 0) beginBossStandard(enemy);
  else beginBossSalvo(enemy);
}

function updateBossCombat(enemy, delta) {
  updateBossAura(enemy, delta);
  enemy.bossCooldown = Math.max(0, enemy.bossCooldown - delta);
  const toPlayer = playerRoot.position.clone().sub(enemy.root.position).setY(0);
  const distance = toPlayer.length();
  const direction = distance > 0.001 ? toPlayer.normalize() : enemy.bossDirection.clone();
  const sameHeight = actorsShareCombatHeight(enemy.root, playerRoot);
  const action = enemy.bossAction;

  if (action === 'idle') {
    enemy.attackTimer = 0;
    if (!sameHeight) {
      const navigationDirection = enemyNavigationDirection(enemy, playerRoot.position, delta, true);
      if (navigationDirection.lengthSq() > 0.0001) {
        enemy.root.rotation.y = Math.atan2(navigationDirection.x, navigationDirection.z);
        const moved = moveCombatRoot(
          enemy.root,
          navigationDirection.multiplyScalar(delta * 2.05),
          enemy.bodyRadius,
          enemy.navigationUsingStairs ? { allowAnyHeight: true } : {}
        );
        playActorAnimation(enemy.root, moved ? 'walk' : 'idle', { speed: 0.9, fade: 0.1 });
      } else {
        playActorAnimation(enemy.root, 'idle', { fade: 0.1 });
      }
      return;
    }
    enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
    if (enemy.bossCooldown <= 0) {
      chooseBossAction(enemy, distance);
      return;
    }
    playActorAnimation(enemy.root, 'idle', { fade: 0.1 });
    return;
  }

  enemy.bossActionTimer = Math.max(0, enemy.bossActionTimer - delta);
  enemy.attackTimer = enemy.bossActionTimer;
  const progress = 1 - enemy.bossActionTimer / Math.max(0.001, enemy.bossActionDuration);

  if (action === 'standard-windup') {
    enemy.bossDirection.copy(direction);
    enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
    updateBossTelegraph(enemy, 'standard', progress);
    if (enemy.bossActionTimer <= 0) {
      playActorAnimation(enemy.root, 'attack-melee-right', { once: true, restart: true, speed: 1.05, fade: 0.035 });
      spawnBossAttackArc(enemy);
      const hitRange = enemy.bodyRadius + PLAYER_BODY_RADIUS + 0.7;
      if (sameHeight && distance <= hitRange) {
        applyCombatDamage({ kind: 'player' }, {
          amount: 1,
          direction,
          source: 'boss-standard',
          faction: 'enemy',
          knockback: 1.55,
          blockable: true
        });
      }
      setBossAction(enemy, 'standard-recovery', 0.42);
      enemy.telegraph.visible = false;
      playTone(108, 0.16, 0.035, 0, 'sawtooth');
    }
    return;
  }

  if (action === 'standard-recovery') {
    if (enemy.bossActionTimer <= 0) finishBossAction(enemy, 0.82);
    return;
  }

  if (action === 'charge-windup') {
    enemy.bossDirection.copy(direction);
    enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
    updateBossTelegraph(enemy, 'charge', progress);
    if (enemy.bossActionTimer <= 0) {
      setBossAction(enemy, 'charge', enemy.bossPhase === 2 ? 1.16 : 1.02);
      enemy.telegraph.visible = false;
      playActorAnimation(enemy.root, 'sprint', { restart: true, speed: 1.5, fade: 0.035 });
      playTone(74, 0.28, 0.05, 0, 'sawtooth');
    }
    return;
  }

  if (action === 'charge') {
    const steering = 1 - Math.exp(-delta * 4.2);
    enemy.bossDirection.lerp(direction, steering).setY(0).normalize();
    enemy.root.rotation.y = Math.atan2(enemy.bossDirection.x, enemy.bossDirection.z);
    let moved = moveCombatRoot(
      enemy.root,
      enemy.bossDirection.clone().multiplyScalar(delta * BOSS_CHARGE_SPEED),
      enemy.bodyRadius
    );
    if (!moved) {
      const side = new THREE.Vector3(-enemy.bossDirection.z, 0, enemy.bossDirection.x)
        .multiplyScalar(enemy.orbitDirection * delta * BOSS_CHARGE_SPEED * 0.58);
      moved = moveCombatRoot(enemy.root, side, enemy.bodyRadius);
      if (!moved) enemy.orbitDirection *= -1;
    }
    enemy.bossTrailTimer = Math.max(0, enemy.bossTrailTimer - delta);
    if (moved && enemy.bossTrailTimer <= 0) {
      spawnBossChargeDust(enemy);
      enemy.bossTrailTimer = 0.075;
    }
    const chargeDistance = horizontalDistanceBetween(enemy.root, playerRoot);
    if (!enemy.attackConnected && sameHeight && chargeDistance <= BOSS_CHARGE_HIT_RANGE) {
      enemy.attackConnected = true;
      applyCombatDamage({ kind: 'player' }, {
        amount: 2,
        direction: enemy.bossDirection,
        source: 'boss-charge',
        faction: 'enemy',
        knockback: 3.35,
        blockable: true
      });
      spawnEnemyProjectileImpact(playerRoot.position.clone().add(new THREE.Vector3(0, 0.52, 0)));
      enemy.bossActionTimer = 0;
    }
    if (enemy.bossActionTimer <= 0) {
      setBossAction(enemy, 'charge-recovery', 0.48);
      playActorAnimation(enemy.root, 'idle', { fade: 0.08 });
    }
    return;
  }

  if (action === 'charge-recovery') {
    if (enemy.bossActionTimer <= 0) finishBossAction(enemy, enemy.bossPhase === 2 ? 0.72 : 1.05);
    return;
  }

  if (action === 'stomp-windup') {
    enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
    updateBossTelegraph(enemy, 'stomp', progress);
    if (enemy.bossActionTimer <= 0) {
      spawnBossStompShockwave(enemy);
      if (sameHeight && distance <= BOSS_STOMP_RADIUS + PLAYER_BODY_RADIUS) {
        applyCombatDamage({ kind: 'player' }, {
          amount: 1,
          direction,
          source: 'boss-stomp',
          faction: 'enemy',
          knockback: 2.2,
          blockable: false
        });
      }
      triggerCombatImpact('lethal');
      playTone(54, 0.34, 0.065, 0, 'square');
      setBossAction(enemy, 'stomp-recovery', 0.3);
      enemy.telegraph.visible = false;
    }
    return;
  }

  if (action === 'stomp-recovery') {
    if (enemy.bossActionTimer <= 0) beginBossCharge(enemy, 0.34);
    return;
  }

  if (action === 'salvo-windup') {
    enemy.bossDirection.copy(direction);
    enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
    updateBossTelegraph(enemy, 'salvo', progress);
    if (enemy.bossActionTimer <= 0) {
      setBossAction(enemy, 'salvo', 0.68);
      enemy.bossSpearShots = 0;
      enemy.bossSpearTimer = 0;
    }
    return;
  }

  if (action === 'salvo') {
    enemy.bossSpearTimer -= delta;
    updateBossTelegraph(enemy, 'salvo', 0.7 + Math.sin(progress * Math.PI * 3) * 0.18);
    if (enemy.bossActionTimer <= 0 && enemy.bossSpearShots === 0) {
      setBossAction(enemy, 'salvo-recovery', 0.3);
      enemy.telegraph.visible = false;
      return;
    }
    if (enemy.bossSpearShots < 3 && enemy.bossSpearTimer <= 0) {
      const spearVector = playerRoot.position.clone().sub(enemy.root.position).setY(0);
      const spearDistance = spearVector.length();
      const spearDirection = spearDistance > 0.001 ? spearVector.normalize() : enemy.bossDirection.clone();
      enemy.root.rotation.y = Math.atan2(spearDirection.x, spearDirection.z);
      enemy.bossDirection.copy(spearDirection);
      const throwLaneClear = sameHeight && hasClearEnemyThrowLane(enemy, spearDirection, spearDistance);
      if (!throwLaneClear) {
        bossSeekThrowLane(enemy, spearDirection, delta);
        enemy.bossSpearTimer = 0.08;
        enemy.bossActionTimer = Math.max(enemy.bossActionTimer, 0.2);
        return;
      }
      playActorAnimation(enemy.root, 'interact-right', { once: true, restart: true, speed: 1.55, fade: 0.025 });
      spawnEnemySpearProjectile(enemy, spearDirection, {
        fromRoot: true,
        originHeight: 1.48,
        speed: ENEMY_SPEAR_SPEED * 1.12,
        scale: 0.84,
        life: 1.35,
        damage: 1,
        knockback: 1.38,
        source: 'boss-spear'
      });
      enemy.bossSpearShots += 1;
      enemy.bossSpearTimer = 0.17;
      playTone(164 + enemy.bossSpearShots * 18, 0.11, 0.028, 0, 'triangle');
    }
    if (enemy.bossSpearShots >= 3 && enemy.bossActionTimer <= 0) {
      setBossAction(enemy, 'salvo-recovery', 0.44);
      enemy.telegraph.visible = false;
      playActorAnimation(enemy.root, 'holding-right-shoot', { restart: true, speed: 0.62, fade: 0.08 });
    }
    return;
  }

  if (action === 'salvo-recovery' && enemy.bossActionTimer <= 0) finishBossAction(enemy, 0.88);
}

function updateEnemyCombat(enemy, delta) {
  if (!enemy.active) return;
  if (!enemy.alive) {
    if (enemy.hurtTimer > 0) enemy.hurtTimer = Math.max(0, enemy.hurtTimer - delta);
    if (enemy.hurtTimer <= 0) setRootHitFlash(enemy.root, false);
    return;
  }
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
  enemy.hurtTimer = Math.max(0, enemy.hurtTimer - delta);
  if (enemy.hurtTimer <= 0) setRootHitFlash(enemy.root, false);

  if (enemy.knockback.lengthSq() > 0.02) {
    const onStair = combatSurfaceAt(enemy.root.position, enemy.root, { allowAnyHeight: true })?.slope;
    moveCombatRootSwept(
      enemy.root,
      enemy.knockback.clone().multiplyScalar(delta),
      enemy.bodyRadius,
      onStair ? { allowAnyHeight: true } : {}
    );
    enemy.knockback.multiplyScalar(Math.exp(-delta * 9));
  }
  if (enemy.hurtTimer > 0 || playerHealth <= 0) return;

  if (enemy.isBoss) {
    updateBossCombat(enemy, delta);
    return;
  }

  const toPlayer = playerRoot.position.clone().sub(enemy.root.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  const direction = distance > 0.001 ? toPlayer.normalize() : new THREE.Vector3(0, 0, 1);
  const sameHeight = actorsShareCombatHeight(enemy.root, playerRoot);
  const ranged = enemy.attackType === 'ranged';
  const timings = enemyAttackTimings(enemy);
  const throwLaneClear = sameHeight && (!ranged || hasClearEnemyThrowLane(enemy, direction, distance));
  enemy.root.rotation.y = Math.atan2(direction.x, direction.z);

  if (enemy.attackTimer > 0) {
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    if (enemy.attackState === 'windup' && enemy.attackTimer <= timings.strikeAt) {
      enemy.attackState = 'strike';
      if (ranged) {
        playActorAnimation(enemy.root, 'interact-right', {
          once: true,
          restart: true,
          speed: 1.34,
          fade: 0.035
        });
        if (sameHeight) spawnEnemySpearProjectile(enemy, direction);
        enemy.attackConnected = true;
        if (enemy.weapon) enemy.weapon.root.visible = false;
        playTone(186, 0.13, 0.025, 0, 'triangle');
      } else {
        playActorAnimation(enemy.root, 'attack-melee-right', {
          once: true,
          restart: true,
          speed: 1.22,
          fade: 0.035
        });
        spawnEnemyAttackArc(enemy);
        playTone(138, 0.12, 0.022, 0, 'sawtooth');
      }
    }
    updateEnemyAttackTelegraph(enemy);
    if (!ranged && enemy.attackState === 'strike' && !enemy.attackConnected
      && enemy.attackTimer < timings.hitStart
      && enemy.attackTimer > timings.hitEnd) {
      if (sameHeight && distance < enemyMeleeHitRange()) {
        enemy.attackConnected = true;
        applyCombatDamage({ kind: 'player' }, {
          amount: 1,
          direction,
          source: 'enemy-melee',
          faction: 'enemy',
          knockback: 1.25,
          blockable: true
        });
      }
    }
    if (enemy.attackState === 'strike' && enemy.attackTimer <= timings.recoveryAt) {
      enemy.attackState = 'recovery';
      enemy.telegraph.visible = false;
      setEnemyWeaponGlow(enemy, 0);
      playActorAnimation(enemy.root, ranged ? 'holding-right-shoot' : 'holding-right', {
        restart: true,
        speed: 0.58,
        fade: 0.08
      });
    }
    if (enemy.attackTimer <= 0) {
      resetEnemyAttack(enemy);
      playActorAnimation(enemy.root, 'idle', { fade: 0.08 });
    }
    return;
  }

  const anotherEnemyAttacking = combatEnemies.some((other) => other !== enemy
    && other.active && other.alive && other.attackTimer > 0);
  const withinAttackRange = sameHeight && (ranged
    ? distance <= ENEMY_RANGED_ATTACK_RANGE
      && distance >= ENEMY_RANGED_RETREAT_RANGE * 0.72
      && throwLaneClear
    : enemy.formationRole === 'lead' && distance < enemyMeleeTriggerRange());
  if (withinAttackRange && enemy.attackCooldown <= 0 && !anotherEnemyAttacking) {
    enemy.attackTimer = timings.total;
    const cadence = ranged ? 1.12 : timings.cooldown;
    const jitter = combatLabActive ? 0 : Math.random() * 0.34;
    enemy.attackCooldown = timings.total + cadence + jitter;
    enemy.attackState = 'windup';
    enemy.attackConnected = false;
    enemy.telegraph.visible = true;
    updateEnemyAttackTelegraph(enemy);
    playActorAnimation(enemy.root, ranged ? 'holding-right-shoot' : 'holding-right', {
      restart: true,
      speed: ranged ? 0.92 : 1.05,
      fade: 0.06
    });
  } else {
    const pursuitSpeed = waveDirector.wave > 1 ? 2.52 : 2.25;
    const requiresVerticalPath = !sameHeight;
    let travelDirection = enemyNavigationDirection(
      enemy,
      playerRoot.position,
      delta,
      requiresVerticalPath
    );
    let travelSpeed = pursuitSpeed;
    if (ranged && sameHeight) {
      travelSpeed *= 0.9;
      if (distance < ENEMY_RANGED_RETREAT_RANGE) {
        travelDirection.negate();
        travelSpeed *= 1.18;
      } else if (!throwLaneClear) {
        travelDirection.set(-direction.z, 0, direction.x)
          .multiplyScalar(enemy.orbitDirection);
        travelSpeed *= 0.72;
      } else if (distance <= ENEMY_RANGED_PREFERRED_RANGE) {
        travelDirection.set(-direction.z, 0, direction.x)
          .multiplyScalar(enemy.orbitDirection);
        travelSpeed *= 0.48;
      }
    } else if (!ranged && sameHeight && enemy.formationRole === 'support') {
      const formationTarget = meleeSupportTarget(enemy);
      travelDirection = enemyNavigationDirection(enemy, formationTarget, delta);
      travelSpeed *= 0.72;
    }
    if (enemy.navigationUsingStairs) {
      travelDirection = enemyStairLaneDirection(enemy, travelDirection);
    }
    const movement = travelDirection.multiplyScalar(delta * travelSpeed);
    const moved = (enemy.navigationUsingStairs ? moveCombatRootSwept : moveCombatRoot)(
      enemy.root,
      movement,
      enemy.bodyRadius,
      enemy.navigationUsingStairs ? { allowAnyHeight: true } : {}
    );
    if (!moved && !requiresVerticalPath) {
      enemy.orbitDirection *= -1;
      const side = new THREE.Vector3(-direction.z, 0, direction.x)
        .multiplyScalar(enemy.orbitDirection * delta * 1.85);
      moveCombatRoot(enemy.root, side, enemy.bodyRadius);
    }
    playActorAnimation(enemy.root, moved ? 'walk' : 'idle', {
      speed: ranged ? 0.92 : 1.05,
      fade: 0.1
    });
  }
}

function updateCombatCamera(delta) {
  if (gameOverOpen) {
    combatCameraLead.multiplyScalar(Math.exp(-delta * 3.2));
    const desired = playerRoot.position.clone().add(followOffset.clone().multiplyScalar(0.72));
    const blend = 1 - Math.exp(-delta * 2.4);
    camera.position.lerp(desired, blend);
    const desiredFocus = playerRoot.position.clone().add(new THREE.Vector3(0, 0.34, 0));
    combatCameraFocus.lerp(desiredFocus, 1 - Math.exp(-delta * 3.2));
    camera.lookAt(combatCameraFocus);
    return;
  }
  if (equipmentOpen) {
    const localOffset = EQUIPMENT_VIEW_OFFSETS[selectedEquipmentView].clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), equipmentPreviewBaseRotation);
    const desiredCloseup = playerRoot.position.clone().add(localOffset);
    const closeupBlend = 1 - Math.exp(-delta * 7.5);
    camera.position.lerp(desiredCloseup, closeupBlend);
    const closeupTarget = playerRoot.position.clone().add(COMBAT_CAMERA_TARGET_OFFSET);
    camera.lookAt(closeupTarget);
    if (equipmentBackdrop) {
      const cameraDirection = camera.position.clone().sub(playerRoot.position).normalize();
      equipmentBackdrop.position.copy(playerRoot.position)
        .addScaledVector(cameraDirection, -0.82);
      equipmentBackdrop.position.y += 1.12;
      equipmentBackdrop.lookAt(camera.position);
    }
    return;
  }
  const movement = movementInputVector();
  const facingDirection = new THREE.Vector3(
    Math.sin(playerRoot.rotation.y),
    0,
    Math.cos(playerRoot.rotation.y)
  );
  const stableIdleDirection = lastMoveDirection.lengthSq() > 0.0004
    ? lastMoveDirection.clone().setY(0).normalize()
    : facingDirection;
  const leadDirection = movement.lengthSq() > 0.0004
    ? movement.clone().setY(0).normalize()
    : stableIdleDirection;
  const desiredLeadDistance = movement.lengthSq() > 0.0004
    ? COMBAT_CAMERA_LEAD_DISTANCE
    : COMBAT_CAMERA_IDLE_LEAD_DISTANCE;
  const desiredLead = leadDirection.multiplyScalar(desiredLeadDistance);
  const leadBlend = 1 - Math.exp(-delta * COMBAT_CAMERA_LEAD_SPEED);
  combatCameraLead.lerp(desiredLead, leadBlend);

  const desired = playerRoot.position.clone().add(followOffset).add(combatCameraLead);
  const blend = 1 - Math.exp(-delta * 4.5);
  camera.position.lerp(desired, blend);
  const desiredFocus = playerRoot.position.clone().add(COMBAT_CAMERA_TARGET_OFFSET).add(combatCameraLead);
  const focusBlend = 1 - Math.exp(-delta * COMBAT_CAMERA_FOCUS_SPEED);
  combatCameraFocus.lerp(desiredFocus, focusBlend);
  cameraShake = Math.max(0, cameraShake - delta * 1.25);
  if (cameraShake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake * 0.55;
  }
  camera.lookAt(combatCameraFocus);
}

function updateCombat(delta) {
  updateSignale(delta);
  updateFelsSchub(delta);
  updateGetragenesFass();
  updateFassFlug(delta);
  levelDirector.exitLockTimer = Math.max(0, levelDirector.exitLockTimer - delta);
  updateLevelTransition(delta);
  if (levelDirector.phase !== 'idle') {
    updateCombatEffects(delta);
    updateCombatCamera(delta);
    updateCombatHud();
    updatePlayerWeapon();
    return;
  }
  updateWaveDirector(delta);
  updateCombatLab(delta);
  if (levelDirector.phase !== 'idle') return;
  if (combatMessageTimer > 0) {
    combatMessageTimer = Math.max(0, combatMessageTimer - delta);
    if (combatMessageTimer <= 0) combatMessage.hidden = true;
  }
  if (gameOverOpen) {
    updateGameOver(delta);
    updateCombatEffects(delta);
    updateCombatCamera(delta);
    updateCombatHud();
    updatePlayerWeapon();
    return;
  }
  if (qaPanelOpen || gameMenuOpen || inventoryOpen || equipmentOpen || rewardOpen || supplyOpen) {
    updateCombatEffects(delta);
    updateCombatCamera(delta);
    updateCombatHud();
    updatePlayerWeapon();
    updateEquipmentPreviewTimeline();
    return;
  }
  updatePlayerCombat(delta);
  updateWaveDirector(0);
  updateCombatFormation(delta);
  combatEnemies.forEach((enemy) => updateEnemyCombat(enemy, delta));
  updateCombatTraps(delta);
  updateCombatDestructibles(delta);
  updateLootDrops(delta);
  updateCombatEffects(delta);
  updateCombatCamera(delta);
  updateCombatHud();
}

function updateRain(delta) {
  if (!rainEnabled) return;
  const positions = rain.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] -= delta * 17;
    positions[i] += delta * 0.7;
    if (positions[i + 1] < -1.5) {
      positions[i + 1] = 28;
      positions[i] = (Math.random() - 0.5) * 58;
      positions[i + 2] = (Math.random() - 0.5) * 48;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

function setTimeOfDay(isNight) {
  night = isNight;
  document.getElementById('time-toggle').setAttribute('aria-pressed', String(night));
  scene.background.set(night ? '#17283a' : '#819ba4');
  scene.fog.color.set(night ? '#17283a' : '#819ba4');
  hemisphere.color.set(night ? '#8aa0c4' : '#dbe7e8');
  hemisphere.groundColor.set(night ? '#182c29' : '#30453a');
  hemisphere.intensity = night ? 1.05 : 1.85;
  sun.color.set(night ? '#8ba7d5' : '#ffe1a0');
  sun.intensity = night ? 1.0 : 3.35;
  rimLight.intensity = night ? 2.1 : 1.3;
  renderer.toneMappingExposure = night ? 0.84 : 1.08;
  aethoriaLightPass.uniforms.nightMix.value = night ? 1 : 0;
}

function setShaderEnabled(enabled) {
  shaderEnabled = enabled;
  aethoriaLightPass.enabled = shaderEnabled;
  shaderToggle.setAttribute('aria-pressed', String(shaderEnabled));
}

function resetCamera() {
  controls.autoRotate = false;
  cameraWasMoved = false;
  cameraTween = 0;
}

function updateCameraTween(delta) {
  if (cameraTween >= 1) return;
  cameraTween = Math.min(1, cameraTween + delta * 1.45);
  const eased = 1 - Math.pow(1 - cameraTween, 3);
  const pose = defaultCameraPose();
  camera.position.lerp(pose.position, eased * 0.12);
  controls.target.lerp(pose.target, eased * 0.14);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  updateDiagnosticRay();
}

function pickRoot(event, editableOnly = false) {
  updatePointer(event);
  const meshes = [];
  pickableRoots.forEach((root) => {
    if (!root.visible) return;
    if (editableOnly && !root.userData.editable) return;
    root.traverse((child) => { if (child.isMesh) meshes.push(child); });
  });
  const hits = raycaster.intersectObjects(meshes, false);
  const rootForHit = (hit) => {
    let root = hit?.object;
    while (root && !root.userData.assetName) root = root.parent;
    return root ?? null;
  };
  const markerRoot = hits.map(rootForHit).find((root) => root?.userData.systemMarker);
  if (markerRoot) return markerRoot;
  const hit = hits[0];
  if (!hit) return null;
  return rootForHit(hit);
}

function pickModel(event) {
  const root = pickRoot(event);
  if (!root) return;
  selectedName.textContent = root.userData.label;
  selectedDetail.textContent = root.userData.detail;
}

function pointOnBuildPlane(event) {
  updatePointer(event);
  buildPlane.constant = -(currentLayer * LEVEL_HEIGHT);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(buildPlane, point) ? point : null;
}

function snapPoint(point) {
  return {
    x: Math.round(point.x / CELL),
    z: Math.round(point.z / CELL),
    y: currentLayer * LEVEL_HEIGHT
  };
}

function normalizePlacementWaveAssignments(placements, waves) {
  return normalizeRoomPlacementWaveAssignments(placements, waves, {
    isEnemyPlacement: (placement) => Boolean(BUILD_ASSET_DEFINITIONS[placement?.name]?.enemy)
  });
}

function roomDefinition(roomId) {
  return roomDefinitions.find((room) => room.id === roomId) ?? null;
}

function roomWaves(roomId = activeEditorRoomId) {
  const room = roomDefinition(roomId);
  if (!room) return [];
  room.waves = normalizeRoomWaves(room.id, room.waves);
  return room.waves;
}

function waveDefinition(roomId, waveId) {
  return roomWaves(roomId).find((wave) => wave.id === waveId) ?? null;
}

function activeEditorWave() {
  const waves = roomWaves();
  const selected = waves.find((wave) => wave.id === activeEditorWaveId) ?? waves[0] ?? null;
  activeEditorWaveId = selected?.id ?? '';
  return selected;
}

function enemyWaveId(root) {
  const waves = roomWaves(root?.userData.roomId);
  const requested = root?.userData.placement?.settings?.waveId;
  if (waves.some((wave) => wave.id === requested)) return requested;
  const fallback = root?.userData.combatEnemy?.isBoss
    ? waves.find((wave) => wave.boss) ?? waves[0]
    : waves[0];
  if (root?.userData.placement) {
    root.userData.placement.settings ??= {};
    root.userData.placement.settings.waveId = fallback?.id ?? '';
  }
  return fallback?.id ?? '';
}

function enemySpawnDelay(root) {
  const settings = root?.userData.placement?.settings ?? {};
  settings.spawnDelay = THREE.MathUtils.clamp(Number(settings.spawnDelay) || 0, 0, 20);
  return settings.spawnDelay;
}

function nextWaveId(roomId = activeEditorRoomId) {
  waveSequence += 1;
  return `${roomId}-welle-${Date.now().toString(36)}-${waveSequence}`;
}

function clearWavePreview() {
  wavePreviewHelpers.splice(0).forEach((helper) => {
    scene.remove(helper);
    helper.geometry?.dispose();
    helper.material?.dispose();
  });
}

function rebuildWavePreview() {
  clearWavePreview();
  if (activeEditorView !== 'waves' || !buildMode) return;
  editableRootsForRoom().filter((root) => root.userData.combatEnemy
    && enemyWaveId(root) === activeEditorWaveId).forEach((root) => {
    const helper = new THREE.BoxHelper(root, root.userData.combatEnemy.isBoss ? '#ff6738' : '#e7c56c');
    helper.material.depthTest = false;
    helper.renderOrder = 120;
    scene.add(helper);
    wavePreviewHelpers.push(helper);
  });
}

function updateEnemyWaveOptions(root = selectedRoot) {
  enemyWaveSelect.replaceChildren();
  const roomId = root?.userData.roomId ?? activeEditorRoomId;
  roomWaves(roomId).forEach((wave, index) => {
    const option = document.createElement('option');
    option.value = wave.id;
    option.textContent = `${index + 1}. ${wave.name}${wave.boss ? ' - Boss' : ''}`;
    enemyWaveSelect.append(option);
  });
  if (root?.userData.combatEnemy) {
    enemyWaveSelect.value = enemyWaveId(root);
    enemySpawnDelayInput.value = String(Number(enemySpawnDelay(root).toFixed(1)));
  }
}

function updateWaveEditor() {
  const waves = roomWaves();
  const selected = activeEditorWave();
  waveList.replaceChildren();
  waves.forEach((wave, index) => {
    const enemyCount = editableRootsForRoom().filter((root) => root.userData.combatEnemy
      && enemyWaveId(root) === wave.id).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wave-list-button';
    button.dataset.waveId = wave.id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(wave.id === selected?.id));
    const name = document.createElement('strong');
    name.textContent = `${index + 1}. ${wave.name}`;
    const count = document.createElement('span');
    count.textContent = `${enemyCount} ${enemyCount === 1 ? 'Gegner' : 'Gegner'}`;
    const type = document.createElement('span');
    type.className = wave.boss ? 'wave-boss-label' : '';
    type.textContent = wave.boss ? 'Bosswelle' : `Pause ${wave.intermission.toFixed(1)} s`;
    button.append(name, type, count);
    button.addEventListener('click', () => selectEditorWave(wave.id));
    waveList.append(button);
  });
  waveEditorSummary.textContent = `${waves.length} ${waves.length === 1 ? 'Welle' : 'Wellen'}`;
  if (selected) {
    waveNameInput.value = selected.name;
    waveIntermissionInput.value = String(Number(selected.intermission.toFixed(1)));
    waveRewardCoinsInput.value = String(selected.rewardCoins);
    waveBossInput.checked = selected.boss;
  }
  document.getElementById('wave-delete').disabled = waves.length <= 1;
  const selectedIndex = waves.findIndex((wave) => wave.id === selected?.id);
  document.getElementById('wave-up').disabled = selectedIndex <= 0;
  document.getElementById('wave-down').disabled = selectedIndex < 0 || selectedIndex >= waves.length - 1;
  updateEnemyWaveOptions();
  rebuildWavePreview();
  window.lucide?.createIcons();
}

function selectEditorWave(waveId) {
  if (!waveDefinition(activeEditorRoomId, waveId)) return;
  activeEditorWaveId = waveId;
  updateWaveEditor();
  setBuildStatus(`${activeEditorWave().name} ausgewaehlt`);
}

function setEditorView(view) {
  activeEditorView = view === 'waves' ? 'waves' : 'build';
  buildEditorView.hidden = activeEditorView !== 'build';
  waveEditorView.hidden = activeEditorView !== 'waves';
  document.querySelectorAll('[data-editor-view]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.editorView === activeEditorView));
  });
  if (activeEditorView === 'waves' && editorMode !== 'select') setEditorMode('select');
  updateWaveEditor();
}

function addEditorWave(source = null) {
  const waves = roomWaves();
  const wave = {
    id: nextWaveId(),
    name: source ? `${source.name} Kopie` : `Welle ${waves.length + 1}`,
    intermission: source?.intermission ?? 1.5,
    rewardCoins: source?.rewardCoins ?? 0,
    boss: false
  };
  waves.push(wave);
  activeEditorWaveId = wave.id;
  updateWaveEditor();
  recordHistory(source ? 'Welle dupliziert' : 'Welle hinzugefuegt');
}

function moveEditorWave(direction) {
  const waves = roomWaves();
  const index = waves.findIndex((wave) => wave.id === activeEditorWaveId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= waves.length) return;
  [waves[index], waves[target]] = [waves[target], waves[index]];
  updateWaveEditor();
  recordHistory('Wellenreihenfolge geaendert');
}

function deleteEditorWave() {
  const waves = roomWaves();
  if (waves.length <= 1) return;
  const index = waves.findIndex((wave) => wave.id === activeEditorWaveId);
  if (index < 0) return;
  const [removed] = waves.splice(index, 1);
  const fallback = waves[Math.min(index, waves.length - 1)];
  editableRootsForRoom().filter((root) => root.userData.combatEnemy
    && root.userData.placement.settings?.waveId === removed.id).forEach((root) => {
    root.userData.placement.settings.waveId = fallback.id;
  });
  activeEditorWaveId = fallback.id;
  updateWaveEditor();
  recordHistory(`${removed.name} geloescht`);
}

function updateSelectedWave(mutator, message) {
  const wave = activeEditorWave();
  if (!wave) return;
  mutator(wave);
  updateWaveEditor();
  recordHistory(message);
}

function previewSelectedWave(mutator) {
  const wave = activeEditorWave();
  if (!wave) return;
  mutator(wave);
  updateWaveEditor();
}

function roomLevelForId(roomId) {
  const index = roomDefinitions.findIndex((room) => room.id === roomId);
  return index >= 0 ? index + 1 : 1;
}

function systemMarkersForRoom(roomId, type = null) {
  return editableRootsForRoom(roomId).filter((root) => root.userData.systemMarker
    && (!type || root.userData.systemMarker === type));
}

function roomEntryMarker(roomId) {
  const preferredType = roomLevelForId(roomId) === 1 ? 'player-start' : 'arrival';
  return systemMarkersForRoom(roomId, preferredType)[0]
    ?? systemMarkersForRoom(roomId, 'player-start')[0]
    ?? systemMarkersForRoom(roomId, 'arrival')[0]
    ?? null;
}

function placePlayerAtRoomEntry(roomId) {
  const marker = roomEntryMarker(roomId);
  cancelPlayerHook();
  resetPlayerDropIntent();
  playerFallTimer = 0;
  playerFallMode = 'none';
  playerFallDropHeight = 0;
  playerFallArcHeight = 0;
  playerLandingTimer = 0;
  playerLandingDuration = 0;
  playerLandingStrength = 0;
  restorePlayerLandingPose();
  playerLandingPoseStored = false;
  playerRecoveryStunTimer = 0;
  playerBlinkVisible = true;
  playerDodgeTimer = 0;
  playerAttackTimer = 0;
  playerAttackActiveDuration = 0;
  playerAttackSpeedMultiplier = 1;
  playerAttackQueued = false;
  playerSpecialAttack = null;
  playerHurtTimer = 0;
  playerKnockback.set(0, 0, 0);
  playerAttackLungeRemaining = 0;
  playerAttackTotalLunge = 0;
  playerInvulnerability = Math.max(playerInvulnerability, 0.28);
  levelDirector.exitLockTimer = LEVEL_EXIT_LOCK_TIME;
  if (marker) {
    playerRoot.position.copy(marker.position);
    playerRoot.position.y += ACTOR_GROUND_OFFSET;
    playerRoot.rotation.y = marker.rotation.y;
  } else {
    playerRoot.position.copy(playerStart);
    playerRoot.rotation.y = Math.PI;
  }
  snapActorToCombatSurface(playerRoot, { allowAnyHeight: true });
  lockRoomEntryExits(roomId);
  rememberPlayerSafePosition();
  combatCameraFocus.copy(playerRoot.position).add(COMBAT_CAMERA_TARGET_OFFSET);
  combatCameraLead.set(0, 0, 0);
  lastMoveDirection.set(Math.sin(playerRoot.rotation.y), 0, Math.cos(playerRoot.rotation.y));
}

function roomIdForLevel(level) {
  return roomDefinitions[Math.max(0, Math.min(roomDefinitions.length - 1, level - 1))]?.id
    ?? roomDefinitions[0]?.id
    ?? activeEditorRoomId;
}

function editableRootsForRoom(roomId = activeEditorRoomId) {
  return editableRoots.filter((root) => root.userData.roomId === roomId);
}

function setRoomRootVisibility(roomId) {
  editableRoots.forEach((root) => {
    const enemy = root.userData.combatEnemy;
    const available = !root.userData.combatDestructible?.destroyed && !root.userData.getragen && !root.userData.offen
      && (!gameMode || !enemy || (enemy.active && enemy.alive));
    const editorOnlyVisible = (!root.userData.systemMarker && !root.userData.fallZone)
      || (!gameMode && buildMode);
    root.visible = root.userData.roomId === roomId && available && editorOnlyVisible;
  });
  setElevationBoundaryVisibility(roomId);
}

function updateRoomControls() {
  roomSelect.replaceChildren();
  roomDefinitions.forEach((room) => {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = room.name;
    roomSelect.append(option);
  });
  roomSelect.value = activeEditorRoomId;
  roomCount.textContent = `${roomDefinitions.length} ${roomDefinitions.length === 1 ? 'Raum' : 'Raeume'}`;
  document.getElementById('room-delete').disabled = roomDefinitions.length <= 1;
  if (selectedRoot?.userData.systemMarker === 'exit') updateMarkerProperties(selectedRoot);
  syncQaControls();
}

function storeActiveRoomHistory() {
  if (!roomDefinition(activeEditorRoomId)) return;
  storeRoomHistoryState(roomHistoryStates, activeEditorRoomId, editorHistoryState);
}

function restoreRoomHistory(roomId) {
  editorHistoryState = restoreRoomHistoryState(
    roomHistoryStates,
    roomId,
    layoutPayload(collectLayout(roomId), roomWaves(roomId))
  );
  updateHistoryButtons();
}

function setEditorRoom(roomId, options = {}) {
  if (!roomDefinition(roomId)) return;
  if (options.storeCurrent !== false) storeActiveRoomHistory();
  selectRoot(null);
  removeGhost();
  activeEditorRoomId = roomId;
  activeEditorWaveId = roomWaves(roomId)[0]?.id ?? '';
  setRoomRootVisibility(roomId);
  restoreRoomHistory(roomId);
  updateRoomControls();
  if (buildMode && editorMode === 'place') createGhost();
  if (diagnosticsEnabled) rebuildDiagnostics();
  updateWaveEditor();
  setBuildStatus(`${roomDefinition(roomId).name} aktiv`);
}

function nextRoomId() {
  roomSequence += 1;
  return `raum-${Date.now().toString(36)}-${roomSequence}`;
}

function uniqueRoomName(baseName) {
  const names = new Set(roomDefinitions.map((room) => room.name.toLowerCase()));
  if (!names.has(baseName.toLowerCase())) return baseName;
  let suffix = 2;
  while (names.has(`${baseName} ${suffix}`.toLowerCase())) suffix += 1;
  return `${baseName} ${suffix}`;
}

function createEditorRoom(name, placements = [], waves = []) {
  const roomId = nextRoomId();
  const room = {
    id: roomId,
    name: uniqueRoomName(name),
    waves: normalizeRoomWaves(roomId, waves, placements)
  };
  const copiedPlacements = JSON.parse(JSON.stringify(placements));
  normalizePlacementWaveAssignments(copiedPlacements, room.waves);
  roomDefinitions.push(room);
  loadLayout(layoutPayload(copiedPlacements, room.waves), room.id);
  initialRoomLayouts.set(room.id, JSON.parse(JSON.stringify(copiedPlacements)));
  initialRoomWaves.set(room.id, cloneRoomWaves(room.waves));
  storeRoomHistoryState(
    roomHistoryStates,
    room.id,
    createEditorHistoryState(layoutPayload(copiedPlacements, room.waves))
  );
  setEditorRoom(room.id);
  persistRoomLibrary();
  return room;
}

function deleteActiveEditorRoom() {
  if (roomDefinitions.length <= 1) return;
  const currentIndex = roomDefinitions.findIndex((room) => room.id === activeEditorRoomId);
  const removed = roomDefinitions[currentIndex];
  editableRootsForRoom(removed.id).slice().forEach(removeRoot);
  roomDefinitions.splice(currentIndex, 1);
  editableRoots.filter((root) => root.userData.systemMarker === 'exit'
    && root.userData.placement.settings?.targetRoomId === removed.id)
    .forEach((root) => {
      root.userData.placement.settings.targetRoomId = roomDefinitions.find((room) => room.id !== root.userData.roomId)?.id
        ?? root.userData.roomId;
    });
  deleteRoomHistoryState(roomHistoryStates, removed.id);
  initialRoomLayouts.delete(removed.id);
  initialRoomWaves.delete(removed.id);
  const next = roomDefinitions[Math.min(currentIndex, roomDefinitions.length - 1)];
  setEditorRoom(next.id, { storeCurrent: false });
  persistRoomLibrary();
  setBuildStatus(`${removed.name} geloescht`);
}

function populateAssetSelect() {
  ASSET_GROUPS.forEach(([groupLabel, names]) => {
    const group = document.createElement('optgroup');
    group.label = groupLabel;
    names.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = assetLabels[name] ?? name;
      group.append(option);
    });
    assetSelect.append(group);
  });
  assetSelect.value = selectedAsset;
}

function createBuildGrid() {
  gridHelper = new THREE.GridHelper(CELL * 32, 32, '#e7c56c', '#72958b');
  gridHelper.position.y = 0.035;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.34;
  gridHelper.material.depthWrite = false;
  scene.add(gridHelper);
}

function diagnosticsObjectVisible(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function clearDiagnostics() {
  diagnosticBindings.length = 0;
  diagnosticRayLine = null;
  diagnosticsGroup.traverse((child) => {
    if (child === diagnosticsGroup) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => material.dispose());
  });
  diagnosticsGroup.clear();
}

function diagnosticMaterial(color, opacity = 0.58, wireframe = false) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    wireframe,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}

function addDiagnosticRing(target, radius, color, opacity = 0.52, yOffset = 0.055) {
  const thickness = Math.max(0.018, Math.min(0.055, radius * 0.025));
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(0.01, radius - thickness), radius + thickness, 64),
    diagnosticMaterial(color, opacity)
  );
  ring.rotation.x = -Math.PI * 0.5;
  ring.renderOrder = 120;
  diagnosticsGroup.add(ring);
  diagnosticBindings.push({ object: ring, target, yOffset, type: 'follow' });
  return ring;
}

function addDiagnosticCollision(root) {
  const compact = ['barrel', 'chest', 'rocks', 'column'].includes(root.userData.assetName);
  const collisionScale = THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
  const half = (compact ? CELL * 0.28 : CELL * 0.43) * collisionScale;
  const height = Math.max(CELL * 0.16, Number(root.userData.modelHeight) || CELL * 0.82);
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(half * 2, height, half * 2));
  const box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: '#42dcff',
    transparent: true,
    opacity: 0.78,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  }));
  box.renderOrder = 121;
  diagnosticsGroup.add(box);
  diagnosticBindings.push({ object: box, target: root, yOffset: height * 0.5, type: 'follow' });
}

function addDiagnosticStairFlanks(root) {
  const scale = THREE.MathUtils.clamp(Number(root.userData.placement?.scale) || 1, 0.35, 3);
  const halfWidth = STAIR_WALKABLE_HALF_WIDTH * scale;
  const halfThickness = STAIR_FLANK_HALF_THICKNESS * scale;
  const halfLength = STAIR_COLLISION_HALF_LENGTH * scale;
  const centerX = halfWidth + halfThickness;
  const height = LEVEL_HEIGHT + 0.16;
  const group = new THREE.Group();

  [-1, 1].forEach((side) => {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(
      halfThickness * 2,
      height,
      halfLength * 2
    ));
    const box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: '#66f0ff',
      transparent: true,
      opacity: 0.88,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    }));
    box.position.set(side * centerX, height * 0.5 - 0.04, 0);
    box.renderOrder = 123;
    group.add(box);
  });

  diagnosticsGroup.add(group);
  diagnosticBindings.push({ object: group, target: root, yOffset: 0, type: 'oriented-follow' });
}

function addDiagnosticElevationBoundary(barrier) {
  const height = Math.max(0.05, barrier.maxY - barrier.minY);
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(
    barrier.halfX * 2,
    height,
    barrier.halfZ * 2
  ));
  const box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: '#7be7ff',
    transparent: true,
    opacity: 0.74,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  }));
  box.position.set(barrier.x, barrier.minY + height * 0.5, barrier.z);
  box.renderOrder = 121;
  diagnosticsGroup.add(box);
}

function addDiagnosticLight(light) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(light.distance, 18, 9),
    diagnosticMaterial('#ffad42', 0.055, true)
  );
  sphere.renderOrder = 118;
  diagnosticsGroup.add(sphere);
  diagnosticBindings.push({ object: sphere, target: light, yOffset: 0, type: 'follow' });

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(Math.min(0.16, light.distance * 0.04), 10, 6),
    diagnosticMaterial('#ffd27a', 0.82)
  );
  center.renderOrder = 122;
  diagnosticsGroup.add(center);
  diagnosticBindings.push({ object: center, target: light, yOffset: 0, type: 'follow' });
}

function addDiagnosticGroundLine(z, color) {
  const maxX = CELL * 6.35;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-maxX, 0.07, z),
    new THREE.Vector3(maxX, 0.07, z)
  ]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  }));
  line.renderOrder = 123;
  diagnosticsGroup.add(line);
}

function rebuildDiagnostics() {
  clearDiagnostics();
  if (!diagnosticsEnabled) return;

  editableRootsForRoom().forEach((root) => {
    if (root.visible && SOLID_ASSETS.has(root.userData.assetName)) addDiagnosticCollision(root);
    if (root.visible && root.userData.assetName === 'stairs') addDiagnosticStairFlanks(root);
    if (root.visible && root.userData.combatTrap) {
      const settings = normalizedTrapSettings(root);
      addDiagnosticRing(root, settings.radius, '#ff5138', 0.58, 0.075);
    }
    if (root.visible && ['combat-trigger', 'exit'].includes(root.userData.systemMarker)) {
      const radius = Number(root.userData.placement.settings?.radius) || CELL * 0.7;
      addDiagnosticRing(root, radius, root.userData.systemMarker === 'exit' ? '#54d8ff' : '#ff657a', 0.48, 0.09);
    }
  });
  elevationBarriers
    .filter((barrier) => barrier.roomId === activeEditorRoomId && barrier.visual.visible)
    .forEach(addDiagnosticElevationBoundary);

  if (playerRoot) {
    addDiagnosticRing(playerRoot, PLAYER_BODY_RADIUS, '#ffe36e', 0.84);
    addDiagnosticRing(playerRoot, Math.max(...PLAYER_ATTACKS.map((attack) => attack.range)), '#ffb14a', 0.42, 0.065);
    addDiagnosticRing(playerRoot, COIN_MAGNET_RADIUS * runProgress.magnetRadiusMultiplier, '#55e6d2', 0.18, 0.075);
  }

  combatEnemies.forEach((enemy) => {
    if (!enemy.root.visible) return;
    addDiagnosticRing(enemy.root, enemy.bodyRadius, enemy.isBoss ? '#ff3f85' : '#ff5f6d', 0.84);
    if (enemy.isBoss) {
      addDiagnosticRing(enemy.root, BOSS_CHARGE_HIT_RANGE, '#ff3f32', 0.42, 0.07);
      addDiagnosticRing(enemy.root, BOSS_STOMP_RADIUS, '#ff9d32', 0.32, 0.075);
    } else if (enemy.attackType === 'ranged') {
      addDiagnosticRing(enemy.root, ENEMY_RANGED_RETREAT_RANGE, '#d56bff', 0.26, 0.07);
      addDiagnosticRing(enemy.root, ENEMY_RANGED_PREFERRED_RANGE, '#d56bff', 0.38, 0.075);
      addDiagnosticRing(enemy.root, ENEMY_RANGED_ATTACK_RANGE, '#d56bff', 0.2, 0.08);
    } else {
      addDiagnosticRing(enemy.root, enemyMeleeTriggerRange(), '#ff657a', 0.38, 0.07);
    }
  });

  scene.traverse((object) => {
    if (object.isPointLight && object.distance > 0 && object.intensity > 0.01
      && diagnosticsObjectVisible(object)) addDiagnosticLight(object);
  });

  if (!systemMarkersForRoom(activeEditorRoomId, 'combat-trigger').length) {
    addDiagnosticGroundLine(ARENA_TRIGGER_Z, '#6dff8c');
  }
  addDiagnosticGroundLine(ARENA_GATE_Z, '#ffcf54');

  if (selectedRoot) {
    const axes = new THREE.AxesHelper(CELL * 0.7);
    axes.renderOrder = 124;
    axes.material.depthTest = false;
    axes.material.transparent = true;
    axes.material.opacity = 0.9;
    diagnosticsGroup.add(axes);
    diagnosticBindings.push({ object: axes, target: selectedRoot, yOffset: 0.08, type: 'axes' });
  }

  diagnosticRayLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({
      color: '#f7f1ff',
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    })
  );
  diagnosticRayLine.visible = false;
  diagnosticRayLine.renderOrder = 125;
  diagnosticsGroup.add(diagnosticRayLine);
  updateDiagnostics();
}

function updateDiagnostics() {
  diagnosticsGroup.visible = diagnosticsEnabled && buildMode && !gameMode;
  if (!diagnosticsGroup.visible) return;
  const worldPosition = new THREE.Vector3();
  diagnosticBindings.forEach((binding) => {
    const visible = diagnosticsObjectVisible(binding.target);
    binding.object.visible = visible;
    if (!visible) return;
    binding.target.getWorldPosition(worldPosition);
    binding.object.position.copy(worldPosition);
    binding.object.position.y += binding.yOffset;
    if (binding.type === 'axes' || binding.type === 'oriented-follow') {
      binding.object.rotation.copy(binding.target.rotation);
    }
  });
}

function updateDiagnosticRay() {
  if (!diagnosticRayLine || !diagnosticsGroup.visible) return;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(currentLayer * LEVEL_HEIGHT));
  const end = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, end)) {
    diagnosticRayLine.visible = false;
    return;
  }
  diagnosticRayLine.geometry.setFromPoints([raycaster.ray.origin, end]);
  diagnosticRayLine.visible = true;
}

function setDiagnosticsEnabled(enabled) {
  diagnosticsEnabled = enabled;
  diagnosticsToggle.setAttribute('aria-pressed', String(enabled));
  diagnosticsLegend.hidden = !enabled;
  rebuildDiagnostics();
  diagnosticsGroup.visible = enabled && buildMode && !gameMode;
  setBuildStatus(enabled
    ? 'Diagnose aktiv: Kollision, Reichweite, Licht und Trigger'
    : 'Diagnoseansicht ausgeschaltet');
}

function setBuildStatus(message) {
  buildStatus.textContent = message;
}

function setLayer(nextLayer, moveSelection = false) {
  currentLayer = Math.max(-3, Math.min(8, nextLayer));
  layerOutput.value = String(currentLayer);
  layerOutput.textContent = String(currentLayer);
  if (gridHelper) gridHelper.position.y = currentLayer * LEVEL_HEIGHT + 0.035;
  if (ghostRoot) ghostRoot.position.y = currentLayer * LEVEL_HEIGHT;
  if (moveSelection && selectedRoot) {
    selectedRoot.position.y = currentLayer * LEVEL_HEIGHT;
    selectedRoot.userData.placement.y = selectedRoot.position.y;
    syncCombatEnemySpawn(selectedRoot);
    selectionHelper?.update();
    recordHistory('Ebene geaendert');
  }
}

function removeGhost() {
  if (!ghostRoot) return;
  scene.remove(ghostRoot);
  ghostRoot = null;
}

function createGhost() {
  removeGhost();
  const definition = BUILD_ASSET_DEFINITIONS[selectedAsset];
  const available = Boolean(definition?.marker) || assets.has(buildAssetModelName(selectedAsset));
  if (!buildMode || editorMode !== 'place' || !available) return;
  ghostRoot = spawnBuildAsset(selectedAsset, 0, 0, currentLayer * LEVEL_HEIGHT, {
    rotation: placementRotation,
    ghost: true
  });
  ghostRoot.visible = false;
}

function updateGhost(event) {
  if (!ghostRoot || !buildMode || editorMode !== 'place') return;
  const point = pointOnBuildPlane(event);
  if (!point) {
    ghostRoot.visible = false;
    return;
  }
  const snapped = snapPoint(point);
  ghostRoot.visible = true;
  ghostRoot.position.set(snapped.x * CELL, snapped.y, snapped.z * CELL);
  ghostRoot.userData.placement.x = snapped.x;
  ghostRoot.userData.placement.z = snapped.z;
  ghostRoot.userData.placement.y = snapped.y;
}

function markerTypeLabel(type) {
  return {
    'player-start': 'Spielerstart',
    'combat-trigger': 'Kampftrigger',
    exit: 'Ausgang',
    arrival: 'Ankunft',
    druckplatte: 'Druckplatte',
    schloss: 'Signalschloss'
  }[type] ?? 'Marker';
}

const CHEST_DROP_TYPES = new Set(CHEST_DROP_TYPE_IDS);

function normalizedChestDrop(root) {
  const settings = root?.userData.placement?.settings ?? {};
  return applyNormalizedChestDrop(settings);
}

function transformOutput(input, value) {
  const output = input.parentElement.querySelector('output');
  if (!output) return;
  if (input === transformRotation) output.textContent = `${Math.round(value)}°`;
  else output.textContent = Number(value).toFixed(2);
}

function updateObjectTransform(root) {
  const placement = root?.userData.placement;
  objectTransform.hidden = !placement;
  if (!placement) return;

  placement.offsetX = THREE.MathUtils.clamp(Number(placement.offsetX) || 0, -0.5, 0.5);
  placement.offsetZ = THREE.MathUtils.clamp(Number(placement.offsetZ) || 0, -0.5, 0.5);
  placement.scale = THREE.MathUtils.clamp(Number(placement.scale) || 1, 0.35, 3);
  const degrees = THREE.MathUtils.radToDeg(Number(placement.rotation) || 0);
  const normalizedDegrees = THREE.MathUtils.euclideanModulo(degrees + 180, 360) - 180;

  transformObjectName.textContent = root.userData.label;
  transformOffsetX.value = String(placement.offsetX);
  transformOffsetZ.value = String(placement.offsetZ);
  transformRotation.value = String(normalizedDegrees);
  transformScale.value = String(placement.scale);
  transformOutput(transformOffsetX, placement.offsetX);
  transformOutput(transformOffsetZ, placement.offsetZ);
  transformOutput(transformRotation, normalizedDegrees);
  transformOutput(transformScale, placement.scale);
}

function previewSelectedObjectTransform() {
  const root = selectedRoot;
  const placement = root?.userData.placement;
  if (!placement) return false;

  placement.offsetX = THREE.MathUtils.clamp(Number(transformOffsetX.value) || 0, -0.5, 0.5);
  placement.offsetZ = THREE.MathUtils.clamp(Number(transformOffsetZ.value) || 0, -0.5, 0.5);
  placement.rotation = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(Number(transformRotation.value) || 0, -180, 180)
  );
  placement.scale = THREE.MathUtils.clamp(Number(transformScale.value) || 1, 0.35, 3);

  root.position.x = (placement.x + placement.offsetX) * CELL;
  root.position.z = (placement.z + placement.offsetZ) * CELL;
  root.rotation.y = placement.rotation;
  const frameScale = (Number(root.userData.baseModelScale) || 1) * placement.scale;
  root.userData.frame?.scale.setScalar(frameScale);
  if (Number.isFinite(root.userData.baseModelHeight)) {
    root.userData.modelHeight = root.userData.baseModelHeight * placement.scale;
  }
  if (root.userData.combatDestructible) {
    root.userData.combatDestructible.baseScale.copy(root.userData.frame.scale);
  }
  if (root.userData.combatEnemy) {
    const enemy = root.userData.combatEnemy;
    const relativeScale = placement.scale / Math.max(0.01, enemy.basePlacementScale || 1);
    enemy.bodyRadius = enemy.baseBodyRadius * relativeScale;
  }
  placementRotation = placement.rotation;
  syncCombatEnemySpawn(root);
  selectionHelper?.update();
  updateObjectTransform(root);
  combatNavigationGraph = null;
  return true;
}

function resetSelectedObjectTransform() {
  if (!selectedRoot?.userData.placement) return;
  transformOffsetX.value = '0';
  transformOffsetZ.value = '0';
  transformRotation.value = '0';
  transformScale.value = String(BUILD_ASSET_DEFINITIONS[selectedRoot.userData.assetName]?.scale ?? 1);
  if (!previewSelectedObjectTransform()) return;
  recordHistory('Objekt zentriert');
}

function updateMarkerProperties(root) {
  const type = root?.userData.systemMarker;
  const isChest = root?.userData.assetName === 'chest';
  const isTrap = root?.userData.assetName === 'trap';
  const istPlatteModell = root?.userData.assetName === DRUCKPLATTE_ASSET;
  const isEnemy = Boolean(root?.userData.combatEnemy);
  const settings = root?.userData.placement?.settings ?? {};
  markerProperties.hidden = !type && !isChest && !isTrap && !isEnemy && !istPlatteModell;
  rewardChestField.hidden = !isChest;
  chestDropSettings.hidden = !isChest;
  trapSettingsField.hidden = !isTrap;
  enemyWaveSettings.hidden = !isEnemy;
  markerTargetField.hidden = true;
  markerConditionField.hidden = true;
  markerRadiusField.hidden = true;
  markerSignalField.hidden = true;
  markerModusField.hidden = true;
  markerGewichtField.hidden = true;
  markerWirkungField.hidden = true;
  if (!type && !isChest && !isTrap && !isEnemy && !istPlatteModell) return;

  if (istPlatteModell) {
    const werte = plattenEinstellungen(root);
    markerKind.textContent = 'Druckplatte';
    markerSignalField.hidden = false;
    markerModusField.hidden = false;
    markerGewichtField.hidden = false;
    markerRadiusField.hidden = false;
    markerSignal.value = werte.signal;
    markerModus.value = werte.modus;
    markerGewicht.value = String(werte.gewicht);
    markerRadius.value = String(Number(werte.radius.toFixed(2)));
    return;
  }

  if (isChest) {
    const drop = normalizedChestDrop(root);
    markerKind.textContent = 'Truhe';
    rewardChestToggle.checked = Boolean(settings.rewardChest);
    chestDropType.value = drop.type;
    chestDropAmount.value = String(drop.amount);
    chestDropAmountField.hidden = drop.type !== 'coins';
    return;
  }
  if (isTrap) {
    const trapSettings = normalizedTrapSettings(root);
    markerKind.textContent = 'Bodenfalle';
    trapDamageInput.value = String(trapSettings.damage);
    trapTargetsInput.value = trapSettings.targets;
    trapRadiusInput.value = String(Number(trapSettings.radius.toFixed(2)));
    trapWarningInput.value = String(Number(trapSettings.warning.toFixed(2)));
    trapCooldownInput.value = String(Number(trapSettings.cooldown.toFixed(2)));
    return;
  }
  if (isEnemy) {
    markerKind.textContent = root.userData.combatEnemy.isBoss ? 'Bossgegner - 3 Phasen' : 'Raumgegner';
    updateEnemyWaveOptions(root);
    return;
  }

  markerKind.textContent = markerTypeLabel(type);
  const isExit = type === 'exit';
  const istPlatte = type === 'druckplatte';
  const istSchloss = type === 'schloss';
  const hasRadius = isExit || type === 'combat-trigger' || istPlatte || istSchloss;
  markerTargetField.hidden = !isExit;
  markerConditionField.hidden = !isExit;
  markerRadiusField.hidden = !hasRadius;
  // Der Signalname gilt fuer Geber, Nehmer und einen Ausgang, der darauf horcht.
  markerSignalField.hidden = !(istPlatte || istSchloss || (isExit && settings.condition === 'signal'));
  markerModusField.hidden = !istPlatte;
  markerGewichtField.hidden = !istPlatte;
  markerWirkungField.hidden = !istSchloss;
  if (!markerSignalField.hidden) markerSignal.value = String(settings.signal ?? '');
  if (istPlatte) {
    markerModus.value = settings.modus === 'rasten' ? 'rasten' : 'halten';
    markerGewicht.value = String(THREE.MathUtils.clamp(Math.round(Number(settings.gewicht) || 1), 1, 4));
  }
  if (istSchloss) markerWirkung.value = settings.wirkung === 'schliessen' ? 'schliessen' : 'oeffnen';

  if (isExit) {
    markerTargetRoom.replaceChildren();
    roomDefinitions.filter((room) => room.id !== root.userData.roomId).forEach((room) => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = room.name;
      markerTargetRoom.append(option);
    });
    if (!markerTargetRoom.options.length) {
      const option = document.createElement('option');
      option.value = root.userData.roomId;
      option.textContent = roomDefinition(root.userData.roomId)?.name ?? 'Aktueller Raum';
      markerTargetRoom.append(option);
    }
    if (![...markerTargetRoom.options].some((option) => option.value === settings.targetRoomId)) {
      settings.targetRoomId = markerTargetRoom.options[0]?.value ?? root.userData.roomId;
    }
    markerTargetRoom.value = settings.targetRoomId;
    markerCondition.value = ['always', 'signal'].includes(settings.condition) ? settings.condition : 'clear';
  }
  if (hasRadius) markerRadius.value = String(Number(settings.radius) || CELL * 0.7);
}

function updateSelectedMarkerSetting(key, value, message) {
  if (!selectedRoot?.userData.systemMarker) return;
  selectedRoot.userData.placement.settings[key] = value;
  updateMarkerProperties(selectedRoot);
  recordHistory(message);
}

function updateSelectedTrapSetting(key, value, message) {
  if (!previewSelectedTrapSetting(key, value)) return;
  updateMarkerProperties(selectedRoot);
  recordHistory(message);
}

function previewSelectedTrapSetting(key, value) {
  if (selectedRoot?.userData.assetName !== 'trap') return;
  selectedRoot.userData.placement.settings[key] = value;
  normalizedTrapSettings(selectedRoot);
  syncCombatTrapSettings(selectedRoot);
  return true;
}

function selectRoot(root) {
  selectedRoot = root?.userData.editable ? root : null;
  if (selectionHelper) {
    scene.remove(selectionHelper);
    selectionHelper.geometry.dispose();
    selectionHelper.material.dispose();
    selectionHelper = null;
  }
  if (!selectedRoot) {
    selectedName.textContent = 'Kein Objekt ausgewaehlt';
    selectedDetail.textContent = 'Setzen, bewegen oder loeschen';
    updateMarkerProperties(null);
    updateObjectTransform(null);
    if (diagnosticsEnabled) rebuildDiagnostics();
    return;
  }
  selectionHelper = new THREE.BoxHelper(selectedRoot, '#e7c56c');
  selectionHelper.material.depthTest = false;
  selectionHelper.renderOrder = 100;
  scene.add(selectionHelper);
  selectedName.textContent = selectedRoot.userData.label;
  selectedDetail.textContent = `${selectedRoot.userData.detail} - Ebene ${Math.round(selectedRoot.position.y / LEVEL_HEIGHT)}`;
  selectedAsset = selectedRoot.userData.assetName;
  assetSelect.value = selectedAsset;
  if (activeEditorView === 'waves' && selectedRoot.userData.combatEnemy) {
    activeEditorWaveId = enemyWaveId(selectedRoot);
  }
  updateMarkerProperties(selectedRoot);
  updateObjectTransform(selectedRoot);
  placementRotation = selectedRoot.rotation.y;
  setLayer(Math.round(selectedRoot.position.y / LEVEL_HEIGHT));
  if (activeEditorView === 'waves') updateWaveEditor();
  if (diagnosticsEnabled) rebuildDiagnostics();
}

function removeFromArray(items, value) {
  const index = items.indexOf(value);
  if (index >= 0) items.splice(index, 1);
}

function removeRoot(root) {
  if (!root?.userData.editable) return false;
  const removedEnemy = Boolean(root.userData.combatEnemy);
  if (selectedRoot === root) selectRoot(null);
  if (root === rewardChest) {
    restoreRewardChestPresentation();
    rewardChest = null;
    if (chestBeacon) chestBeacon.visible = false;
  }
  unregisterCombatEnemy(root);
  unregisterCombatDestructible(root);
  unregisterCombatTrap(root);
  root.userData.mixer?.stopAllAction();
  removeFromArray(mixers, root.userData.mixer);
  removeFromArray(pickableRoots, root);
  removeFromArray(editableRoots, root);
  scene.remove(root);
  root.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
  });
  if (removedEnemy && !gameMode) updateWaveEditor();
  return true;
}

function updateRootPlacement(root, snapped) {
  const placement = root.userData.placement;
  const offsetX = Number(placement.offsetX) || 0;
  const offsetZ = Number(placement.offsetZ) || 0;
  root.position.set((snapped.x + offsetX) * CELL, snapped.y, (snapped.z + offsetZ) * CELL);
  placement.x = snapped.x;
  placement.z = snapped.z;
  placement.y = snapped.y;
  syncCombatEnemySpawn(root);
  selectionHelper?.update();
}

function syncCombatEnemySpawn(root) {
  const enemy = root?.userData.combatEnemy;
  if (!enemy) return;
  enemy.roomOneSpawn.copy(root.position);
  enemy.roomOneRotation = root.rotation.y;
  enemy.spawn.copy(root.position);
  enemy.spawnRotation = root.rotation.y;
}

function placeSelectedAsset(event) {
  const point = pointOnBuildPlane(event);
  if (!point) return;
  const snapped = snapPoint(point);
  const definition = BUILD_ASSET_DEFINITIONS[selectedAsset];
  if (definition?.marker?.unique) {
    const existing = editableRootsForRoom().find((root) => root.userData.assetName === selectedAsset);
    if (existing) {
      updateRootPlacement(existing, snapped);
      existing.rotation.y = placementRotation;
      existing.userData.placement.rotation = placementRotation;
      selectRoot(existing);
      recordHistory(`${assetLabels[selectedAsset]} verschoben`);
      return;
    }
  }
  const duplicate = editableRootsForRoom().some((root) => {
    const placement = root.userData.placement;
    return placement.name === selectedAsset
      && placement.x === snapped.x
      && placement.z === snapped.z
      && Math.abs(placement.y - snapped.y) < 0.001;
  });
  if (duplicate) {
    setBuildStatus('Dieses Asset steht bereits auf dem Feld');
    return;
  }
  const root = spawnBuildAsset(selectedAsset, snapped.x, snapped.z, snapped.y, {
    rotation: placementRotation,
    animation: selectedAsset.startsWith('character-') ? 'idle' : undefined,
    settings: definition?.enemy ? { waveId: activeEditorWave()?.id, spawnDelay: 0 } : undefined
  });
  selectRoot(root);
  if (definition?.enemy) updateWaveEditor();
  recordHistory(`${assetLabels[selectedAsset] ?? selectedAsset} gesetzt`);
}

function rotateActive(direction) {
  const step = direction * Math.PI * 0.5;
  if (selectedRoot && editorMode === 'select') {
    selectedRoot.rotation.y += step;
    selectedRoot.userData.placement.rotation = selectedRoot.rotation.y;
    syncCombatEnemySpawn(selectedRoot);
    placementRotation = selectedRoot.rotation.y;
    selectionHelper?.update();
    updateObjectTransform(selectedRoot);
    recordHistory('Objekt gedreht');
    return;
  }
  placementRotation += step;
  if (ghostRoot) {
    ghostRoot.rotation.y = placementRotation;
    ghostRoot.userData.placement.rotation = placementRotation;
  }
}

function collectLayout(roomId = activeEditorRoomId) {
  return editableRootsForRoom(roomId).map((root) => ({ ...root.userData.placement }));
}

function layoutPayload(placements = collectLayout(), waves = roomWaves()) {
  return createRoomLayoutPayload({
    placements,
    waves,
    grid: ROOM_GRID_SIZE
  });
}

function roomLibraryPayload() {
  return createRoomLibraryPayload({
    activeRoomId: activeEditorRoomId,
    rooms: roomDefinitions.map((room) => ({
      id: room.id,
      name: room.name,
      waves: cloneRoomWaves(room.waves),
      placements: collectLayout(room.id)
    })),
    grid: ROOM_GRID_SIZE
  });
}

function persistRoomLibrary() {
  persistence.saveRoomLibrary(roomLibraryPayload());
}

function loadStoredRoomLibrary() {
  return persistence.loadRoomLibrary(loadRoomLibrary);
}

function loadLayout(payload, roomId = activeEditorRoomId) {
  if (!payload || ![1, 2].includes(payload.version) || !Array.isArray(payload.placements)) {
    throw new Error('Unbekanntes Aethoria-Layout');
  }
  if (payload.version >= 2 && Array.isArray(payload.waves)) {
    const room = roomDefinition(roomId);
    if (room) room.waves = normalizeRoomWaves(roomId, payload.waves, payload.placements);
  }
  const waves = roomWaves(roomId);
  const placements = JSON.parse(JSON.stringify(payload.placements));
  normalizePlacementWaveAssignments(placements, waves);
  selectRoot(null);
  editableRootsForRoom(roomId).slice().forEach(removeRoot);
  placements.forEach((placement) => {
    if (placement?.settings?.equipmentPickup) return;
    if (!isKnownBuildAsset(placement.name)) return;
    const x = Number(placement.x);
    const z = Number(placement.z);
    const y = Number(placement.y);
    if (![x, z, y].every(Number.isFinite)) return;
    spawnBuildAsset(placement.name, x, z, y, {
      offsetX: Number(placement.offsetX) || 0,
      offsetZ: Number(placement.offsetZ) || 0,
      rotation: Number(placement.rotation) || 0,
      scale: Number(placement.scale) || 1,
      label: placement.label ?? undefined,
      detail: placement.detail ?? undefined,
      animation: placement.animation ?? undefined,
      settings: placement.settings ?? undefined,
      roomId
    });
  });
  rebuildElevationBoundaries();
  setRoomRootVisibility(gameMode ? roomIdForLevel(levelDirector.room) : activeEditorRoomId);
  if (!gameMode) updateWaveEditor();
  if (diagnosticsEnabled) rebuildDiagnostics();
}

function loadRoomLibrary(payload) {
  if (payload?.version === 1) {
    loadLayout(payload, activeEditorRoomId);
    return;
  }
  if (!payload || ![2, ROOM_LIBRARY_VERSION].includes(payload.version)
    || !Array.isArray(payload.rooms) || !payload.rooms.length) {
    throw new Error('Unbekannte Wachtbruch-Raumsammlung');
  }

  const roomCandidates = JSON.parse(JSON.stringify(payload.rooms));
  const storedRoomIds = new Set(roomCandidates.map((room) => String(room?.id ?? '')));
  createDefaultRoomDefinitions().forEach((room) => {
    if (storedRoomIds.has(room.id) || !initialRoomLayouts.has(room.id)) return;
    roomCandidates.push({
      id: room.id,
      name: room.name,
      waves: cloneRoomWaves(initialRoomWaves.get(room.id) ?? room.waves),
      placements: JSON.parse(JSON.stringify(initialRoomLayouts.get(room.id)))
    });
  });

  selectRoot(null);
  removeGhost();
  editableRoots.slice().forEach(removeRoot);
  roomOneSceneryRoots.length = 0;
  roomTwoSceneryRoots.length = 0;
  roomDefinitions = [];
  clearRoomHistoryStore(roomHistoryStates);
  initialRoomLayouts.clear();
  initialRoomWaves.clear();

  const usedIds = new Set();
  roomCandidates.forEach((candidate, index) => {
    const fallbackId = `raum-import-${index + 1}`;
    let id = String(candidate?.id || fallbackId).replace(/[^a-zA-Z0-9_-]/g, '-');
    if (!id || usedIds.has(id)) id = `${fallbackId}-${index + 1}`;
    usedIds.add(id);
    const name = String(candidate?.name || `Raum ${index + 1}`).trim() || `Raum ${index + 1}`;
    const placements = JSON.parse(JSON.stringify(Array.isArray(candidate?.placements) ? candidate.placements : []));
    const waves = normalizeRoomWaves(id, candidate?.waves, placements);
    normalizePlacementWaveAssignments(placements, waves);
    roomDefinitions.push({ id, name, waves });
    loadLayout(layoutPayload(placements, waves), id);
    initialRoomLayouts.set(id, JSON.parse(JSON.stringify(collectLayout(id))));
    initialRoomWaves.set(id, cloneRoomWaves(waves));
  });

  const requestedRoom = String(payload.activeRoomId ?? '');
  const nextRoomId = roomDefinition(requestedRoom)?.id ?? roomDefinitions[0].id;
  activeEditorRoomId = nextRoomId;
  setEditorRoom(nextRoomId, { storeCurrent: false });
}

function updateHistoryButtons() {
  undoButton.disabled = !canUndoEditorHistory(editorHistoryState);
  redoButton.disabled = !canRedoEditorHistory(editorHistoryState);
}

function recordHistory(message) {
  rebuildElevationBoundaries();
  const result = pushEditorSnapshot(editorHistoryState, layoutPayload());
  if (!result.changed) {
    if (diagnosticsEnabled) rebuildDiagnostics();
    updateHistoryButtons();
    return;
  }
  editorHistoryState = result.state;
  storeRoomHistoryState(roomHistoryStates, activeEditorRoomId, editorHistoryState);
  persistRoomLibrary();
  if (diagnosticsEnabled) rebuildDiagnostics();
  updateHistoryButtons();
  setBuildStatus(message);
}

function restoreHistory(nextIndex) {
  const result = moveEditorHistory(editorHistoryState, nextIndex);
  if (!result.changed) return;
  editorHistoryState = result.state;
  loadLayout(result.snapshot, activeEditorRoomId);
  storeRoomHistoryState(roomHistoryStates, activeEditorRoomId, editorHistoryState);
  persistRoomLibrary();
  updateHistoryButtons();
  setBuildStatus(result.direction === 'redo' ? 'Wiederholt' : 'Rueckgaengig');
}

function resetActiveRoomHistory(message) {
  editorHistoryState = createEditorHistoryState(layoutPayload());
  storeRoomHistoryState(roomHistoryStates, activeEditorRoomId, editorHistoryState);
  persistRoomLibrary();
  updateHistoryButtons();
  setBuildStatus(message);
}

function setEditorMode(mode) {
  editorMode = mode;
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === editorMode));
  });
  selectRoot(null);
  if (editorMode === 'place') createGhost();
  else removeGhost();
  setBuildStatus(editorMode === 'place' ? 'Bereit zum Setzen' : editorMode === 'select' ? 'Objekt waehlen und ziehen' : 'Objekt zum Loeschen waehlen');
}

function setBuildMode(enabled) {
  buildMode = Boolean(enabled && developerMode?.enabled);
  if (buildMode) controls.autoRotate = false;
  buildPanel.hidden = !buildMode;
  buildToggle.setAttribute('aria-pressed', String(buildMode));
  document.body.classList.toggle('build-open', buildMode);
  setRoomRootVisibility(buildMode ? activeEditorRoomId : roomIdForLevel(levelDirector.room));
  if (gridHelper) gridHelper.visible = buildMode && document.getElementById('grid-toggle').getAttribute('aria-pressed') === 'true';
  if (buildMode && editorMode === 'place') createGhost();
  else removeGhost();
  if (!buildMode) {
    selectRoot(null);
    clearWavePreview();
  } else if (activeEditorView === 'waves') {
    rebuildWavePreview();
  }
  updateDiagnostics();
}

function downloadJsonFile(filename, payload) {
  const data = JSON.stringify(payload, null, 2);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadLayout() {
  downloadJsonFile('wachtbruch-raeume.json', roomLibraryPayload());
  setBuildStatus('Raumsammlung exportiert');
}

function onCanvasPointerDown(event) {
  if (gameMode && event.button === 2) {
    event.preventDefault();
    setPlayerShielding(true);
    return;
  }
  controls.autoRotate = false;
  cameraWasMoved = true;
  pointerDownPosition = { x: event.clientX, y: event.clientY };
  if (gameMode && event.button === 0) {
    beginPlayerAttackInput();
    return;
  }
  if (!buildMode || editorMode !== 'select') return;
  const root = pickRoot(event, true);
  if (!root) return;
  selectRoot(root);
  dragRoot = root;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
}

function onCanvasPointerMove(event) {
  if (gameMode && pointerDownPosition && playerAttackInputHeld
    && Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y) > 5) {
    cancelPlayerAttackCharge();
  }
  if (!buildMode) return;
  if (dragRoot) {
    const point = pointOnBuildPlane(event);
    if (point) updateRootPlacement(dragRoot, snapPoint(point));
    return;
  }
  updateGhost(event);
}

function onCanvasPointerUp(event) {
  if (gameMode && event.button === 2) {
    event.preventDefault();
    setPlayerShielding(false);
    return;
  }
  const moved = pointerDownPosition
    ? Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y) > 5
    : false;
  pointerDownPosition = null;

  if (gameMode && event.button === 0) {
    if (moved) {
      cancelPlayerAttackCharge();
      return;
    }
    releasePlayerAttackInput();
    return;
  }
  if (dragRoot) {
    dragRoot = null;
    controls.enabled = true;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    recordHistory('Objekt verschoben');
    return;
  }
  if (moved) return;
  if (!buildMode) {
    pickModel(event);
    return;
  }
  if (editorMode === 'place') {
    placeSelectedAsset(event);
    return;
  }
  const root = pickRoot(event, true);
  if (editorMode === 'select') selectRoot(root);
  if (editorMode === 'erase' && removeRoot(root)) recordHistory('Objekt geloescht');
}

function updateCombatStick(event) {
  const rect = combatStick.getBoundingClientRect();
  const maxDistance = 34;
  let dx = event.clientX - (rect.left + rect.width * 0.5);
  let dy = event.clientY - (rect.top + rect.height * 0.5);
  const distance = Math.hypot(dx, dy);
  if (distance > maxDistance) {
    dx = dx / distance * maxDistance;
    dy = dy / distance * maxDistance;
  }
  touchMoveVector.set(dx / maxDistance, -dy / maxDistance);
  combatStickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetCombatStick() {
  touchMoveVector.set(0, 0);
  combatStickKnob.style.transform = 'translate(-50%, -50%)';
}

document.getElementById('time-toggle').addEventListener('click', () => setTimeOfDay(!night));
shaderToggle.addEventListener('click', () => setShaderEnabled(!shaderEnabled));
document.getElementById('rain-toggle').addEventListener('click', (event) => {
  rainEnabled = !rainEnabled;
  rain.visible = rainEnabled;
  event.currentTarget.setAttribute('aria-pressed', String(rainEnabled));
});
musicToggle.addEventListener('click', () => {
  roomMusic.setEnabled(!roomMusic.enabled);
  syncGameMenuState();
});
document.getElementById('camera-reset').addEventListener('click', resetCamera);
fullscreenToggle.addEventListener('click', () => {
  toggleFullscreen().catch(() => showCombatMessage('VOLLBILD NICHT VERFUEGBAR', 1));
});
document.addEventListener('fullscreenchange', syncGameMenuState);
startGameButton.addEventListener('click', loadSelectedGame);
startNewGameButton.addEventListener('click', beginSelectedNewGame);
startDeleteSlotButton.addEventListener('click', deleteSelectedGameSave);
saveSlotButtons.forEach((button) => {
  const selectSlot = () => selectGameSaveSlot(button.dataset.saveSlot);
  button.addEventListener('click', selectSlot);
  button.addEventListener('focus', selectSlot);
});
startWorkshopButton.addEventListener('click', openWorkshopFromTitle);
gameOverContinueButton.addEventListener('click', continueAfterGameOver);
gameOverTitleButton.addEventListener('click', returnToTitleAfterGameOver);
playToggle.addEventListener('click', () => {
  ensureAudioContext();
  if (gameMode) {
    setGameMode(false);
    setBuildMode(developerMode?.enabled);
  } else {
    setGameMode(true);
  }
});
buildToggle.addEventListener('click', () => {
  if (gameMode) {
    setGameMode(false);
    setBuildMode(developerMode?.enabled);
    return;
  }
  setBuildMode(!buildMode);
});
attackButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  attackButton.setPointerCapture?.(event.pointerId);
  beginPlayerAttackInput();
});
attackButton.addEventListener('pointerup', (event) => {
  event.preventDefault();
  if (attackButton.hasPointerCapture?.(event.pointerId)) attackButton.releasePointerCapture(event.pointerId);
  releasePlayerAttackInput();
});
attackButton.addEventListener('pointercancel', () => cancelPlayerAttackCharge());
attackButton.addEventListener('click', (event) => {
  if (event.detail === 0) startPlayerAttack();
});
document.getElementById('dodge-button').addEventListener('click', startPlayerDodge);
shieldButton.addEventListener('click', () => setPlayerShielding(!playerShielding));
hookButton.addEventListener('click', startPlayerHook);
inventoryToggle.addEventListener('click', () => setInventoryOpen(!inventoryOpen));
inventoryClose.addEventListener('click', () => {
  setInventoryOpen(false);
  gameMenuToggle.focus();
});
gameMenuToggle.addEventListener('click', () => setGameMenuOpen(!gameMenuOpen));
gameMenuClose.addEventListener('click', () => setGameMenuOpen(false));
gameMenu.addEventListener('pointerdown', (event) => {
  if (event.target === gameMenu) setGameMenuOpen(false);
});
qaToggle.addEventListener('click', () => setQaPanelOpen(!qaPanelOpen));
qaClose.addEventListener('click', () => setQaPanelOpen(false));
qaInvulnerableInput.addEventListener('change', () => {
  qaInvulnerable = qaInvulnerableInput.checked;
  syncQaControls(qaInvulnerable ? 'Unverwundbarkeit aktiv' : 'Unverwundbarkeit aus');
});
qaRoomSelect.addEventListener('change', () => syncQaControls('Pruefraum ausgewaehlt'));
document.getElementById('qa-load-room').addEventListener('click', () => qaLoadSelectedRoom());
document.getElementById('qa-start-wave').addEventListener('click', qaStartSelectedWave);
document.getElementById('qa-finish-wave').addEventListener('click', qaFinishCurrentWave);
document.getElementById('qa-unlock-exit').addEventListener('click', qaUnlockCurrentExit);
qaLabToggle.addEventListener('click', () => {
  if (combatLabActive) stopCombatLab();
  else startCombatLab();
});
qaLabResetDuel.addEventListener('click', () => {
  resetCombatLabDuel({ resetStats: true });
});
qaLabAttackSelect.addEventListener('change', () => {
  syncCombatLabControls(`${EQUIPMENT_PROFILE_LABELS[selectedCombatLabProfile()]} ausgewaehlt`);
});
qaLabPlayerInputs.forEach((input) => {
  input.addEventListener('input', () => updateCombatLabPlayerSetting(input));
});
qaLabImpactInputs.forEach((input) => {
  input.addEventListener('input', () => {
    updateCombatLabTuningSetting(input, 'impact', 'combatLabImpact');
  });
});
qaLabEnemyInputs.forEach((input) => {
  input.addEventListener('input', () => {
    updateCombatLabTuningSetting(input, 'meleeEnemy', 'combatLabEnemy');
  });
});
document.getElementById('qa-lab-save').addEventListener('click', saveCombatLabProfile);
document.getElementById('qa-lab-defaults').addEventListener('click', resetCombatLabDefaults);
document.getElementById('qa-lab-export').addEventListener('click', exportCombatLabProfile);
document.getElementById('qa-reset-room').addEventListener('click', () => {
  qaLoadSelectedRoom('Raum zurueckgesetzt');
});
document.querySelectorAll('[data-game-menu-action]').forEach((button) => {
  button.addEventListener('click', () => runGameMenuAction(button.dataset.gameMenuAction));
  button.addEventListener('focus', () => {
    document.querySelectorAll('.is-controller-focus').forEach((element) => element.classList.remove('is-controller-focus'));
    button.classList.add('is-controller-focus');
  });
});
equipmentOpenButton.addEventListener('click', () => {
  selectedEquipmentPart = equippedWeapon;
  selectedEquipmentView = 'front';
  setEquipmentOpen(true);
});
equipmentCloseButton.addEventListener('click', () => {
  setEquipmentOpen(false);
  inventoryToggle.focus();
});
document.querySelectorAll('[data-equipment-part]').forEach((button) => {
  button.addEventListener('click', () => setEquipmentPart(button.dataset.equipmentPart));
});
document.querySelectorAll('[data-equipment-view]').forEach((button) => {
  button.addEventListener('click', () => setEquipmentView(button.dataset.equipmentView));
});
document.querySelectorAll('[data-equipment-value]').forEach((input) => {
  input.addEventListener('input', () => {
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value)) return;
    updateEquipmentTransform(input.dataset.equipmentValue, value);
    const suffix = input.dataset.equipmentValue.startsWith('r') ? '°' : '';
    input.nextElementSibling.textContent = `${suffix ? Math.round(value) : value.toFixed(2)}${suffix}`;
    equipmentStatus.textContent = `${EQUIPMENT_LABELS[selectedEquipmentPart]} · ${EQUIPMENT_PROFILE_LABELS[activeEquipmentProfile()]} angepasst`;
  });
});
equipmentAnimationSelect.addEventListener('change', () => {
  setEquipmentPreviewAnimation(equipmentAnimationSelect.value);
});
equipmentAttackEnabledInput?.addEventListener('change', () => {
  const profile = activeEquipmentProfile();
  if (!['sword', 'spear'].includes(selectedEquipmentPart)) return;
  if (profile === 'attack6') {
    chargedAttackSettings[selectedEquipmentPart] = equipmentAttackEnabledInput.checked;
  } else if (['attack2', 'attack3', 'attack4', 'attack5'].includes(profile)) {
    attackSequenceSettings[selectedEquipmentPart][profile] = equipmentAttackEnabledInput.checked;
  } else {
    return;
  }
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[profile]} ${equipmentAttackEnabledInput.checked ? 'aktiviert' : 'deaktiviert'}`;
});
comboModeSelect?.addEventListener('change', () => {
  const flow = comboFlowSettings[selectedEquipmentPart];
  if (!flow) return;
  flow.mode = comboModeSelect.value === 'random' ? 'random' : 'fixed';
  syncComboFlowControls();
  equipmentStatus.textContent = flow.mode === 'random'
    ? 'Kombo-Reihenfolge wird zufällig gewählt'
    : 'Feste Kombo-Reihenfolge aktiv';
});
comboPauseInput?.addEventListener('input', () => {
  const profile = activeEquipmentProfile();
  const flow = comboFlowSettings[selectedEquipmentPart];
  const pause = Number.parseFloat(comboPauseInput.value);
  if (!flow || !COMBO_PROFILE_KEYS.includes(profile) || !Number.isFinite(pause)) return;
  flow.pauses[profile] = THREE.MathUtils.clamp(pause, 0, 0.45);
  comboPauseOutput.textContent = `${flow.pauses[profile].toFixed(2)} s`;
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[profile]} · ${flow.pauses[profile].toFixed(2)} s Pause`;
});
comboMoveEarlierButton?.addEventListener('click', () => moveSelectedComboProfile(-1));
comboMoveLaterButton?.addEventListener('click', () => moveSelectedComboProfile(1));
sweepArmStartInput?.addEventListener('input', () => {
  const value = Number.parseFloat(sweepArmStartInput.value);
  if (Number.isFinite(value)) updateHorizontalSweepSetting('startDeg', value);
});
sweepArmEndInput?.addEventListener('input', () => {
  const value = Number.parseFloat(sweepArmEndInput.value);
  if (Number.isFinite(value)) updateHorizontalSweepSetting('endDeg', value);
});
attackSpeedInput?.addEventListener('input', () => {
  const value = Number.parseFloat(attackSpeedInput.value);
  if (Number.isFinite(value)) updateAttackSpeedSetting(value);
});
document.querySelectorAll('[data-attack-feel-value]').forEach((input) => {
  input.addEventListener('input', () => {
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value)) return;
    updateAttackFeelSetting(input.dataset.attackFeelValue, value);
  });
});
equipmentPreviewToggle.addEventListener('click', () => {
  setEquipmentPreviewPlaying(!equipmentPreviewPlaying);
});
equipmentFrameSlider.addEventListener('input', () => {
  const progress = Number.parseFloat(equipmentFrameSlider.value);
  if (Number.isFinite(progress)) setEquipmentPreviewProgress(progress);
});
attackFxEnabledInput?.addEventListener('change', () => {
  const config = selectedAttackFxConfig();
  if (!config) return;
  config.enabled = attackFxEnabledInput.checked;
  syncAttackFxControls();
  refreshEquipmentFxPreview();
  equipmentStatus.textContent = config.enabled ? '3D-Partikel aktiviert' : '3D-Partikel deaktiviert';
});
attackFxColorInput?.addEventListener('input', () => {
  const config = selectedAttackFxConfig();
  if (!config) return;
  config.color = attackFxColorInput.value;
  refreshEquipmentFxPreview();
  equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[activeEquipmentProfile()]} · Partikelfarbe angepasst`;
});
document.querySelectorAll('[data-attack-fx-value]').forEach((input) => {
  input.addEventListener('input', () => {
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value)) return;
    updateAttackFxSetting(input.dataset.attackFxValue, value);
    equipmentStatus.textContent = `${EQUIPMENT_PROFILE_LABELS[activeEquipmentProfile()]} · Schwungeffekt angepasst`;
  });
});
weaponGlowEnabledInput?.addEventListener('change', () => {
  const config = selectedWeaponChargeGlowConfig();
  if (!config) return;
  config.enabled = weaponGlowEnabledInput.checked;
  syncWeaponChargeGlowControls();
  updateEquipmentPreviewTimeline();
  equipmentStatus.textContent = config.enabled ? 'Ladeleuchten aktiviert' : 'Ladeleuchten deaktiviert';
});
weaponGlowStartInput?.addEventListener('input', () => {
  const config = selectedWeaponChargeGlowConfig();
  if (!config) return;
  config.startColor = weaponGlowStartInput.value;
  updateEquipmentPreviewTimeline();
  equipmentStatus.textContent = 'Startfarbe des Ladeleuchtens angepasst';
});
weaponGlowEndInput?.addEventListener('input', () => {
  const config = selectedWeaponChargeGlowConfig();
  if (!config) return;
  config.endColor = weaponGlowEndInput.value;
  updateEquipmentPreviewTimeline();
  equipmentStatus.textContent = 'Endfarbe des Ladeleuchtens angepasst';
});
weaponGlowIntensityInput?.addEventListener('input', () => {
  const config = selectedWeaponChargeGlowConfig();
  const intensity = Number.parseFloat(weaponGlowIntensityInput.value);
  if (!config || !Number.isFinite(intensity)) return;
  config.intensity = THREE.MathUtils.clamp(intensity, 0.25, 4);
  weaponGlowIntensityInput.nextElementSibling.textContent = config.intensity.toFixed(2);
  updateEquipmentPreviewTimeline();
  equipmentStatus.textContent = 'Staerke des Ladeleuchtens angepasst';
});
document.getElementById('equipment-reset').addEventListener('click', resetSelectedEquipmentTransform);
document.getElementById('equipment-save').addEventListener('click', saveEquipmentTransforms);
document.querySelectorAll('[data-inventory-item]').forEach((slot) => {
  slot.addEventListener('click', () => {
    const item = slot.dataset.inventoryItem;
    if (item === 'potion') usePotion();
    else if (item === 'helmet') togglePlayerHelmet();
    else selectInventoryItem(item);
  });
});
document.querySelectorAll('[data-reward]').forEach((button) => {
  button.addEventListener('click', () => chooseReward(button.dataset.reward));
});
supplyRerollButton.addEventListener('click', rerollSupplyOffers);
supplyContinueButton.addEventListener('click', continueFromSupply);
combatStick.addEventListener('pointerdown', (event) => {
  if (!gameMode || qaPanelOpen || gameMenuOpen || inventoryOpen || equipmentOpen || rewardOpen || supplyOpen) return;
  combatStick.setPointerCapture(event.pointerId);
  updateCombatStick(event);
});
combatStick.addEventListener('pointermove', (event) => {
  if (combatStick.hasPointerCapture(event.pointerId)) updateCombatStick(event);
});
combatStick.addEventListener('pointerup', (event) => {
  if (combatStick.hasPointerCapture(event.pointerId)) combatStick.releasePointerCapture(event.pointerId);
  resetCombatStick();
});
combatStick.addEventListener('pointercancel', resetCombatStick);
document.getElementById('grid-toggle').addEventListener('click', (event) => {
  const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
  if (gridHelper) gridHelper.visible = buildMode && enabled;
});
entranceLandscapeToggle.addEventListener('click', () => {
  setEntranceLandscapeVisible(!entranceLandscapeVisible);
});
diagnosticsToggle.addEventListener('click', () => {
  setDiagnosticsEnabled(!diagnosticsEnabled);
});
document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => setEditorMode(button.dataset.mode));
});
document.querySelectorAll('[data-editor-view]').forEach((button) => {
  button.addEventListener('click', () => setEditorView(button.dataset.editorView));
});
roomSelect.addEventListener('change', () => setEditorRoom(roomSelect.value));
document.getElementById('wave-add').addEventListener('click', () => addEditorWave());
document.getElementById('wave-duplicate').addEventListener('click', () => addEditorWave(activeEditorWave()));
document.getElementById('wave-up').addEventListener('click', () => moveEditorWave(-1));
document.getElementById('wave-down').addEventListener('click', () => moveEditorWave(1));
document.getElementById('wave-delete').addEventListener('click', deleteEditorWave);
waveNameInput.addEventListener('input', () => {
  const name = waveNameInput.value;
  previewSelectedWave((wave) => { wave.name = name || 'Unbenannte Welle'; });
});
waveNameInput.addEventListener('change', () => {
  const name = waveNameInput.value.trim();
  updateSelectedWave((wave) => { wave.name = name || 'Unbenannte Welle'; }, 'Welle benannt');
});
waveIntermissionInput.addEventListener('input', () => {
  if (waveIntermissionInput.value === '') return;
  const value = THREE.MathUtils.clamp(Number(waveIntermissionInput.value) || 1.5, 0.4, 12);
  previewSelectedWave((wave) => { wave.intermission = value; });
});
waveIntermissionInput.addEventListener('change', () => {
  const value = THREE.MathUtils.clamp(Number(waveIntermissionInput.value) || 1.5, 0.4, 12);
  updateSelectedWave((wave) => { wave.intermission = value; }, 'Wellenpause geaendert');
});
waveRewardCoinsInput.addEventListener('input', () => {
  if (waveRewardCoinsInput.value === '') return;
  const value = THREE.MathUtils.clamp(Math.round(Number(waveRewardCoinsInput.value) || 0), 0, 25);
  previewSelectedWave((wave) => { wave.rewardCoins = value; });
});
waveRewardCoinsInput.addEventListener('change', () => {
  const value = THREE.MathUtils.clamp(Math.round(Number(waveRewardCoinsInput.value) || 0), 0, 25);
  updateSelectedWave((wave) => { wave.rewardCoins = value; }, 'Wellenbelohnung geaendert');
});
waveBossInput.addEventListener('change', () => {
  updateSelectedWave((selectedWave) => {
    if (waveBossInput.checked) roomWaves().forEach((wave) => { wave.boss = wave === selectedWave; });
    else selectedWave.boss = false;
  }, waveBossInput.checked ? 'Bosswelle festgelegt' : 'Bosswelle entfernt');
});
enemyWaveSelect.addEventListener('change', () => {
  if (!selectedRoot?.userData.combatEnemy || !waveDefinition(selectedRoot.userData.roomId, enemyWaveSelect.value)) return;
  selectedRoot.userData.placement.settings.waveId = enemyWaveSelect.value;
  activeEditorWaveId = enemyWaveSelect.value;
  updateWaveEditor();
  recordHistory('Gegner einer Welle zugeordnet');
});
enemySpawnDelayInput.addEventListener('change', () => {
  if (!selectedRoot?.userData.combatEnemy) return;
  selectedRoot.userData.placement.settings.spawnDelay = THREE.MathUtils.clamp(
    Number(enemySpawnDelayInput.value) || 0,
    0,
    20
  );
  updateMarkerProperties(selectedRoot);
  recordHistory('Spawnverzoegerung geaendert');
});
document.getElementById('room-new').addEventListener('click', () => {
  createEditorRoom(`Raum ${roomDefinitions.length + 1}`);
});
document.getElementById('room-duplicate').addEventListener('click', () => {
  const source = roomDefinition(activeEditorRoomId);
  createEditorRoom(`${source.name} Kopie`, collectLayout(), source.waves);
});
document.getElementById('room-rename').addEventListener('click', () => {
  const room = roomDefinition(activeEditorRoomId);
  const requested = window.prompt('Name des Raums', room.name);
  const name = requested?.trim();
  if (!name || name === room.name) return;
  room.name = uniqueRoomName(name);
  updateRoomControls();
  persistRoomLibrary();
  setBuildStatus(`${room.name} benannt`);
});
document.getElementById('room-delete').addEventListener('click', () => {
  const room = roomDefinition(activeEditorRoomId);
  if (roomDefinitions.length <= 1 || !window.confirm(`${room.name} wirklich loeschen?`)) return;
  deleteActiveEditorRoom();
});
markerTargetRoom.addEventListener('change', () => {
  updateSelectedMarkerSetting('targetRoomId', markerTargetRoom.value, 'Zielraum geaendert');
});
markerCondition.addEventListener('change', () => {
  updateSelectedMarkerSetting('condition', markerCondition.value, 'Freigabe geaendert');
  if (selectedRoot) updateMarkerProperties(selectedRoot);
});
markerSignal.addEventListener('change', () => {
  const name = markerSignal.value.trim().slice(0, 32);
  markerSignal.value = name;
  updateSelectedMarkerSetting('signal', name, 'Signalname geaendert');
});
markerModus.addEventListener('change', () => {
  updateSelectedMarkerSetting('modus', markerModus.value, 'Verhalten geaendert');
});
markerGewicht.addEventListener('change', () => {
  const wert = THREE.MathUtils.clamp(Math.round(Number(markerGewicht.value) || 1), 1, 4);
  markerGewicht.value = String(wert);
  updateSelectedMarkerSetting('gewicht', wert, 'Noetige Koerper geaendert');
});
markerWirkung.addEventListener('change', () => {
  updateSelectedMarkerSetting('wirkung', markerWirkung.value, 'Wirkung geaendert');
});
markerRadius.addEventListener('change', () => {
  const radius = THREE.MathUtils.clamp(Number(markerRadius.value) || CELL * 0.7, 0.5, 12);
  updateSelectedMarkerSetting('radius', radius, 'Ausloeser-Radius geaendert');
});
rewardChestToggle.addEventListener('change', () => {
  if (selectedRoot?.userData.assetName !== 'chest') return;
  if (rewardChestToggle.checked) {
    editableRootsForRoom(selectedRoot.userData.roomId).forEach((root) => {
      if (root.userData.assetName !== 'chest') return;
      root.userData.placement.settings ??= {};
      root.userData.placement.settings.rewardChest = root === selectedRoot;
    });
  } else {
    selectedRoot.userData.placement.settings.rewardChest = false;
  }
  updateMarkerProperties(selectedRoot);
  recordHistory(rewardChestToggle.checked ? 'Belohnungstruhe festgelegt' : 'Belohnungstruhe entfernt');
});
chestDropType.addEventListener('change', () => {
  if (selectedRoot?.userData.assetName !== 'chest') return;
  selectedRoot.userData.placement.settings.dropType = CHEST_DROP_TYPES.has(chestDropType.value)
    ? chestDropType.value
    : 'choice';
  normalizedChestDrop(selectedRoot);
  updateMarkerProperties(selectedRoot);
  recordHistory('Truheninhalt geaendert');
});
chestDropAmount.addEventListener('input', () => {
  if (selectedRoot?.userData.assetName !== 'chest') return;
  const amount = Number(chestDropAmount.value);
  if (!Number.isFinite(amount)) return;
  selectedRoot.userData.placement.settings.dropAmount = THREE.MathUtils.clamp(Math.round(amount), 1, 25);
});
chestDropAmount.addEventListener('change', () => {
  if (selectedRoot?.userData.assetName !== 'chest') return;
  selectedRoot.userData.placement.settings.dropAmount = THREE.MathUtils.clamp(
    Math.round(Number(chestDropAmount.value) || 5),
    1,
    25
  );
  updateMarkerProperties(selectedRoot);
  recordHistory('Muenzmenge geaendert');
});
[chestDropAmount, ...transformInputs].forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    input.blur();
  });
});
transformInputs.forEach((input) => {
  input.addEventListener('input', previewSelectedObjectTransform);
  input.addEventListener('change', () => {
    if (!previewSelectedObjectTransform()) return;
    recordHistory('Objekt ausgerichtet');
  });
});
document.getElementById('transform-reset').addEventListener('click', resetSelectedObjectTransform);
[trapDamageInput, trapRadiusInput, trapWarningInput, trapCooldownInput].forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    input.blur();
  });
});
trapDamageInput.addEventListener('input', () => {
  const damage = Number(trapDamageInput.value);
  if (Number.isFinite(damage)) previewSelectedTrapSetting('damage', THREE.MathUtils.clamp(Math.round(damage), 1, 6));
});
trapRadiusInput.addEventListener('input', () => {
  const radius = Number(trapRadiusInput.value);
  if (Number.isFinite(radius)) previewSelectedTrapSetting('radius', THREE.MathUtils.clamp(radius, 0.5, 6));
});
trapWarningInput.addEventListener('input', () => {
  const warning = Number(trapWarningInput.value);
  if (Number.isFinite(warning)) previewSelectedTrapSetting('warning', THREE.MathUtils.clamp(warning, 0.15, 2));
});
trapCooldownInput.addEventListener('input', () => {
  const cooldown = Number(trapCooldownInput.value);
  if (Number.isFinite(cooldown)) previewSelectedTrapSetting('cooldown', THREE.MathUtils.clamp(cooldown, 0.4, 6));
});
trapDamageInput.addEventListener('change', () => {
  const damage = THREE.MathUtils.clamp(Math.round(Number(trapDamageInput.value) || TRAP_DEFAULTS.damage), 1, 6);
  updateSelectedTrapSetting('damage', damage, 'Fallenschaden geaendert');
});
trapTargetsInput.addEventListener('change', () => {
  const targets = ['both', 'player', 'enemies'].includes(trapTargetsInput.value)
    ? trapTargetsInput.value
    : TRAP_DEFAULTS.targets;
  updateSelectedTrapSetting('targets', targets, 'Fallenziele geaendert');
});
trapRadiusInput.addEventListener('change', () => {
  const radius = THREE.MathUtils.clamp(Number(trapRadiusInput.value) || TRAP_DEFAULTS.radius, 0.5, 6);
  updateSelectedTrapSetting('radius', radius, 'Fallenradius geaendert');
});
trapWarningInput.addEventListener('change', () => {
  const warning = THREE.MathUtils.clamp(Number(trapWarningInput.value) || TRAP_DEFAULTS.warning, 0.15, 2);
  updateSelectedTrapSetting('warning', warning, 'Warnzeit geaendert');
});
trapCooldownInput.addEventListener('change', () => {
  const cooldown = THREE.MathUtils.clamp(Number(trapCooldownInput.value) || TRAP_DEFAULTS.cooldown, 0.4, 6);
  updateSelectedTrapSetting('cooldown', cooldown, 'Abklingzeit geaendert');
});
assetSelect.addEventListener('change', () => {
  selectedAsset = assetSelect.value;
  selectRoot(null);
  createGhost();
  setBuildStatus(`${assetLabels[selectedAsset] ?? selectedAsset} gewaehlt`);
});
document.getElementById('layer-down').addEventListener('click', () => setLayer(currentLayer - 1, editorMode === 'select'));
document.getElementById('layer-up').addEventListener('click', () => setLayer(currentLayer + 1, editorMode === 'select'));
document.getElementById('rotate-left').addEventListener('click', () => rotateActive(-1));
document.getElementById('rotate-right').addEventListener('click', () => rotateActive(1));
undoButton.addEventListener('click', () => restoreHistory(editorHistoryState.index - 1));
redoButton.addEventListener('click', () => restoreHistory(editorHistoryState.index + 1));
document.getElementById('save-button').addEventListener('click', () => {
  persistRoomLibrary();
  setBuildStatus(`Alle Raeume lokal gespeichert - Format ${ROOM_LIBRARY_VERSION}`);
});
document.getElementById('load-button').addEventListener('click', () => {
  try {
    const source = loadStoredRoomLibrary();
    resetActiveRoomHistory(`${source} geladen`);
  } catch (error) {
    setBuildStatus(error.message);
  }
});
document.getElementById('export-button').addEventListener('click', downloadLayout);
document.getElementById('import-button').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    loadRoomLibrary(JSON.parse(await file.text()));
    resetActiveRoomHistory('Raumsammlung importiert');
  } catch (error) {
    setBuildStatus(error.message);
  } finally {
    event.target.value = '';
  }
});
document.getElementById('reset-layout').addEventListener('click', () => {
  const origin = initialRoomLayouts.get(activeEditorRoomId) ?? [];
  const waves = initialRoomWaves.get(activeEditorRoomId) ?? roomWaves();
  loadLayout(layoutPayload(origin, waves), activeEditorRoomId);
  recordHistory('Raumursprung wiederhergestellt');
});
canvas.addEventListener('pointerdown', onCanvasPointerDown);
canvas.addEventListener('pointermove', onCanvasPointerMove);
canvas.addEventListener('pointerup', onCanvasPointerUp);
canvas.addEventListener('contextmenu', (event) => {
  if (gameMode) event.preventDefault();
});
canvas.addEventListener('pointerleave', () => {
  if (ghostRoot) ghostRoot.visible = false;
  if (diagnosticRayLine) diagnosticRayLine.visible = false;
  if (gameMode && pointerDownPosition) {
    pointerDownPosition = null;
    cancelPlayerAttackCharge();
  }
});
window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  const key = event.key.toLowerCase();
  if (startScreenOpen) {
    if (['arrowup', 'w', 'arrowleft', 'a'].includes(key)) {
      event.preventDefault();
      focusGuidedPanel(startScreen, -1);
    } else if (['arrowdown', 's', 'arrowright', 'd', 'tab'].includes(key)) {
      event.preventDefault();
      focusGuidedPanel(startScreen, event.shiftKey ? -1 : 1);
    } else if ((event.key === 'Enter' || event.code === 'Space' || key === 'e') && !event.repeat) {
      event.preventDefault();
      activateGuidedSelection(startScreen);
    }
    return;
  }
  if (gameMode) {
    ensureAudioContext();
    const guidedPanel = activeGuidedPanel();
    if (guidedPanel) {
      if (['arrowup', 'w', 'arrowleft', 'a'].includes(key)) {
        event.preventDefault();
        focusGuidedPanel(guidedPanel, -1);
      } else if (['arrowdown', 's', 'arrowright', 'd', 'tab'].includes(key)) {
        event.preventDefault();
        focusGuidedPanel(guidedPanel, event.shiftKey ? -1 : 1);
      } else if ((event.key === 'Enter' || event.code === 'Space' || key === 'e') && !event.repeat) {
        event.preventDefault();
        activateGuidedSelection(guidedPanel);
      } else if (event.key === 'Escape' || key === 'm' || event.code === 'Digit1'
        || (guidedPanel === inventoryPanel && key === 'i')) {
        event.preventDefault();
        closeGuidedPanel(guidedPanel);
      }
      return;
    }
    if ((event.key === 'Escape' || key === 'm' || event.code === 'Digit1') && !event.repeat) {
      event.preventDefault();
      setGameMenuOpen(true);
      return;
    }
    if ((key === 'i' || event.key === 'Tab') && !event.repeat) {
      event.preventDefault();
      setInventoryOpen(true);
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      pressedKeys.add(key);
      if (!event.repeat) applyCombatInputTap();
      event.preventDefault();
    }
    if ((event.code === 'Space' || key === 'f') && !event.repeat) {
      event.preventDefault();
      beginPlayerAttackInput();
    } else if (key === 'e' && !event.repeat) {
      event.preventDefault();
      startPlayerHook();
    } else if (key === 'q') {
      event.preventDefault();
      setPlayerShielding(true);
    } else if (event.key === 'Shift') {
      event.preventDefault();
      startPlayerDodge();
    }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault();
    restoreHistory(event.shiftKey ? editorHistoryState.index + 1 : editorHistoryState.index - 1);
  } else if ((event.ctrlKey || event.metaKey) && key === 'y') {
    event.preventDefault();
    restoreHistory(editorHistoryState.index + 1);
  } else if (event.key === 'Delete' && selectedRoot && removeRoot(selectedRoot)) {
    recordHistory('Objekt geloescht');
  } else if (key === 'r' && buildMode) {
    rotateActive(1);
  } else if (event.key === 'Escape') {
    selectRoot(null);
  }
});
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  pressedKeys.delete(key);
  if (gameMode && (event.code === 'Space' || key === 'f')) {
    event.preventDefault();
    releasePlayerAttackInput();
  }
  if (key === 'q') setPlayerShielding(false);
});
window.addEventListener('blur', () => {
  pressedKeys.clear();
  cancelPlayerAttackCharge();
  setPlayerShielding(false);
});
window.addEventListener('gamepadconnected', (event) => {
  activeGamepadIndex = event.gamepad.index;
  gamepadButtonState = [];
  requireGamepadNeutral();
  if (gameMode) showCombatMessage('CONTROLLER BEREIT', 0.9);
});
window.addEventListener('gamepaddisconnected', (event) => {
  if (event.gamepad.index !== activeGamepadIndex) return;
  activeGamepadIndex = null;
  gamepadButtonState = [];
  requireGamepadNeutral();
  gamepadShieldHeld = false;
  cancelPlayerAttackCharge();
  setPlayerShielding(false);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setSize(window.innerWidth, window.innerHeight);
  aethoriaLightPass.uniforms.resolution.value.set(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
  if (!cameraWasMoved && !gameMode) applyDefaultCamera();
});

async function init() {
  developerMode = createDeveloperModeController({
    toggleButton: developerToggle,
    controlledElements: document.querySelectorAll('[data-dev-only]'),
    onChange: (enabled) => {
      if (!enabled) {
        qaInvulnerable = false;
        qaInvulnerableInput.checked = false;
        setQaPanelOpen(false, { restoreFocus: false });
        setEquipmentOpen(false);
        setBuildMode(false);
      } else if (!gameMode) {
        setBuildMode(true);
      }
    }
  });
  populateAssetSelect();
  await loadAssets();
  addWorldGeometry();
  addFloorPlan();
  addArchitecture();
  const sharedRoomLayout = JSON.parse(JSON.stringify(collectLayout('wachhof')));
  loadLayout(
    layoutPayload(createDefaultRoomLayout(sharedRoomLayout, 'tiefe-wacht'), roomWaves('tiefe-wacht')),
    'tiefe-wacht'
  );
  loadLayout(
    layoutPayload(createDefaultRoomLayout(sharedRoomLayout, 'bruchkammer'), roomWaves('bruchkammer')),
    'bruchkammer'
  );
  loadLayout(
    layoutPayload(createDefaultRoomLayout(sharedRoomLayout, 'wachtschlucht'), roomWaves('wachtschlucht')),
    'wachtschlucht'
  );
  addPropsAndActors();
  addRoomTwoScenery();
  addRoomThreeScenery();
  addDefaultRoomEncounters();
  addDefaultSystemMarkers();
  rebuildElevationBoundaries();
  const roomOneLayout = JSON.parse(JSON.stringify(collectLayout('wachhof')));
  createBuildGrid();
  initialLayout = roomOneLayout;
  initialRoomLayouts.set('wachhof', roomOneLayout);
  initialRoomLayouts.set('tiefe-wacht', JSON.parse(JSON.stringify(collectLayout('tiefe-wacht'))));
  initialRoomLayouts.set('bruchkammer', JSON.parse(JSON.stringify(collectLayout('bruchkammer'))));
  initialRoomLayouts.set('wachtschlucht', JSON.parse(JSON.stringify(collectLayout('wachtschlucht'))));
  roomDefinitions.forEach((room) => initialRoomWaves.set(room.id, cloneRoomWaves(room.waves)));
  updateRoomControls();
  editorHistoryState = createEditorHistoryState(layoutPayload());
  storeRoomHistoryState(roomHistoryStates, activeEditorRoomId, editorHistoryState);
  updateHistoryButtons();
  updateInventoryHud();
  selectInventoryItem('sword');
  setLayer(0);
  setBuildMode(false);
  setEditorMode('place');
  setEditorView('build');
  setShaderEnabled(true);
  refreshGameSaveRecords();
  renderGameSaveSlots();
  setStartScreenOpen(true);
  loadingScreen.classList.add('is-done');
  setTimeout(() => loadingScreen.remove(), 600);

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    if (gameMode || startScreenOpen) updateGamepadInput(delta);
    const hitStopActive = gameMode && combatHitStop > 0;
    if (hitStopActive) combatHitStop = Math.max(0, combatHitStop - delta);
    let simulationDelta = hitStopActive ? 0 : delta;
    if (gameMode && !hitStopActive && combatImpactSlowTimer > 0) {
      combatImpactSlowTimer = Math.max(0, combatImpactSlowTimer - delta);
      simulationDelta *= combatImpactTimeScale;
      if (combatImpactSlowTimer <= 0) combatImpactTimeScale = 1;
    }
    clearProceduralActorPose(playerRoot);
    mixers.forEach((mixer) => mixer.update(simulationDelta));
    animateActors(elapsed);
    updateRain(delta);
    updateWachtmalEffects(delta);
    updateWachtfackelEffects(elapsed);
    roomMusic.update(delta);
    if (gameMode) {
      if (hitStopActive) {
        updateCombatEffects(delta);
        updateCombatCamera(delta);
      } else {
        updateCombat(simulationDelta);
      }
    } else {
      updateCameraTween(delta);
      controls.update();
    }
    updatePlayerProceduralPose(simulationDelta, elapsed);
    updatePlayerFace(simulationDelta);
    selectionHelper?.update();
    wavePreviewHelpers.forEach((helper) => helper.update());
    equipmentSelectionHelper?.update();
    updateBladeTrail(delta);
    updateDiagnostics();
    water.material.uniforms.time.value = elapsed;
    composer.render(delta);
  });
}

init().catch((error) => {
  console.error(error);
  selectedName.textContent = 'Szene konnte nicht geladen werden';
  selectedDetail.textContent = error.message;
  loadingScreen.classList.add('is-done');
});
