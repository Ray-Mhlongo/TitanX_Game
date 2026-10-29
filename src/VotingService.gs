function submitVote(playerToken,suspectId) {
  try {var hash=digest_(String(playerToken||'')),lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=JSON.parse(settingGet_('state')||'{}');
    if(state.phase==='VOTING_OPEN'&&state.autoClose&&state.votingDeadline&&Date.now()>=Date.parse(state.votingDeadline)){state.phase='VOTING_CLOSED';settingSet_('state',JSON.stringify(state));log_(state.gameId,'voting_closed','Deadline reached.');return {ok:false,error:'Voting has closed.'};}
    var players=rows_('Players'),player=players.filter(function(p){return p.tokenHash===hash&&p.gameId===state.gameId&&isActivePlayer_(p);})[0];
    var roundId=String(state.votingRound||1),votes=rows_('Votes'),existing=player?votes.filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===roundId&&v.playerId===player.playerId;})[0]:null;
    var eligible=players.filter(function(p){return p.gameId===state.gameId&&isActivePlayer_(p);}).map(function(p){return {id:p.characterId};});
    if(state.runoffCharacterIds&&state.runoffCharacterIds.length)eligible=eligible.filter(function(c){return state.runoffCharacterIds.indexOf(c.id)>=0;});
    var decision=GameLogic.voteDecision(state.phase,player,suspectId,eligible,existing,settingGet_('allowVoteChanges')==='true');if(decision)return {ok:false,error:decision};
    var target=players.filter(function(p){return p.gameId===state.gameId&&isActivePlayer_(p)&&p.characterId===suspectId;})[0];if(!target)return {ok:false,error:'That suspect is no longer eligible.'};
    var stamp=now_();if(existing){existing.suspectId=suspectId;existing.targetPlayerId=target.playerId;existing.lastUpdatedAt=stamp;rewriteRows_('Votes',votes);}else appendObject_('Votes',{gameId:state.gameId,roundId:roundId,playerId:player.playerId,targetPlayerId:target.playerId,suspectId:suspectId,submittedAt:stamp,lastUpdatedAt:stamp});
    return {ok:true,message:'Your vote is sealed.'};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
function hostVotingAction(hostToken,action,options) {
  try {requireHost_(hostToken);options=options||{};var lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=JSON.parse(settingGet_('state')||'{}');if(state.phase==='VOTING_OPEN'&&state.autoClose&&state.votingDeadline&&Date.now()>=Date.parse(state.votingDeadline)){state.phase='VOTING_CLOSED';state.votingDeadline='';settingSet_('state',JSON.stringify(state));}
    var players=rows_('Players').filter(function(p){return p.gameId===state.gameId;}),currentRound=String(state.votingRound||1);
    var roundVotes=rows_('Votes').filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===currentRound;}),eligible=players.filter(isActivePlayer_);
    if(action==='open'||action==='next'||action==='reopen'||action==='runoff'){
      if(state.phase==='VOTING_OPEN')return {ok:false,error:'Voting is already open.'};
      var seconds=options.durationSeconds===undefined?60:Number(options.durationSeconds);if(!isFinite(seconds)||seconds<10||seconds>600)return {ok:false,error:'Voting duration must be between 10 and 600 seconds.'};
      if((action==='open'||action==='next')&&!['FINAL_DISCUSSION','ROUND_ONE','ROUND_TWO','ROUND_THREE','VOTING_CLOSED'].includes(state.phase))return {ok:false,error:'Voting cannot open in this phase.'};
      if(action==='runoff') {if(state.phase!=='VOTING_CLOSED'||!state.resultsRevealed)return {ok:false,error:'Reveal a closed tied poll before starting a runoff.'};var tally=GameLogic.tally(roundVotes);if(!tally.tie)return {ok:false,error:'A runoff is only available after a tie.'};var ids=(options.characterIds||[]).filter(function(id){return eligible.some(function(p){return isActivePlayer_(p)&&p.characterId===id;})&&tally.leaders.indexOf(id)>=0;});if(ids.length!==tally.leaders.length)return {ok:false,error:'Runoff candidates must be the tied active suspects.'};state.runoffCharacterIds=ids;}
      else if(action==='reopen'||action==='runoff'){
        if(action==='reopen'){if(state.phase!=='VOTING_CLOSED'||!state.resultsRevealed)return {ok:false,error:'Reveal the closed poll before reopening it.'};var closedTally=GameLogic.tally(roundVotes);if(roundVotes.length&&!closedTally.tie)return {ok:false,error:'Only a tied or empty poll can be reopened.'};state.runoffCharacterIds=[];}
        state.votingRound=Number(state.votingRound||1)+1;
      }
      else {state.votingRound=Number(state.votingRound||0)+1;state.runoffCharacterIds=[];}
      state.phase='VOTING_OPEN';state.phaseStartedAt=now_();state.durationSeconds=seconds;state.autoClose=options.autoClose!==false;state.votingDeadline=new Date(Date.now()+seconds*1000).toISOString();state.resultsRevealed=false;state.eliminationPending='';
      settingSet_('state',JSON.stringify(state));log_(state.gameId,action==='runoff'?'runoff_opened':'voting_opened','Round '+state.votingRound);return {ok:true,data:hostState_(state)};
    }
    if(action==='close') {if(state.phase!=='VOTING_OPEN')return {ok:false,error:'Voting is not open.'};state.phase='VOTING_CLOSED';state.votingDeadline='';settingSet_('state',JSON.stringify(state));log_(state.gameId,'voting_closed','Host closed voting.');return {ok:true,data:hostState_(state)};}
    if(action==='extend') {if(state.phase!=='VOTING_OPEN')return {ok:false,error:'Voting is not open.'};var add=options.durationSeconds===undefined?30:Number(options.durationSeconds);if(!isFinite(add)||add<10||add>600)return {ok:false,error:'Extension must be between 10 and 600 seconds.'};state.votingDeadline=new Date(Math.max(Date.now(),Date.parse(state.votingDeadline||now_()))+add*1000).toISOString();state.durationSeconds=Math.max(0,Math.ceil((Date.parse(state.votingDeadline)-Date.parse(state.phaseStartedAt))/1000));settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};}
    if(action==='reveal') {if(state.phase!=='VOTING_CLOSED')return {ok:false,error:'Close voting before revealing results.'};state.resultsRevealed=true;settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};}
    if(action==='skip') {if(state.phase!=='VOTING_CLOSED')return {ok:false,error:'Close voting before skipping.'};state.phase='FINAL_DISCUSSION';state.runoffCharacterIds=[];state.resultsRevealed=false;settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};}
    if(action==='revealSolution'){if(!state.startedAt)return {ok:false,error:'Start the mystery before revealing the solution.'};state.solutionRevealed=true;state.phase='COMPLETED';settingSet_('state',JSON.stringify(state));log_(state.gameId,'solution_revealed','Host opened the final reveal.');return {ok:true,data:hostState_(state)};}
    if(action==='eliminate') {
      if(state.phase!=='VOTING_CLOSED'||!state.resultsRevealed)return {ok:false,error:'Reveal the results before confirming an elimination.'};
      var tally=GameLogic.tally(roundVotes);if(!tally.winningAccusation)return {ok:false,error:'A tie or empty ballot cannot eliminate anyone.'};
      var characterId=String(options.characterId||tally.winningAccusation);if(characterId!==tally.winningAccusation)return {ok:false,error:'Confirm only the unique highest vote getter.'};
      var player=players.filter(function(p){return isActivePlayer_(p)&&p.characterId===characterId;})[0];if(!player)return {ok:false,error:'That player is no longer active.'};player.status='ELIMINATED';rewriteRows_('Players',rows_('Players').map(function(p){return p.playerId===player.playerId?player:p;}));state.eliminatedCharacterId=characterId;state.eliminationAnnouncement=player.characterId;state.runoffCharacterIds=[];
      if(characterId===state.killerId){state.phase='COMPLETED';state.solutionRevealed=true;log_(state.gameId,'killer_eliminated','The killer was eliminated.');}
      else {state.phase='FINAL_DISCUSSION';state.resultsRevealed=false;log_(state.gameId,'player_eliminated','An innocent suspect was eliminated.');}
      settingSet_('state',JSON.stringify(state));return {ok:true,data:hostState_(state)};
    }
    return {ok:false,error:'Unknown voting action.'};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
