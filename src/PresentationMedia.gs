function presentationPlaybackDefault_() {
  return {mediaId:'intro',videoStatus:'stopped',musicStatus:'stopped',videoPosition:0,musicPosition:0,videoVolume:1,musicVolume:0.35,muted:false,commandAt:now_(),sequence:0};
}
function presentationPlayback_() {
  var raw=PropertiesService.getScriptProperties().getProperty('TITANX_PRESENTATION_PLAYBACK');
  if(!raw)return presentationPlaybackDefault_();
  try {var state=JSON.parse(raw),base=presentationPlaybackDefault_();Object.keys(base).forEach(function(k){if(state[k]!==undefined)base[k]=state[k];});return base;}catch(e){return presentationPlaybackDefault_();}
}
function savePresentationPlayback_(state) {PropertiesService.getScriptProperties().setProperty('TITANX_PRESENTATION_PLAYBACK',JSON.stringify(state));}
function hostPresentationMedia(hostToken, action, options) {
  try {requireHost_(hostToken);options=options||{};var lock=LockService.getScriptLock();lock.waitLock(20000);try{
    var state=presentationPlayback_(),allowed=['start','pause','resume','restart','stop','musicStart','musicPause','musicResume','musicStop','setVolume','mute','unmute'];
    action=String(action||'');if(allowed.indexOf(action)<0)return {ok:false,error:'Unknown presentation media action.'};
    if(action==='start'){state.videoStatus='playing';state.videoPosition=Number(options.position||0);}
    if(action==='pause'){if(state.videoStatus!=='playing')return {ok:false,error:'The introduction is not playing.'};state.videoStatus='paused';state.videoPosition=Math.max(0,Number(options.position||state.videoPosition));}
    if(action==='resume'){if(state.videoStatus!=='paused')return {ok:false,error:'The introduction is not paused.'};state.videoStatus='playing';}
    if(action==='restart'){state.videoStatus='playing';state.videoPosition=0;}
    if(action==='stop'){state.videoStatus='stopped';state.videoPosition=0;}
    if(action==='musicStart'){state.musicStatus='playing';state.musicPosition=Number(options.position||0);}
    if(action==='musicPause'){state.musicStatus='paused';state.musicPosition=Math.max(0,Number(options.position||state.musicPosition));}
    if(action==='musicResume'){if(state.musicStatus!=='paused')return {ok:false,error:'Background music is not paused.'};state.musicStatus='playing';}
    if(action==='musicStop'){state.musicStatus='stopped';state.musicPosition=0;}
    if(action==='setVolume'){var channel=options.channel==='music'?'music':'video',volume=Number(options.volume);if(!isFinite(volume)||volume<0||volume>1)return {ok:false,error:'Volume must be between 0 and 100 percent.'};state[channel+'Volume']=volume;}
    if(action==='mute')state.muted=true;if(action==='unmute')state.muted=false;
    state.commandAt=now_();state.sequence=Number(state.sequence||0)+1;savePresentationPlayback_(state);return {ok:true,data:state};
  }finally{lock.releaseLock();}}catch(e){return {ok:false,error:safeError_(e)};}
}
