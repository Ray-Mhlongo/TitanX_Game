const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {
  CONFIG: { APP_TITLE: 'Who Killed the Pumpkin?', DEFAULT_MAX_PLAYERS: 12 },
  GameLogic: {
    voteResultsAllowed: phase => ['VOTING_CLOSED', 'REVEAL', 'COMPLETED'].includes(phase),
    tally: votes => {
      const totals = {};
      votes.forEach(v => { totals[v.suspectId] = (totals[v.suspectId] || 0) + 1; });
      return { totals, tie: false, winningAccusation: Object.keys(totals)[0] || null };
    }
  },
  CHARACTERS: [{ id: 'a', name: 'Aster Ash', role: 'Alchemist', description: 'A public description.', motive: 'Private motive.', privateInfo: 'SECRET_CHARACTER_CARD' }],
  CHARACTER_MARKS: { a: 'public silver brooch' },
  STORY: { intro: 'Public story.', solution: { timeline: 'Public ending timeline.', redHerrings: 'Public red herrings.' } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '12' }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  now_: () => '2026-10-31T18:00:00.000Z',
  avatarIdForGender_: () => 'pumpkin-neutral',
  isActivePlayer_: player => player && player.status === 'ACTIVE',
  characterCard_: () => ({ privateInfo: 'SECRET_CHARACTER_CARD' }),
  settingGet_: key => key === 'state' ? JSON.stringify(context.state) : key === 'playerLimit' ? '12' : 'false',
  rows_: name => ({
    Players: [{ playerId:'p1',displayName:'Public Name',characterId:'a',status:'ACTIVE',gameId:'g1',tokenHash:'SECRET_PLAYER_HASH',gender:'Prefer not to say',privateInfo:'SECRET_PLAYER_DATA' }],
    Evidence: [
      { clueId:'public-clue',round:1,title:'Released clue',description:'Public clue text.',released:true,releaseOrder:1,gameId:'g1' },
      { clueId:'hidden-clue',round:2,title:'Hidden clue',description:'SECRET_UNRELEASED_CLUE',released:false,releaseOrder:2,gameId:'g1' }
    ],
    Votes: [{ gameId:'g1',roundId:'1',playerId:'p1',suspectId:'a',targetPlayerId:'SECRET_VOTER' }]
  }[name] || [])
};

context.state = { gameId:'g1',phase:'VOTING_OPEN',phaseStartedAt:'2026-10-31T17:59:00.000Z',durationSeconds:60,votingDeadline:'2026-12-31T18:01:00.000Z',autoClose:true,registrationOpen:false,playerLimit:12,votingRound:1,runoffCharacterIds:[],resultsRevealed:false,solutionRevealed:false,killerId:'SECRET_KILLER_ID',eliminationAnnouncement:'' };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/ClueService.gs'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/GameService.gs'), 'utf8'), context);

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }

test('presentation uses a public projection with no player card or host solution', () => {
  const result = JSON.parse(JSON.stringify(context.getPresentationState()));
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(result.data, 'character'), false);
  assert.equal(Object.hasOwn(result.data, 'solution'), false);
  assert.equal(Object.hasOwn(result.data, 'killerId'), false);
  assert.equal(Object.hasOwn(result.data, 'votes'), false);
  assert.equal(Object.hasOwn(result.data.characters[0], 'role'), true);
  const json = JSON.stringify(result);
  for (const secret of ['SECRET_CHARACTER_CARD','SECRET_PLAYER_HASH','SECRET_PLAYER_DATA','SECRET_UNRELEASED_CLUE','SECRET_VOTER','SECRET_KILLER_ID']) {
    assert.equal(json.includes(secret), false, secret + ' leaked');
  }
});

test('presentation reveals only released clues and ballot counts while voting is open', () => {
  const data = context.getPresentationState().data;
  assert.deepEqual(JSON.parse(JSON.stringify(data.evidence.map(x => x.id))), ['public-clue']);
  assert.equal(data.voteCount, 1);
  assert.equal(data.eligibleVoters, 1);
  assert.equal(Object.hasOwn(data, 'voteTotals'), false);
});

test('aggregate results appear only after host reveals a closed poll', () => {
  context.state.phase = 'VOTING_CLOSED';
  context.state.resultsRevealed = false;
  assert.equal(Object.hasOwn(context.getPresentationState().data, 'voteTotals'), false);
  context.state.resultsRevealed = true;
  const data = context.getPresentationState().data;
  assert.deepEqual(JSON.parse(JSON.stringify(data.voteTotals)), { a: 1 });
  assert.equal(Object.hasOwn(data, 'votes'), false);
});

test('final solution appears only after the authoritative reveal', () => {
  context.state.phase = 'COMPLETED';
  context.state.killerId = 'a';
  context.state.solutionRevealed = false;
  assert.equal(Object.hasOwn(context.getPresentationState().data, 'reveal'), false);
  context.state.solutionRevealed = true;
  assert.equal(context.getPresentationState().data.reveal.culprit, 'Aster Ash');
});

console.log(passed + ' presentation privacy tests passed');
