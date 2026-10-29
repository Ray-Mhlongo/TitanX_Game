function cluesForKiller_(killerId) {
  return CLUE_BLUEPRINTS.map(function(c){var copy=Object.assign({},c);if(c.id==='photo'){copy.description='A gallery photo timestamped 8:23 (the camera runs five minutes fast) shows a figure near the garden route wearing '+CHARACTER_MARKS[killerId]+'. The image places that distinctive detail at the gate at 8:18, during the incident window.';}if(c.id==='motive'){copy.description='A private note repeats a grievance from one guest’s public motive. The fresh ink contains the same metallic green flecks found on the garden gate.';}return copy;});
}
function publicState_(state,player) {
  var evidence=rows_('Evidence').filter(function(e){return e.gameId===state.gameId&&String(e.released)==='true';}).sort(function(a,b){return Number(a.releaseOrder)-Number(b.releaseOrder);}).map(function(e){return {id:e.clueId,round:Number(e.round),title:e.title,description:e.description};});
  var players=rows_('Players').filter(function(p){return p.gameId===state.gameId&&p.status==='active';});
  var chars=players.map(function(p){var c=CHARACTERS.filter(function(x){return x.id===p.characterId;})[0];return c?{id:c.id,name:c.name,role:c.role,description:c.description,motive:c.motive,alibi:c.alibi,mark:CHARACTER_MARKS[c.id]}:null;}).filter(Boolean);
  return {gameTitle:CONFIG.APP_TITLE,phase:state.phase,phaseStartedAt:state.phaseStartedAt,durationSeconds:Number(state.durationSeconds||180),registrationOpen:!!state.registrationOpen,playerCount:players.length,playerLimit:Number(settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS),story:STORY.intro,evidence:evidence,characters:chars,character:player?characterCard_(player,state):null,votingOpen:state.phase==='VOTING_OPEN',voteChanges:settingGet_('allowVoteChanges')==='true'};
}
function getPresentationState() {return getPublicGameState('');}
