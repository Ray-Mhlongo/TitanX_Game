const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = {};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../src/GameLogic.gs'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../src/GameData.gs'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../src/ClueService.gs'), 'utf8'), sandbox);
const logic = sandbox.GameLogic;
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }

test('cast has at least 30 distinct characters', () => {
  assert.ok(sandbox.CHARACTERS.length >= 30);
  assert.equal(new Set(sandbox.CHARACTERS.map(x=>x.id)).size,sandbox.CHARACTERS.length);
  assert.equal(Object.keys(sandbox.CHARACTER_MARKS).length,sandbox.CHARACTERS.length);
});
test('every killer scenario gets matching clues without naming the culprit early', () => {
  sandbox.CHARACTERS.forEach(character=>{
    const clues=sandbox.cluesForKiller_(character.id);
    const photo=clues.find(c=>c.id==='photo').description;
    const motive=clues.find(c=>c.id==='motive').description;
    assert.ok(photo.includes(sandbox.CHARACTER_MARKS[character.id]));
    assert.equal(photo.includes(character.name),false);
    assert.equal(motive.includes(character.name),false);
  });
});
test('role assignments are unique', () => {
  const roster = sandbox.CHARACTERS;
  const assigned = logic.chooseUnique(roster, 30, Math.random);
  assert.equal(new Set(assigned.map(x=>x.id)).size, 30);
});
test('killer selection returns exactly one assigned player', () => {
  const players=[{characterId:'a'},{characterId:'b'},{characterId:'c'}];
  assert.equal(logic.selectKiller(players,()=>0.4),'b');
});
test('repeat registration resolves to the existing player', () => {
  const p={tokenHash:'hash',gameId:'g',status:'active'};
  assert.equal(logic.existingPlayer([p],'hash','g'),p);
  assert.equal(logic.existingPlayer([p],'other','g'),null);
});
test('a player session cannot resolve another session', () => {
  const p={tokenHash:'hash',gameId:'g',status:'active'};
  assert.equal(logic.existingPlayer([p],'attacker','g'),null);
});
test('unauthenticated users cannot perform host actions', () => {
  assert.equal(logic.validHostSession('', '1'),false);
  assert.equal(logic.validHostSession('player-token', null),false);
  assert.equal(logic.validHostSession('host-token', '1'),true);
});
test('votes are rejected before voting opens', () => {
  assert.match(logic.voteDecision('ROUND_THREE',{characterId:'a'},'b',[{id:'b'}],null,true),/not open/);
});
test('votes reject unknown suspects', () => {
  assert.match(logic.voteDecision('VOTING_OPEN',{characterId:'a'},'missing',[{id:'b'}],null,true),/valid suspect/);
});
test('duplicate ballots are rejected when vote changes are disabled', () => {
  assert.match(logic.voteDecision('VOTING_OPEN',{characterId:'a'},'b',[{id:'b'}],{suspectId:'b'},false),/already been recorded/);
});
test('vote changes are accepted when enabled', () => {
  assert.equal(logic.voteDecision('VOTING_OPEN',{characterId:'a'},'c',[{id:'b'},{id:'c'}],{suspectId:'b'},true),'');
});
test('votes are rejected after voting closes', () => {
  assert.match(logic.voteDecision('VOTING_CLOSED',{characterId:'a'},'b',[{id:'b'}],null,true),/not open/);
});
test('individual vote details are not part of public tally', () => {
  const result=logic.tally([{playerId:'p1',suspectId:'a'},{playerId:'p2',suspectId:'a'}]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.totals)),{a:2});
  assert.equal(Object.hasOwn(result,'votes'),false);
});
test('aggregate choices remain hidden until voting closes', () => {
  assert.equal(logic.voteResultsAllowed('VOTING_OPEN'),false);
  assert.equal(logic.voteResultsAllowed('VOTING_CLOSED'),true);
});
test('solution is hidden before reveal and public at reveal', () => {
  assert.equal(logic.revealAllowed('VOTING_CLOSED'),false);
  assert.equal(logic.revealAllowed('REVEAL'),true);
});
test('phase transitions follow the state machine', () => {
  assert.equal(logic.allowedTransition('ROUND_ONE','ROUND_TWO'),true);
  assert.equal(logic.allowedTransition('ROUND_ONE','REVEAL'),false);
  assert.equal(logic.allowedTransition('COMPLETED','LOBBY'),false);
});
test('reset removes active rows but leaves history for the previous game', () => {
  const rows=[{gameId:'old'},{gameId:'new'}];
  assert.deepEqual(JSON.parse(JSON.stringify(logic.resetRows(rows,'old'))),[{gameId:'new'}]);
});
test('unique selection prevents duplicate roles when registrations are serialized', () => {
  const cards=[{id:'a'},{id:'b'},{id:'c'}], assigned=[];
  for(let i=0;i<cards.length;i++){const free=cards.filter(c=>!assigned.includes(c.id));assigned.push(logic.chooseUnique(free,1,()=>0)[0].id);}
  assert.equal(new Set(assigned).size,3);
});
console.log(`\n${passed} game logic checks passed.`);
