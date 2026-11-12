const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const players = [];
const assignments = {};
let tokenSequence = 0;
const state = { gameId: 'test-game', phase: 'LOBBY', registrationOpen: true, startedAt: '', killerId: '' };
const context = {
  CONFIG: { MIN_PLAYERS: 4, DEFAULT_MAX_PLAYERS: 13 },
  CHARACTERS: [{ id: 'one', name: 'One', role: 'Role one' }, { id: 'two', name: 'Two', role: 'Role two' }, { id: 'three', name: 'Three', role: 'Role three' }],
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Math,
  settingGet_: key => key === 'state' ? JSON.stringify(state) : key === 'playerLimit' ? '13' : 'true',
  rows_: name => name === 'Players' ? players : [],
  digest_: value => 'hash:' + value,
  randomToken_: () => 'token-' + (++tokenSequence),
  now_: () => '2026-11-06T12:00:00.000Z',
  isActivePlayer_: player => player.status === 'ACTIVE',
  avatarIdForGender_: gender => 'pumpkin-neutral',
  characterCard_: player => ({ id: player.characterId, playerName: player.displayName, role: 'Private role: ' + player.characterId }),
  appendObject_: (name, player) => { if (name === 'Players') players.push(player); },
  rewriteRows_: (name, rows) => { if (name === 'Players') players.splice(0, players.length, ...rows); },
  setCharacterAssignment_: (id, gameId) => { assignments[id] = gameId; },
  log_: () => {}
};
vm.runInNewContext(fs.readFileSync('src/PlayerService.gs', 'utf8'), context);

const male = context.registerPlayer('Alex', '', '');
assert.equal(male.ok, true);
assert.equal(players[0].gender, 'Neutral');
assert.equal(players[0].avatarId, 'pumpkin-neutral');
assert.equal(male.character.id, players[0].characterId);
assert.equal(male.character.role, context.CHARACTERS.find(c => c.id === players[0].characterId).role);

const female = context.registerPlayer('Sam', '', '');
assert.equal(female.ok, true);
assert.equal(players[1].gender, 'Neutral');
assert.equal(players[1].avatarId, 'pumpkin-neutral');
assert.notEqual(players[0].characterId, players[1].characterId);
assert.equal(female.character.role, context.CHARACTERS.find(c => c.id === players[1].characterId).role);

const privateRecovery = context.getMyCharacter(male.token);
assert.equal(privateRecovery.ok, true);
assert.equal(privateRecovery.character.id, male.character.id);
assert.notEqual(privateRecovery.character.id, female.character.id);

const reconnect = context.registerPlayer('Alex', '', male.token);
assert.equal(reconnect.ok, true);
assert.equal(reconnect.token, male.token);
assert.equal(reconnect.character.id, male.character.id);
assert.equal(players.length, 2);

const third = context.registerPlayer('Taylor', '', '');
assert.equal(third.ok, true);
assert.equal(players.length, 3);

const html = fs.readFileSync('index.html', 'utf8');
assert.doesNotMatch(html, /gender-choice|Prefer not to say/);
assert.doesNotMatch(fs.readFileSync('assets/js/simplified-client.js', 'utf8'), /gender-choice/);

console.log('6 player registration checks passed.');
