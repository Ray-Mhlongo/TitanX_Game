var CONFIG = {
  APP_TITLE: 'Who Killed the Pumpkin?',
  DEFAULT_MAX_PLAYERS: 12,
  MIN_PLAYERS: 4,
  PLAYER_POLL_MS: 5000,
  PLAYER_TOKEN_BYTES: 32,
  HOST_SESSION_SECONDS: 21600,
  PHASES: ['LOBBY', 'INTRODUCTION', 'ROUND_ONE', 'ROUND_TWO', 'ROUND_THREE', 'FINAL_DISCUSSION', 'VOTING_OPEN', 'VOTING_CLOSED', 'REVEAL', 'COMPLETED'],
  SHEETS: {
    Settings: ['key', 'value'],
    Players: ['playerId', 'displayName', 'tokenHash', 'characterId', 'joinedAt', 'lastSeenAt', 'status', 'gameId'],
    Characters: ['characterId', 'name', 'roleType', 'description', 'motive', 'alibi', 'privateInfo', 'knows', 'objective', 'relationship', 'assignedGameId'],
    Evidence: ['clueId', 'round', 'title', 'description', 'releaseOrder', 'released', 'hostNote', 'gameId'],
    Votes: ['gameId', 'playerId', 'suspectId', 'submittedAt'],
    GameLog: ['timestamp', 'gameId', 'event', 'details'],
    GameHistory: ['gameId', 'completedAt', 'actualCulprit', 'winningAccusation', 'voteTotals', 'correctAccusation']
  }
};
