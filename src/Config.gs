var CONFIG = {
  APP_TITLE: 'Who Killed the Pumpkin?',
  DEFAULT_MAX_PLAYERS: 13,
  MIN_PLAYERS: 2,
  PLAYER_POLL_MS: 5000,
  PLAYER_TOKEN_BYTES: 32,
  HOST_SESSION_SECONDS: 21600,
  PHASES: ['LOBBY', 'INTRODUCTION', 'ROUND_ONE', 'ROUND_TWO', 'ROUND_THREE', 'FINAL_DISCUSSION', 'VOTING_OPEN', 'VOTING_CLOSED', 'REVEAL', 'COMPLETED'],
  SHEETS: {
    Settings: ['key', 'value'],
    Players: ['playerId', 'displayName', 'gender', 'avatarId', 'tokenHash', 'characterId', 'joinedAt', 'lastSeenAt', 'status', 'gameId'],
    Characters: ['characterId', 'name', 'roleType', 'description', 'motive', 'alibi', 'privateInfo', 'knows', 'objective', 'relationship', 'assignedGameId', 'assignmentStatus'],
    Evidence: ['clueId', 'round', 'title', 'description', 'releaseOrder', 'released', 'hostNote', 'gameId'],
    Votes: ['gameId', 'roundId', 'playerId', 'targetPlayerId', 'suspectId', 'submittedAt', 'lastUpdatedAt'],
    GameLog: ['timestamp', 'gameId', 'event', 'details'],
    GameHistory: ['gameId', 'completedAt', 'actualCulprit', 'winningAccusation', 'voteTotals', 'correctAccusation']
  }
};
var CHARACTER_GENDER_MAP={vampire:'Female',witch:'Female',ghost:'Male',werewolf:'Male',scientist:'Male',fortune:'Female',caretaker:'Male',masked:'Female',potion:'Male',detective:'Male',butler:'Male',gravekeeper:'Female',pianist:'Female',baker:'Female',artist:'Female',guardian:'Male',jester:'Male',oracle:'Female',mummy:'Male',siren:'Female',gargoyle:'Male',taxidermist:'Female',cryptographer:'Male',beekeeper:'Female',bellringer:'Male',puppeteer:'Female',librarian:'Female',chimney:'Male',clockmaker:'Male',ravenkeeper:'Male',stargazer:'Female'};
function characterGender_(character){return CHARACTER_GENDER_MAP[character.id]||'Female';}
