const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(openById) {
  const properties = {};
  const events = [];
  const sheets = {};
  const ss = {
    getName: () => 'Mystery DB',
    getSheetByName: name => sheets[name] || null,
    insertSheet: name => (sheets[name] = { name, setFrozenRows: n => events.push(['freeze', name, n]) })
  };
  const context = {
    CONFIG: { SHEETS: { Settings: ['key', 'value'], Players: ['playerId'], Characters: ['characterId'] }, DEFAULT_MAX_PLAYERS: 12 },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties[key] || null,
      setProperty: (key, value) => { events.push(['save', key, value]); properties[key] = value; }
    }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => { throw new Error('must not ask for active sheet'); }, openById: id => { events.push(['open', id]); return openById(id, ss); } },
    LockService: { getScriptLock: () => ({ waitLock: ms => events.push(['lock', ms]), releaseLock: () => events.push(['unlock']) }) },
    console
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/Database.gs'), 'utf8'), context);
  context.migrateSheetSchema_ = (sheet, headers) => events.push(['migrate', sheet.name, headers]);
  context.settingGet_ = key => '';
  context.settingSet_ = (key, value) => events.push(['setting', key, value]);
  context.defaultState_ = () => ({ phase: 'LOBBY' });
  context.seedCharacters_ = () => events.push(['seed']);
  return { context, properties, events, sheets };
}

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }

test('standalone setup validates access, stores the ID, and initializes configured tabs', () => {
  const h = harness((id, ss) => { assert.equal(id, 'sheet-123'); return ss; });
  assert.equal(h.context.setupDatabaseWithId_('  sheet-123  '), 'Database ready: Mystery DB');
  assert.equal(h.properties.TITANX_SPREADSHEET_ID, 'sheet-123');
  assert.deepEqual(h.events.filter(e => e[0] === 'migrate').map(e => e[1]), ['Settings', 'Players', 'Characters']);
  assert.ok(h.events.some(e => e[0] === 'seed'));
  assert.equal(h.events.at(-1)[0], 'unlock');
});

test('invalid or inaccessible spreadsheet is not saved', () => {
  const h = harness(() => { throw new Error('permission denied'); });
  assert.throws(() => h.context.setupDatabaseWithId_('bad-id'), /Check that the spreadsheet ID is correct/);
  assert.equal(h.properties.TITANX_SPREADSHEET_ID, undefined);
  assert.ok(!h.events.some(e => e[0] === 'save'));
  assert.equal(h.events.at(-1)[0], 'unlock');
});

test('setupDatabase_ requires configured Script Property and uses openById', () => {
  const h = harness((id, ss) => { assert.equal(id, 'configured-id'); return ss; });
  h.properties.TITANX_SPREADSHEET_ID = 'configured-id';
  assert.equal(h.context.setupDatabase_(), 'Database ready: Mystery DB');
  assert.ok(h.events.some(e => e[0] === 'open' && e[1] === 'configured-id'));
  assert.ok(!h.events.some(e => e[0] === 'save'));
  const empty = harness(() => { throw new Error('must not open'); });
  assert.throws(() => empty.context.setupDatabase_(), /Run setupDatabaseWithId_/);
});

console.log(`${passed} database setup tests passed`);
