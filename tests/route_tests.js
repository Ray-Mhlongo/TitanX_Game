const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const requested = [];
const context = {
  CONFIG: { APP_TITLE: 'Who Killed the Pumpkin?' },
  HtmlService: {
    createTemplateFromFile(name) {
      requested.push(name);
      return {
        evaluate() {
          return {
            setTitle(title) { this.title = title; return this; },
            addMetaTag() { return this; }
          };
        }
      };
    }
  }
};
vm.runInNewContext(fs.readFileSync('src/Code.gs', 'utf8'), context);

function route(params, expected) {
  requested.length = 0;
  const page = context.doGet({ parameter: params });
  assert.deepEqual(requested, [expected]);
  assert.equal(page.title, 'Who Killed the Pumpkin?');
}

route({}, 'Index');
route({ host: '1' }, 'Host');
route({ presentation: '1' }, 'Presentation');
route({ host: '1', presentation: '1' }, 'Presentation');

const presentation = fs.readFileSync('src/PresentationClient.html', 'utf8');
assert.equal(presentation.includes('getPresentationState()'), true);
assert.equal(presentation.includes('localStorage'), false);
assert.equal(presentation.includes('hostLogin'), false);
assert.equal(presentation.includes('getPublicGameState'), false);

console.log('4 route checks and presentation client isolation checks passed.');
