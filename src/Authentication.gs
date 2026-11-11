function digest_(value) {
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8);
  return bytes.map(function(b){var n=(b+256)%256;return ('0'+n.toString(16)).slice(-2);}).join('');
}
function randomToken_() {
  return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
}
function configureInitialHost_() {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var props=PropertiesService.getScriptProperties();
    if(props.getProperty('HOST_HASH'))throw new Error('Host access is already configured.');
    var secret=randomToken_(),salt=randomToken_(),version=randomToken_();
    props.setProperties({HOST_SALT:salt,HOST_HASH:digest_(salt+secret),HOST_SESSION_VERSION:version});
    Logger.log('One-time host login secret (copy now; it will not be shown again): '+secret);
    return 'Host access configured. Copy the one-time secret from the execution log.';
  } finally {lock.releaseLock();}
}
function rotateHostSecret_() {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var props=PropertiesService.getScriptProperties();
    if(!props.getProperty('HOST_HASH'))throw new Error('Host access has not been configured.');
    var secret=randomToken_(),salt=randomToken_(),version=randomToken_();
    props.setProperties({HOST_SALT:salt,HOST_HASH:digest_(salt+secret),HOST_SESSION_VERSION:version});
    Logger.log('Replacement host login secret (copy now; it will not be shown again): '+secret);
    return 'Host secret rotated. Existing host sessions have been invalidated.';
  } finally {lock.releaseLock();}
}
function hostLogin(secret) {
  try {
    var props=PropertiesService.getScriptProperties(),salt=props.getProperty('HOST_SALT'),hash=props.getProperty('HOST_HASH');
    if(!salt||!hash||typeof secret!=='string'||secret.length>300)return {ok:false,error:'Login failed. Check the host secret and try again.'};
    var identity=String(Session.getTemporaryActiveUserKey()||'anonymous'),key='host-attempt-'+digest_(identity).slice(0,32),cache=CacheService.getScriptCache();
    var lock=LockService.getScriptLock();lock.waitLock(20000);
    try {
      var tries=Number(cache.get(key)||0);
      if(tries>=8)return {ok:false,error:'Too many attempts. Wait a few minutes and try again.'};
      if(digest_(salt+secret)!==hash){cache.put(key,String(tries+1),300);return {ok:false,error:'Login failed. Check the host secret and try again.'};}
      cache.remove(key);
      var token=randomToken_(),version=props.getProperty('HOST_SESSION_VERSION')||'legacy';
      cache.put('host-session-'+digest_(token),version,CONFIG.HOST_SESSION_SECONDS);
      return {ok:true,token:token};
    } finally {lock.releaseLock();}
  } catch(e) {return {ok:false,error:'Login is temporarily unavailable.'};}
}
function logoutHost(hostToken) {
  if(typeof hostToken!=='string'||!hostToken)return {ok:false,error:'Host session is missing.'};
  CacheService.getScriptCache().remove('host-session-'+digest_(hostToken));
  return {ok:true};
}
function requireHost_(token) {
  var props=PropertiesService.getScriptProperties(),version=props.getProperty('HOST_SESSION_VERSION')||'legacy';
  var cached=CacheService.getScriptCache().get('host-session-'+digest_(String(token||'')));
  if(!GameLogic.validHostSession(token,cached,version))throw new Error('Host session expired. Please log in again.');
}
