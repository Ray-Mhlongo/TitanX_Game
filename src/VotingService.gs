function submitVote(playerToken,suspectId) {
  try {var hash=digest_(String(playerToken||'')),lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=JSON.parse(settingGet_('state')||'{}');
    var players=rows_('Players'),player=GameLogic.existingPlayer(players,hash,state.gameId);
    var votes=rows_('Votes'),existing=player?votes.filter(function(v){return v.gameId===state.gameId&&v.playerId===player.playerId;})[0]:null;
    var eligible=rows_('Players').filter(function(p){return p.gameId===state.gameId&&p.status==='active';}).map(function(p){return {id:p.characterId};});
    var decision=GameLogic.voteDecision(state.phase,player,suspectId,eligible,existing,settingGet_('allowVoteChanges')==='true');if(decision)return {ok:false,error:decision};
    if(existing){existing.suspectId=suspectId;existing.submittedAt=now_();rewriteRows_('Votes',votes);}else appendObject_('Votes',{gameId:state.gameId,playerId:player.playerId,suspectId:suspectId,submittedAt:now_()});
    return {ok:true,message:'Your accusation is sealed.'};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
