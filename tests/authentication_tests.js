const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const properties = {};
const cache = new Map();
const secretLogs = [];
let uuid = 0;
const context = {
  CONFIG: { HOST_SESSION_SECONDS: 21600 },
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => properties[key] || null,
    setProperties: values => Object.assign(properties, values)
  }) },
  CacheService: { getScriptCache: () => ({
    get: key => cache.has(key) ? cache.get(key) : null,
    put: (key, value) => cache.set(key, value),
    remove: key => cache.delete(key)
  }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Session: { getTemporaryActiveUserKey: () => 'test-owner-user-key' },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA-256' },
    Charset: { UTF_8: 'UTF-8' },
    computeDigest: (algorithm, value) => Array.from(crypto.createHash('sha256').update(String(value)).digest()).map(b => b > 127 ? b - 256 : b),
    getUuid: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0')
  },
  Logger: { log: message => secretLogs.push(String(message)) },
  GameLogic: { validHostSession: (token, cached, expected) => !!token && !!cached && cached === (expected || '1') }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/Authentication.gs'), 'utf8'), context);

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }
function lastSecret() {
  const match = secretLogs[secretLogs.length - 1].match(/: ([a-f0-9]+)$/);
  assert.ok(match);
  return match[1];
}

test('initial host setup stores only a salted digest and version', () => {
  context.configureInitialHost_();
  const secret = lastSecret();
  assert.ok(properties.HOST_HASH);
  assert.ok(properties.HOST_SALT);
  assert.ok(properties.HOST_SESSION_VERSION);
  assert.notEqual(properties.HOST_HASH, secret);
  assert.equal(Object.values(properties).includes(secret), false);
});

test('valid host login creates a revocable versioned session', () => {
  const session = context.hostLogin(lastSecret());
  assert.equal(session.ok, true);
  assert.doesNotThrow(() => context.requireHost_(session.token));
  assert.equal(context.logoutHost(session.token).ok, true);
  assert.throws(() => context.requireHost_(session.token), /Host session expired/);
});

test('rotation invalidates the exposed secret and every previous host session', () => {
  const oldSecret = lastSecret();
  const oldSession = context.hostLogin(oldSecret);
  assert.equal(oldSession.ok, true);
  const priorVersion = properties.HOST_SESSION_VERSION;
  context.rotateHostSecret_();
  const newSecret = lastSecret();
  assert.notEqual(properties.HOST_SESSION_VERSION, priorVersion);
  assert.throws(() => context.requireHost_(oldSession.token), /Host session expired/);
  assert.equal(context.hostLogin(oldSecret).ok, false);
  const newSession = context.hostLogin(newSecret);
  assert.equal(newSession.ok, true);
  assert.doesNotThrow(() => context.requireHost_(newSession.token));
});

test('invalid host attempts are throttled', () => {
  context.logoutHost(context.hostLogin(lastSecret()).token);
  for (let i = 0; i < 8; i++) assert.equal(context.hostLogin('wrong-secret-' + i).ok, false);
  assert.match(context.hostLogin('another-wrong-secret').error, /Too many attempts/);
});

console.log(passed + ' authentication tests passed');
