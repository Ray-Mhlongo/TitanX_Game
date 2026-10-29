function digest_(value) {
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8);
  return bytes.map(function(b){var n=(b+256)%256; return ('0'+n.toString(16)).slice(-2);}).join('');
}
function randomToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function configureInitialHost_() {
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('HOST_HASH')) throw new Error('Host access is already configured.');
  var secret=randomToken_(); var salt=randomToken_();
  props.setProperties({HOST_SALT:salt,HOST_HASH:digest_(salt+secret)});
  Logger.log('One-time host login secret (copy now; it will not be shown again): '+secret);
  return 'Host access configured. Copy the one-time secret from the execution log.';
}
function rotateHostSecret_() {
  var props=PropertiesService.getScriptProperties();if(!props.getProperty('HOST_HASH'))throw new Error('Host access has not been configured.');
  var secret=randomToken_(),salt=randomToken_();props.setProperties({HOST_SALT:salt,HOST_HASH:digest_(salt+secret)});
  Logger.log('Replacement host login secret (copy now; it will not be shown again): '+secret);
  return 'Host secret rotated. Existing host sessions may remain active until they expire.';
}
function hostLogin(secret) {
  try {
    var props=PropertiesService.getScriptProperties(), salt=props.getProperty('HOST_SALT'), hash=props.getProperty('HOST_HASH');
    if(!salt||!hash||typeof secret!=='string'||secret.length>300) return {ok:false,error:'Login failed. Check the host secret and try again.'};
    var key='host-attempt-'+digest_(String(Session.getTemporaryActiveUserKey()||'unknown'));
    var cache=CacheService.getScriptCache(), tries=Number(cache.get(key)||0);
    if(tries>=8) return {ok:false,error:'Too many attempts. Wait a few minutes and try again.'};
    if(digest_(salt+secret)!==hash){cache.put(key,String(tries+1),300);return {ok:false,error:'Login failed. Check the host secret and try again.'};}
    cache.remove(key); var token=randomToken_(); cache.put('host-session-'+digest_(token), '1', CONFIG.HOST_SESSION_SECONDS);
    return {ok:true,token:token};
  } catch(e){return {ok:false,error:'Login is temporarily unavailable.'};}
}
function requireHost_(token) {
  if(typeof token!=='string'||!GameLogic.validHostSession(token,CacheService.getScriptCache().get('host-session-'+digest_(token)))) throw new Error('Host session expired. Please log in again.');
}
