const MUSIC_ENABLED_STORAGE_KEY = 'wachtbruch-music-enabled-v1';

export const ROOM_MUSIC_TRACKS = Object.freeze({
  wachhof: Object.freeze({
    title: 'Sirens in Darkness',
    src: new URL('../../audio/music/wachhof-sirens-in-darkness.mp3', import.meta.url).href,
    volume: 0.12
  }),
  'tiefe-wacht': Object.freeze({
    title: 'EmptyCity',
    src: new URL('../../audio/music/tiefe-wacht-empty-city.ogg', import.meta.url).href,
    volume: 0.13
  }),
  bruchkammer: Object.freeze({
    title: 'Sirens in Darkness',
    src: new URL('../../audio/music/wachhof-sirens-in-darkness.mp3', import.meta.url).href,
    volume: 0.105
  }),
  wachtschlucht: Object.freeze({
    title: 'EmptyCity',
    src: new URL('../../audio/music/tiefe-wacht-empty-city.ogg', import.meta.url).href,
    volume: 0.11
  })
});

export const COMBAT_MUSIC_TRACK = Object.freeze({
  title: 'Determined Pursuit',
  src: new URL('../../audio/music/bruchkammer-determined-pursuit.wav', import.meta.url).href,
  volume: 0.115
});

function readEnabled(storageKey) {
  try {
    return window.localStorage.getItem(storageKey) !== 'false';
  } catch {
    return true;
  }
}

function persistEnabled(storageKey, enabled) {
  try {
    window.localStorage.setItem(storageKey, String(enabled));
  } catch {
    // Music remains usable when persistent browser storage is unavailable.
  }
}

function damp(current, target, response, delta) {
  return target + (current - target) * Math.exp(-response * delta);
}

function createChannel() {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 0;
  return { audio, trackKey: null, targetVolume: 0 };
}

export function createRoomMusicController({
  toggleButton,
  tracks = ROOM_MUSIC_TRACKS,
  combatTrack = COMBAT_MUSIC_TRACK,
  storageKey = MUSIC_ENABLED_STORAGE_KEY,
  fadeResponse = 2.4,
  initialRoomId = 'wachhof'
} = {}) {
  const channels = [createChannel(), createChannel()];
  const cueNodes = new Set();
  let activeChannel = -1;
  let currentRoomId = initialRoomId;
  let gameActive = false;
  let enabled = readEnabled(storageKey);
  let mode = 'explore';
  let cueTimer = 0;
  let audioContext = null;
  let combatIntroBoss = false;

  function titleForMode() {
    if (mode === 'combat-intro') return 'Kampf beginnt';
    if (mode === 'combat') return combatTrack.title;
    if (mode === 'boss-victory') return 'Siegfanfare';
    if (mode === 'defeat') return 'Stille der Wacht';
    return tracks[currentRoomId]?.title ?? 'Raumstimmung';
  }

  function updateToggle() {
    if (!toggleButton) return;
    toggleButton.setAttribute('aria-pressed', String(enabled));
    toggleButton.setAttribute('aria-label', enabled ? 'Musik ausschalten' : 'Musik einschalten');
    toggleButton.dataset.tip = enabled ? `Musik: ${titleForMode()}` : 'Musik aus';
  }

  function fadeOut() {
    channels.forEach((channel) => {
      channel.targetVolume = 0;
    });
  }

  function ensureCueContext() {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function stopCue() {
    cueNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // The scheduled note may already have ended.
      }
    });
    cueNodes.clear();
  }

  function scheduleTone(frequency, duration, volume, delay = 0, type = 'triangle') {
    const context = ensureCueContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => cueNodes.delete(oscillator);
    cueNodes.add(oscillator);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playCombatStartCue(boss = false) {
    if (!gameActive || !enabled) return;
    const root = boss ? 92.5 : 110;
    scheduleTone(root, 0.5, 0.025, 0, 'sine');
    scheduleTone(root * 1.5, 0.34, 0.022, 0.12, 'triangle');
    scheduleTone(root * 2, 0.42, 0.026, 0.28, 'sawtooth');
    if (boss) scheduleTone(root * 0.5, 0.72, 0.022, 0.03, 'square');
  }

  function playBossVictoryCue() {
    if (!gameActive || !enabled) return;
    const notes = [293.66, 369.99, 440, 587.33];
    notes.forEach((frequency, index) => {
      scheduleTone(frequency, index === notes.length - 1 ? 1.15 : 0.55, 0.025, index * 0.2, 'triangle');
    });
    [293.66, 440, 587.33].forEach((frequency) => {
      scheduleTone(frequency, 1.25, 0.014, 0.68, 'sine');
    });
  }

  function playDefeatCue() {
    if (!gameActive || !enabled) return;
    const notes = [220, 174.61, 146.83, 110];
    notes.forEach((frequency, index) => {
      scheduleTone(frequency, 1.55, 0.012, index * 0.48, 'sine');
      scheduleTone(frequency * 1.5, 1.1, 0.006, index * 0.48 + 0.08, 'triangle');
    });
  }

  function playTrack(trackKey, track) {
    updateToggle();
    fadeOut();
    if (!gameActive || !enabled || !track) return;

    let channelIndex = channels.findIndex((channel) => channel.trackKey === trackKey);
    if (channelIndex < 0) {
      channelIndex = activeChannel === 0 ? 1 : 0;
      const channel = channels[channelIndex];
      channel.audio.pause();
      channel.audio.src = track.src;
      channel.audio.currentTime = 0;
      channel.audio.volume = 0;
      channel.trackKey = trackKey;
    }

    activeChannel = channelIndex;
    const channel = channels[channelIndex];
    channel.targetVolume = track.volume;
    channel.audio.play().catch(() => {
      // Browsers may defer playback until the next explicit interaction.
    });
  }

  function playExplore(roomId = currentRoomId) {
    currentRoomId = roomId;
    mode = 'explore';
    cueTimer = 0;
    stopCue();
    playTrack(`explore:${currentRoomId}`, tracks[currentRoomId]);
  }

  function playCombatLoop() {
    mode = 'combat';
    cueTimer = 0;
    playTrack('combat', combatTrack);
  }

  function startCombat({ boss = false } = {}) {
    combatIntroBoss = Boolean(boss);
    mode = 'combat-intro';
    cueTimer = combatIntroBoss ? 0.95 : 0.78;
    fadeOut();
    stopCue();
    playCombatStartCue(combatIntroBoss);
    updateToggle();
  }

  function playBossVictory(roomId = currentRoomId) {
    currentRoomId = roomId;
    mode = 'boss-victory';
    cueTimer = 2.65;
    fadeOut();
    stopCue();
    playBossVictoryCue();
    updateToggle();
  }

  function playDefeat() {
    mode = 'defeat';
    cueTimer = 0;
    fadeOut();
    stopCue();
    playDefeatCue();
    updateToggle();
  }

  function resumeMode() {
    if (mode === 'combat') playCombatLoop();
    else if (mode === 'combat-intro') startCombat({ boss: combatIntroBoss });
    else if (mode === 'boss-victory') playBossVictory(currentRoomId);
    else if (mode === 'defeat') playDefeat();
    else playExplore(currentRoomId);
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    persistEnabled(storageKey, enabled);
    if (enabled && gameActive) resumeMode();
    else {
      fadeOut();
      stopCue();
      updateToggle();
    }
  }

  function setGameActive(nextGameActive) {
    gameActive = Boolean(nextGameActive);
    if (gameActive && enabled) {
      ensureCueContext();
      resumeMode();
    }
    else {
      fadeOut();
      stopCue();
    }
  }

  function update(delta) {
    const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    if (gameActive && cueTimer > 0) {
      cueTimer = Math.max(0, cueTimer - safeDelta);
      if (cueTimer === 0) {
        if (mode === 'combat-intro') playCombatLoop();
        else if (mode === 'boss-victory') playExplore(currentRoomId);
      }
    }
    channels.forEach((channel) => {
      channel.audio.volume = Math.min(1, Math.max(0, damp(
        channel.audio.volume,
        channel.targetVolume,
        fadeResponse,
        safeDelta
      )));
      if (channel.targetVolume === 0 && channel.audio.volume < 0.0015) {
        channel.audio.volume = 0;
        if (!channel.audio.paused) channel.audio.pause();
      }
    });
  }

  updateToggle();

  return Object.freeze({
    get enabled() {
      return enabled;
    },
    get mode() {
      return mode;
    },
    playRoom: playExplore,
    playExplore,
    startCombat,
    playBossVictory,
    playDefeat,
    setEnabled,
    setGameActive,
    update
  });
}
