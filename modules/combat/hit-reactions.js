export const PLAYER_HIT_REACTION_SCHEMA = 'wachtbruch-player-hit-reactions';
export const PLAYER_HIT_REACTION_VERSION = 1;

export const PLAYER_HIT_REACTION_PROFILES = Object.freeze({
  blocked: Object.freeze({
    id: 'blocked',
    hurtSeconds: 0.1,
    impulseMultiplier: 1,
    impactMultiplier: 0.72,
    animation: null,
    animationSpeed: 1
  }),
  light: Object.freeze({
    id: 'light',
    hurtSeconds: 0.255,
    impulseMultiplier: 1,
    impactMultiplier: 1,
    animation: 'emote-no',
    animationSpeed: 1.7
  }),
  heavy: Object.freeze({
    id: 'heavy',
    hurtSeconds: 0.34,
    impulseMultiplier: 0.94,
    impactMultiplier: 1.18,
    animation: 'emote-no',
    animationSpeed: 1.34
  }),
  environment: Object.freeze({
    id: 'environment',
    hurtSeconds: 0.18,
    impulseMultiplier: 0.78,
    impactMultiplier: 0.88,
    animation: 'emote-no',
    animationSpeed: 1.5
  })
});

const ENVIRONMENT_SOURCES = new Set(['ground-fall', 'fall-zone']);

export function resolvePlayerHitReaction({
  source = '',
  amount = 1,
  knockback = 1.25,
  blocked = false,
  profile = null
} = {}) {
  if (blocked) return PLAYER_HIT_REACTION_PROFILES.blocked;
  if (profile && PLAYER_HIT_REACTION_PROFILES[profile]) {
    return PLAYER_HIT_REACTION_PROFILES[profile];
  }
  if (ENVIRONMENT_SOURCES.has(source)) {
    return PLAYER_HIT_REACTION_PROFILES.environment;
  }
  if (source.startsWith('boss-') || Number(amount) >= 2 || Number(knockback) >= 1.8) {
    return PLAYER_HIT_REACTION_PROFILES.heavy;
  }
  return PLAYER_HIT_REACTION_PROFILES.light;
}

export function createGodotHitReactionProfiles() {
  return {
    schema: PLAYER_HIT_REACTION_SCHEMA,
    version: PLAYER_HIT_REACTION_VERSION,
    profiles: Object.fromEntries(Object.entries(PLAYER_HIT_REACTION_PROFILES).map(([id, profile]) => [
      id,
      {
        id: profile.id,
        hurtSeconds: profile.hurtSeconds,
        impulseMultiplier: profile.impulseMultiplier,
        impactMultiplier: profile.impactMultiplier,
        animation: profile.animation,
        animationSpeed: profile.animationSpeed
      }
    ]))
  };
}
