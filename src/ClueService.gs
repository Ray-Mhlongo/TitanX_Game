function cluesForKiller_(killerId) {
  return CLUE_BLUEPRINTS.map(function(c){var copy=Object.assign({},c);if(c.id==='photo'){copy.description='A gallery photo timestamped 8:23 (the camera runs five minutes fast) shows a figure near the garden route wearing '+CHARACTER_MARKS[killerId]+'. The image places that distinctive detail at the gate at 8:18, during the incident window.';}if(c.id==='motive'){copy.description='A private note repeats a grievance from one guest’s public motive. The fresh ink contains the same metallic green flecks found on the garden gate.';}return copy;});
}
function publicState_(state,player) {
  var evidence=rows_('Evidence').filter(function(e){return e.gameId===state.gameId&&String(e.released)==='true';}).sort(function(a,b){return Number(a.releaseOrder)-Number(b.releaseOrder);}).map(function(e){return {id:e.clueId,round:Number(e.round),title:e.title,description:e.description};});
  var players=rows_('Players').filter(function(p){return p.gameId===state.gameId&&['ACTIVE','ELIMINATED'].indexOf(p.status)>=0;});
  var chars=players.map(function(p){var c=CHARACTERS.filter(function(x){return x.id===p.characterId;})[0];return c?{id:c.id,name:c.name,description:c.description,mark:CHARACTER_MARKS[c.id],avatarId:p.avatarId||avatarIdForGender_(p.gender),status:p.status}:null;}).filter(Boolean);
  var activeCount=players.filter(isActivePlayer_).length;
  var eliminated=CHARACTERS.filter(function(c){return c.id===state.eliminationAnnouncement;})[0];
  var votes=rows_('Votes').filter(function(v){return v.gameId===state.gameId&&String(v.roundId)===String(state.votingRound||1);});
  return {gameId:state.gameId||'',gameTitle:CONFIG.APP_TITLE,phase:state.phase,phaseStartedAt:state.phaseStartedAt,durationSeconds:Number(state.durationSeconds||180),votingDeadline:state.votingDeadline||'',autoClose:state.autoClose!==false,registrationOpen:!!state.registrationOpen,playerCount:activeCount,eligibleVoters:activeCount,voteCount:votes.length,playerLimit:Number(settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS),story:STORY.intro,evidence:evidence,characters:chars,character:player?characterCard_(player,state):null,votingOpen:state.phase==='VOTING_OPEN',votingRound:Number(state.votingRound||0),runoffCharacterIds:state.runoffCharacterIds||[],voteChanges:settingGet_('allowVoteChanges')==='true',resultsRevealed:!!state.resultsRevealed,eliminationAnnouncement:state.eliminationAnnouncement||'',eliminationAnnouncementName:eliminated?eliminated.name:'',killerVictory:!!(state.eliminationAnnouncement&&state.eliminationAnnouncement===state.killerId),solutionRevealed:!!state.solutionRevealed};
}
function getPresentationState() {
  var response=getPublicGameState('');
  if(!response||!response.ok)return response;
  var d=response.data;
  var publicOnly={gameId:d.gameId,gameTitle:d.gameTitle,phase:d.phase,phaseStartedAt:d.phaseStartedAt,durationSeconds:d.durationSeconds,votingDeadline:d.votingDeadline,autoClose:d.autoClose,registrationOpen:d.registrationOpen,playerCount:d.playerCount,eligibleVoters:d.eligibleVoters,voteCount:d.voteCount,playerLimit:d.playerLimit,story:d.story,evidence:d.evidence,characters:d.characters,votingOpen:d.votingOpen,votingRound:d.votingRound,runoffCharacterIds:d.runoffCharacterIds,resultsRevealed:d.resultsRevealed,eliminationAnnouncement:d.eliminationAnnouncement,eliminationAnnouncementName:d.eliminationAnnouncementName,killerVictory:d.killerVictory,solutionRevealed:d.solutionRevealed};
  if(d.resultsRevealed&&d.voteTotals){publicOnly.voteTotals=d.voteTotals;publicOnly.voteTie=d.voteTie;publicOnly.winningAccusation=d.winningAccusation;}
  if(d.reveal)publicOnly.reveal=d.reveal;
  return {ok:true,data:publicOnly};
}
