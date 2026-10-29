function registerPlayer(displayName, existingToken) {
  try {
    var name=String(displayName||'').trim().replace(/\s+/g,' ');
    if(name.length<2||name.length>32) return {ok:false,error:'Enter a name between 2 and 32 characters.'};
    var lock=LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var state=JSON.parse(settingGet_('state')||'{}');
      if(state.phase!=='LOBBY'||!state.registrationOpen) return {ok:false,error:'Registration is closed for this game.'};
      var players=rows_('Players'), tokenHash=existingToken?digest_(existingToken):'';
      if(tokenHash){var returning=GameLogic.existingPlayer(players,tokenHash,state.gameId); if(returning){returning.lastSeenAt=now_();rewriteRows_('Players',players);return {ok:true,token:existingToken,character:characterCard_(returning,state)};}}
      if(players.some(function(p){return p.gameId===state.gameId&&p.status==='active'&&p.displayName.toLowerCase()===name.toLowerCase();})) return {ok:false,error:'That name is already in the room. Choose another display name.'};
      var limit=Number(settingGet_('playerLimit')||CONFIG.DEFAULT_MAX_PLAYERS), active=players.filter(function(p){return p.gameId===state.gameId&&p.status==='active';});
      if(active.length>=limit) return {ok:false,error:'The game is full. Ask the host whether another seat is available.'};
      var assigned=active.map(function(p){return p.characterId;}), available=CHARACTERS.filter(function(c){return assigned.indexOf(c.id)<0;});
      if(!available.length) return {ok:false,error:'All character cards have been assigned.'};
      var character=available[Math.floor(Math.random()*available.length)], token=randomToken_(), player={playerId:randomToken_().slice(0,24),displayName:name,tokenHash:digest_(token),characterId:character.id,joinedAt:now_(),lastSeenAt:now_(),status:'active',gameId:state.gameId};
      appendObject_('Players',player); setCharacterAssignment_(character.id,state.gameId); log_(state.gameId,'player_joined','A player joined the lobby.');
      return {ok:true,token:token,character:characterCard_(player,state)};
    } finally {lock.releaseLock();}
  } catch(e){return {ok:false,error:safeError_(e)};}
}
function getMyCharacter(playerToken) {
  try {var hash=digest_(String(playerToken||'')),state=JSON.parse(settingGet_('state')||'{}'),p=GameLogic.existingPlayer(rows_('Players'),hash,state.gameId); if(!p)return {ok:false,error:'Your private session was not found on this device.'}; p.lastSeenAt=now_(); return {ok:true,character:characterCard_(p,state)};}catch(e){return {ok:false,error:safeError_(e)};}
}
function characterCard_(player,state) {
  var c=CHARACTERS.filter(function(x){return x.id===player.characterId;})[0]; if(!c)return null;
  var killer=state.startedAt&&state.killerId===c.id;
  return {id:c.id,name:c.name,role:c.role,description:c.description,motive:c.motive,alibi:c.alibi,privateInfo:c.privateInfo,knows:c.knows,objective:c.objective,relationship:c.relationship,isKiller:!!killer,killerInstruction:killer?'You destroyed Jack. Stay composed, keep your story plausible, and do not volunteer your secret.': ''};
}
function revokePlayer(hostToken, playerId) {
  try {requireHost_(hostToken);var lock=LockService.getScriptLock();lock.waitLock(20000);try{var players=rows_('Players'),found=false,characterId='';players=players.map(function(p){if(p.playerId===playerId){p.status='revoked';p.tokenHash='';characterId=p.characterId;found=true;}return p;});if(!found)return {ok:false,error:'Player not found.'};rewriteRows_('Players',players);var active=players.some(function(p){return p.characterId===characterId&&p.status==='active';});if(!active)setCharacterAssignment_(characterId,'');var votes=rows_('Votes').filter(function(v){return v.playerId!==playerId;});rewriteRows_('Votes',votes);return {ok:true};}finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
