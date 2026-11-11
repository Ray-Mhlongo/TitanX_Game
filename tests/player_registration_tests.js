const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const players = [];
const assignments = {};
let tokenSequence = 0;
const state = { gameId: 'test-game', phase: 'LOBBY', registrationOpen: true, startedAt: '', killerId: '' };
const context = {
  CONFIG: { MIN_PLAYERS: 4, DEFAULT_MAX_PLAYERS: 12 },
  CHARACTERS: [{ id: 'one', name: 'One', role: 'Role one' }, { id: 'two', name: 'Two', role: 'Role two' }, { id: 'three', name: 'Three', role: 'Role three' }],
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Math,
  settingGet_: key => key === 'state' ? JSON.stringify(state) : key === 'playerLimit' ? '12' : 'true',
  rows_: name => name === 'Players' ? players : [],
  digest_: value => 'hash:' + value,
  randomToken_: () => 'token-' + (++tokenSequence),
  now_: () => '2026-11-06T12:00:00.000Z',
  isActivePlayer_: player => player.status === 'ACTIVE',
  avatarIdForGender_: gender => gender === 'Male' ? 'pumpkin-male' : 'pumpkin-female',
  characterCard_: player => ({ id: player.characterId, playerName: player.displayName, role: 'Private role: ' + player.characterId }),
  appendObject_: (name, player) => { if (name === 'Players') players.push(player); },
  rewriteRows_: (name, rows) => { if (name === 'Players') players.splice(0, players.length, ...rows); },
  setCharacterAssignment_: (id, gameId) => { assignments[id] = gameId; },
  log_: () => {}
};
vm.runInNewContext(fs.readFileSync('src/PlayerService.gs', 'utf8'), context);

const male = context.registerPlayer('Alex', 'Male', '');
assert.equal(male.ok, true);
assert.equal(players[0].gender, 'Male');
assert.equal(players[0].avatarId, 'pumpkin-male');
assert.equal(male.character.id, players[0].characterId);
assert.equal(male.character.role, context.CHARACTERS.find(c => c.id === players[0].characterId).role);

const female = context.registerPlayer('Sam', 'Female', '');
assert.equal(female.ok, true);
assert.equal(players[1].gender, 'Female');
assert.equal(players[1].avatarId, 'pumpkin-female');
assert.notEqual(players[0].characterId, players[1].characterId);
assert.equal(female.character.role, context.CHARACTERS.find(c => c.id === players[1].characterId).role);

const privateRecovery = context.getMyCharacter(male.token);
assert.equal(privateRecovery.ok, true);
assert.equal(privateRecovery.character.id, male.character.id);
assert.notEqual(privateRecovery.character.id, female.character.id);

const reconnect = context.registerPlayer('Alex', 'Female', male.token);
assert.equal(reconnect.ok, true);
assert.equal(reconnect.token, male.token);
assert.equal(reconnect.character.id, male.character.id);
assert.equal(players.length, 2);

const invalid = context.registerPlayer('Taylor', 'Prefer not to say', '');
assert.equal(invalid.ok, false);
assert.match(invalid.error, /Select Male or Female/);
assert.equal(players.length, 2);

const html = fs.readFileSync('src/Index.html', 'utf8');
assert.match(html, /<option value="Male">Male<\/option>\s*<option value="Female">Female<\/option>/);
assert.doesNotMatch(html, /Prefer not to say/);
const client = fs.readFileSync('src/Client.html', 'utf8');
assert.match(client, /registerPlayer',\[\$\('display-name'\)\.value,\$\('gender-choice'\)\.value,playerToken\]/);

console.log('6 player registration checks passed.');
