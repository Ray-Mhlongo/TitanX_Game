const fs=require('fs');
const code=fs.readFileSync('src/Code.gs','utf8');
const bridge=fs.readFileSync('src/Bridge.html','utf8');
const api=fs.readFileSync('assets/js/api.js','utf8');
const allowlist=code.match(/function bridgeMethods_\(\)\s*\{([\s\S]*?)\n\}/)[1];
let checks=0;
function check(condition,message){if(!condition){console.error('FAIL '+message);process.exitCode=1;}else{checks++;console.log('PASS '+message);}}
const methods=['getPublicGameState','registerPlayer','submitVote','getPresentationState','hostLogin','getHostDashboardState','logoutHost','hostVotingAction','transitionGame','releaseNextClue','createGame','hostSetSettings','revokePlayer','hostPresentationMedia'];
for(const method of methods)check(new RegExp('\\b'+method+':'+method+'\\b').test(allowlist),'bridge allows required method '+method);
check(!/google\.script\.run/.test(api),'static client has no direct Apps Script runtime dependency');
check(code.includes("Object.prototype.hasOwnProperty.call(methods,request.method)"),'server dispatch enforces own-property allowlist');
check(code.includes('validBridgeTicket_(request)')&&code.includes('Utilities.computeHmacSha256Signature'),'POST requires a valid signed bridge ticket');
check(code.includes("/\\^\\\\/TitanX_Game")||code.includes('TitanX_Game\\/'),'server restricts bridge requests to expected Pages paths');
check(code.includes("var origin='https://ray-mhlongo.github.io'"),'responses are pinned to the GitHub Pages origin');
check(bridge.includes('window.top.postMessage')&&bridge.includes("'<?= nonce ?>'"),'anonymous bridge route returns a nonce to the approved top origin');
check(code.includes('setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)'),'bridge output is frameable for static Pages integration');
console.log(checks+' bridge checks passed.');
