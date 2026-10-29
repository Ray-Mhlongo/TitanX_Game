function createGame(hostToken, maxPlayers) {
  try {
    requireHost_(hostToken); var lock=LockService.getScriptLock();lock.waitLock(20000);
    try {
      var limit=Number(maxPlayers||settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS);
      if(limit<CONFIG.MIN_PLAYERS||limit>CHARACTERS.length)return {ok:false,error:'Choose a player limit from 4 to '+CHARACTERS.length+'.'};
      var previous=JSON.parse(settingGet_('state')||'{}');
      if(previous.gameId&&previous.phase==='COMPLETED') saveHistory_(previous);
      var id=randomToken_().slice(0,16), state=defaultState_();state.gameId=id;
      settingSet_('state',JSON.stringify(state));settingSet_('playerLimit',String(limit));
      rewriteRows_('Players',GameLogic.resetRows(rows_('Players'),previous.gameId));
      rewriteRows_('Votes',GameLogic.resetRows(rows_('Votes'),previous.gameId));
      rewriteRows_('Evidence',GameLogic.resetRows(rows_('Evidence'),previous.gameId));
      CHARACTERS.forEach(function(c){setCharacterAssignment_(c.id,'');});
      log_(id,'game_created','New lobby opened.');return {ok:true,data:hostState_(state)};
    }finally{lock.releaseLock();}
  }catch(e){return {ok:false,error:safeError_(e)};}
}
function saveHistory_(state) {
  var votes=rows_('Votes').filter(function(v){return v.gameId===state.gameId;}), t=GameLogic.tally(votes), winner=t.winningAccusation;
  appendObject_('GameHistory',{gameId:state.gameId,completedAt:now_(),actualCulprit:state.killerId,winningAccusation:winner||'INCONCLUSIVE',voteTotals:JSON.stringify(t.totals),correctAccusation:winner===state.killerId?'true':'false'});
}
function transitionGame(hostToken,nextPhase) {
  try {requireHost_(hostToken);var lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=JSON.parse(settingGet_('state')||'{}');if(nextPhase==='VOTING_OPEN'||nextPhase==='VOTING_CLOSED')return {ok:false,error:'Use the voting controls to manage a poll.'};if(!GameLogic.allowedTransition(state.phase,nextPhase))return {ok:false,error:'That phase transition is not available.'};
    if(nextPhase==='INTRODUCTION'){
      var players=rows_('Players').filter(function(p){return p.gameId===state.gameId&&isActivePlayer_(p);});
      if(players.length<CONFIG.MIN_PLAYERS)return {ok:false,error:'At least '+CONFIG.MIN_PLAYERS+' players must join before the game starts.'};
      state.registrationOpen=false;state.startedAt=now_();state.killerId=GameLogic.selectKiller(players,Math.random);
      setupEvidence_(state);log_(state.gameId,'game_started','Mystery began.');
    }
    if(nextPhase==='VOTING_OPEN') {if(!state.startedAt)return {ok:false,error:'Start the mystery before voting.'};}
    state.phase=nextPhase;state.phaseStartedAt=now_();
    if(nextPhase==='VOTING_OPEN')log_(state.gameId,'voting_opened','Private voting opened.');
    if(nextPhase==='VOTING_CLOSED')log_(state.gameId,'voting_closed','Private voting closed.');
    if(nextPhase==='REVEAL'){state.solutionRevealed=true;log_(state.gameId,'solution_revealed','Final reveal opened.');}
    settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
function setupEvidence_(state) {
  var existing=rows_('Evidence').filter(function(e){return e.gameId!==state.gameId;}),newRows=cluesForKiller_(state.killerId).map(function(c,i){return {clueId:c.id,round:c.round,title:c.title,description:c.description,releaseOrder:i+1,released:false,hostNote:c.hostNote,gameId:state.gameId};});
  rewriteRows_('Evidence',existing.concat(newRows));
}
function releaseNextClue(hostToken) {
  try {requireHost_(hostToken);var lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=JSON.parse(settingGet_('state')||'{}');if(['INTRODUCTION','ROUND_ONE','ROUND_TWO','ROUND_THREE','FINAL_DISCUSSION'].indexOf(state.phase)<0)return {ok:false,error:'Clues can only be released during the investigation.'};
    var all=rows_('Evidence').filter(function(e){return e.gameId===state.gameId;}),next=all.filter(function(e){return String(e.released)!=='true';}).sort(function(a,b){return Number(a.releaseOrder)-Number(b.releaseOrder);})[0];
    if(!next)return {ok:false,error:'All evidence has been released.'};var sheet=db_().getSheetByName('Evidence'),data=sheet.getDataRange().getValues();
    for(var i=1;i<data.length;i++)if(data[i][0]===next.clueId&&data[i][7]===state.gameId){sheet.getRange(i+1,6).setValue(true);break;}
    state.clueCursor=Number(next.releaseOrder);settingSet_('state',JSON.stringify(state));log_(state.gameId,'clue_released',next.clueId);return {ok:true,data:hostState_(state)};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
function hostSetSettings(hostToken, settings) {
  try {requireHost_(hostToken);var lock=LockService.getScriptLock();lock.waitLock(20000);try{var state=JSON.parse(settingGet_('state')||'{}');if(state.phase!=='LOBBY')return {ok:false,error:'These settings can only change in the lobby.'};
    if(settings.playerLimit!==undefined){var n=Number(settings.playerLimit);if(n<CONFIG.MIN_PLAYERS||n>CHARACTERS.length)return {ok:false,error:'Player limit must be 4–'+CHARACTERS.length+'.'};settingSet_('playerLimit',String(n));}
    if(settings.allowVoteChanges!==undefined)settingSet_('allowVoteChanges',settings.allowVoteChanges?'true':'false');
    if(settings.registrationOpen!==undefined)state.registrationOpen=!!settings.registrationOpen;
    if(settings.durationSeconds!==undefined){var d=Number(settings.durationSeconds);if(d<60||d>3600)return {ok:false,error:'Timer must be between 1 and 60 minutes.'};state.durationSeconds=d;}
    settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
function resetGame(hostToken) {return createGame(hostToken,Number(settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS));}
function hostSolution_(state) {
  var c=CHARACTERS.filter(function(x){return x.id===state.killerId;})[0];if(!c)return null;
  var votes=rows_('Votes').filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===String(state.votingRound||1);}), result=GameLogic.tally(votes);
  var solution={culpritId:c.id,culprit:c.name,motive:c.motive,timeline:STORY.solution.timeline,decisive:'The portrait matches '+CHARACTER_MARKS[c.id]+', this guest’s public costume detail. The garden route and matching metallic green paint confirm the timeline; the torn note echoes this character’s public motive.',redHerrings:STORY.solution.redHerrings};
  if(GameLogic.voteResultsAllowed(state.phase)){solution.voteTotals=result.totals;solution.winningAccusation=result.winningAccusation;solution.tie=result.tie;solution.correctAccusation=result.winningAccusation===c.id;}
  return solution;
}
function hostState_(state) {
  var allPlayers=rows_('Players').filter(function(p){return p.gameId===state.gameId;}),players=allPlayers.filter(isActivePlayer_).map(function(p){var c=CHARACTERS.filter(function(x){return x.id===p.characterId;})[0];return {id:p.playerId,name:p.displayName,character:c?c.name:'',characterId:p.characterId,avatarId:p.avatarId||avatarIdForGender_(p.gender),status:p.status,joinedAt:p.joinedAt};});
  var eliminated=allPlayers.filter(function(p){return p.status==='ELIMINATED';}).map(function(p){var c=CHARACTERS.filter(function(x){return x.id===p.characterId;})[0];return {id:p.playerId,name:p.displayName,character:c?c.name:'',characterId:p.characterId,avatarId:p.avatarId||avatarIdForGender_(p.gender),status:p.status,joinedAt:p.joinedAt};});
  var votes=rows_('Votes').filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===String(state.votingRound||1);}),data={gameId:state.gameId,phase:state.phase,phaseStartedAt:state.phaseStartedAt,durationSeconds:Number(state.durationSeconds||60),votingDeadline:state.votingDeadline||'',autoClose:state.autoClose!==false,resultsRevealed:!!state.resultsRevealed,runoffCharacterIds:state.runoffCharacterIds||[],eliminationAnnouncement:state.eliminationAnnouncement||'',votingRound:Number(state.votingRound||0),startedAt:state.startedAt,registrationOpen:state.registrationOpen,playerLimit:Number(settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS),playerCount:players.length,eligibleCount:players.length,players:players.concat(eliminated),voteCount:votes.length,characterCount:CHARACTERS.length,characters:players.concat(eliminated).map(function(p){var c=CHARACTERS.filter(function(x){return x.id===p.characterId;})[0];return c?{id:c.id,name:c.name,role:c.role,description:c.description,avatarId:p.avatarId,status:p.status,mark:CHARACTER_MARKS[c.id]}:null;}).filter(Boolean),evidence:rows_('Evidence').filter(function(e){return e.gameId===state.gameId;}).sort(function(a,b){return Number(a.releaseOrder)-Number(b.releaseOrder);}).map(function(e){return {id:e.clueId,round:e.round,title:e.title,released:String(e.released)==='true',hostNote:e.hostNote};}),solution:hostSolution_(state),publicUrl:ScriptApp.getService().getUrl()||''};
  if(GameLogic.voteResultsAllowed(state.phase)&&state.resultsRevealed)data.voteTotals=GameLogic.tally(votes).totals;
  return data;
}
function getHostDashboardState(hostToken) {try{requireHost_(hostToken);var state=JSON.parse(settingGet_('state')||'{}');return {ok:true,data:hostState_(state)};}catch(e){return {ok:false,error:safeError_(e)};}}
function getPublicGameState(playerToken) {
  try {var state=JSON.parse(settingGet_('state')||'{}');if(state.phase==='VOTING_OPEN'&&state.autoClose&&state.votingDeadline&&Date.now()>=Date.parse(state.votingDeadline)){var lock=LockService.getScriptLock();lock.waitLock(20000);try{state=JSON.parse(settingGet_('state')||'{}');if(state.phase==='VOTING_OPEN'&&state.autoClose&&Date.now()>=Date.parse(state.votingDeadline)){state.phase='VOTING_CLOSED';state.votingDeadline='';settingSet_('state',JSON.stringify(state));log_(state.gameId,'voting_closed','Deadline reached.');}}finally{lock.releaseLock();}}var player=null;if(playerToken){var h=digest_(playerToken);player=rows_('Players').filter(function(p){return p.tokenHash===h&&p.gameId===state.gameId&&['ACTIVE','ELIMINATED'].indexOf(p.status)>=0;})[0]||null;}
    var data=publicState_(state,player);
    if(GameLogic.voteResultsAllowed(state.phase)&&state.resultsRevealed){var votes=rows_('Votes').filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===String(state.votingRound||1);}), tally=GameLogic.tally(votes);data.voteTotals=tally.totals;data.voteTie=tally.tie;data.winningAccusation=tally.winningAccusation;}
    if(state.solutionRevealed)data.reveal=hostSolution_(state);
    return {ok:true,data:data};
  }catch(e){return {ok:false,error:safeError_(e)};}
}
function safeError_(e){var s=String(e&&e.message||'');if(/database is not configured/i.test(s))return 'Game setup is incomplete. Ask the host to finish setup.';if(/host session expired/i.test(s))return 'Host session expired. Please log in again.';return 'That action could not be completed. Please refresh and try again.';}
