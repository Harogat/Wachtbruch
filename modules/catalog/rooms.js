export const DEFAULT_ROOM_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'wachhof',
    name: 'Wachhof',
    waves: Object.freeze([
      Object.freeze({ id: 'wachhof-welle-1', name: 'Erste Bresche', intermission: 2.1, rewardCoins: 1, boss: false }),
      Object.freeze({ id: 'wachhof-welle-2', name: 'Nachhut', intermission: 2.0, rewardCoins: 2, boss: false })
    ])
  }),
  Object.freeze({
    id: 'tiefe-wacht',
    name: 'Tiefe Wacht',
    waves: Object.freeze([
      Object.freeze({ id: 'tiefe-wacht-welle-1', name: 'Vorhut', intermission: 1.5, rewardCoins: 1, boss: false }),
      Object.freeze({ id: 'tiefe-wacht-welle-2', name: 'Speerwall', intermission: 1.8, rewardCoins: 2, boss: false })
    ])
  }),
  Object.freeze({
    id: 'bruchkammer',
    name: 'Bruchkammer',
    waves: Object.freeze([
      Object.freeze({ id: 'bruchkammer-boss', name: 'Bruchhauptmann', intermission: 1.8, rewardCoins: 4, boss: true })
    ])
  }),
  Object.freeze({
    id: 'wachtschlucht',
    name: 'Wachtschlucht',
    waves: Object.freeze([
      Object.freeze({ id: 'wachtschlucht-welle-1', name: 'Waechter am Abgrund', intermission: 1.6, rewardCoins: 3, boss: false })
    ])
  })
]);

export function createDefaultRoomDefinitions() {
  return DEFAULT_ROOM_DEFINITIONS.map((room) => ({
    ...room,
    waves: room.waves.map((wave) => ({ ...wave }))
  }));
}
