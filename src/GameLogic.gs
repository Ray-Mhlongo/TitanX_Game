// Pure game rules: kept independent of Apps Script services so Node can exercise them.
var GameLogic = (function () {
  var transitions = {
    LOBBY:['INTRODUCTION'], INTRODUCTION:['ROUND_ONE'], ROUND_ONE:['ROUND_TWO'],
    ROUND_TWO:['ROUND_THREE'], ROUND_THREE:['FINAL_DISCUSSION'],
    FINAL_DISCUSSION:['VOTING_OPEN'], VOTING_OPEN:['VOTING_CLOSED'],
    VOTING_CLOSED:['REVEAL'], REVEAL:['COMPLETED'], COMPLETED:[]
  };
  function allowedTransition(from, to) { return !!(transitions[from] && transitions[from].indexOf(to) >= 0); }
  function chooseUnique(items, count, random) {
    if (count < 0 || count > items.length) throw new Error('Not enough unique characters.');
    var pool = items.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var swap = pool[i]; pool[i] = pool[j]; pool[j] = swap;
    }
    return pool.slice(0, count);
  }
  function tally(votes) {
    var totals = {};
    votes.forEach(function (vote) { totals[vote.suspectId] = (totals[vote.suspectId] || 0) + 1; });
    var max = Object.keys(totals).reduce(function (m, id) { return Math.max(m, totals[id]); }, 0);
    var leaders = Object.keys(totals).filter(function (id) { return totals[id] === max; });
    return {totals:totals, leaders:leaders, tie:leaders.length > 1, winningAccusation:leaders.length === 1 ? leaders[0] : null};
  }
  function selectKiller(players,random){if(!players.length)throw new Error('At least one player is required.');return players[Math.floor(random()*players.length)].characterId;}
  function existingPlayer(players,tokenHash,gameId){return players.filter(function(p){return p.tokenHash===tokenHash&&p.gameId===gameId&&p.status==='active';})[0]||null;}
  function voteDecision(phase,player,suspectId,characters,existing,allowChanges){if(phase!=='VOTING_OPEN')return 'Voting is not open.';if(!player)return 'Your private player session is not active.';if(!characters.some(function(c){return c.id===suspectId;})||suspectId===player.characterId)return 'Choose a valid suspect other than yourself.';if(existing&&!allowChanges)return 'Your vote has already been recorded.';return '';}
  function revealAllowed(phase){return phase==='REVEAL'||phase==='COMPLETED';}
  function voteResultsAllowed(phase){return phase==='VOTING_CLOSED'||phase==='REVEAL'||phase==='COMPLETED';}
  function resetRows(rows,previousGameId){return rows.filter(function(r){return r.gameId!==previousGameId;});}
  function validHostSession(token,cachedValue){return !!token&&cachedValue==='1';}
  return {allowedTransition:allowedTransition, chooseUnique:chooseUnique, tally:tally, selectKiller:selectKiller, existingPlayer:existingPlayer, voteDecision:voteDecision, revealAllowed:revealAllowed, voteResultsAllowed:voteResultsAllowed, resetRows:resetRows, validHostSession:validHostSession};
}());
