function doGet(e) {
  var params=e&&e.parameter||{};
  if(params.bridge==='1'){
    var page=String(params.page||'');
    if(!validBridgePage_(page))return HtmlService.createHtmlOutput('Unsupported bridge page.');
    var ticket=makeBridgeTicket_(page);
    var bridge=HtmlService.createTemplateFromFile('Bridge');
    bridge.nonce=ticket.nonce;bridge.issuedAt=ticket.issuedAt;bridge.page=ticket.page;bridge.signature=ticket.signature;
    return bridge.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var presentation=params.presentation==='1';
  var hostPortal=!presentation&&params.host==='1';
  var template=HtmlService.createTemplateFromFile(presentation?'Presentation':hostPortal?'Host':'Index');
  template.presentation=presentation;
  template.hostPortal=hostPortal;
  return template.evaluate().setTitle(CONFIG.APP_TITLE).addMetaTag('viewport','width=device-width, initial-scale=1');
}
function doPost(e) {
  var params=e&&e.parameter||{},request={};
  try {
    request=JSON.parse(String(params.request||'{}'));
    var methods=bridgeMethods_();
    var validPage=/^\/TitanX_Game\/(?:index\.html|host\.html|presentation\.html)?(?:\?.*)?$/.test(String(request.page||''));
    var validTicket=validBridgeTicket_(request);
    var reason=params.bridge!=='1'?'route':!validPage?'page':!validTicket?'ticket':typeof request.id!=='string'||request.id.length>100?'id':!Object.prototype.hasOwnProperty.call(methods,request.method)?'method':!Array.isArray(request.args)||request.args.length>5?'arguments':'';
    if(reason) {
      return bridgeResponse_({type:'titanx-response',id:request.id||'',nonce:request.nonce||'',ok:false,result:{ok:false,error:'Invalid bridge request: '+reason+'.'}});
    }
    var result=methods[request.method].apply(null,request.args);
    return bridgeResponse_({type:'titanx-response',id:request.id,nonce:request.nonce,ok:true,result:result});
  } catch(err) {
    return bridgeResponse_({type:'titanx-response',id:request.id||'',nonce:request.nonce||'',ok:false,result:{ok:false,error:'The request could not be completed.'}});
  }
}
function validBridgePage_(page) {return /^\/TitanX_Game\/(?:index\.html|host\.html|presentation\.html)?$/.test(String(page||''));}
function bridgeSecret_() {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {var props=PropertiesService.getScriptProperties(),secret=props.getProperty('TITANX_BRIDGE_SECRET');if(!secret){secret=randomToken_();props.setProperty('TITANX_BRIDGE_SECRET',secret);}return secret;}
  finally {lock.releaseLock();}
}
function bridgeSignature_(nonce,issuedAt,page) {
  return Utilities.computeHmacSha256Signature(nonce+'|'+issuedAt+'|'+page,bridgeSecret_()).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}
function makeBridgeTicket_(page) {
  var nonce=randomToken_(),issuedAt=String(Date.now());
  return {nonce:nonce,issuedAt:issuedAt,page:page,signature:bridgeSignature_(nonce,issuedAt,page)};
}
function validBridgeTicket_(request) {
  if(!request||typeof request.nonce!=='string'||!/^[a-f0-9]{128}$/.test(request.nonce)||!/^\d{13}$/.test(String(request.issuedAt||''))||typeof request.signature!=='string'||!/^[a-f0-9]{64}$/.test(request.signature))return false;
  var age=Date.now()-Number(request.issuedAt);if(age<0||age>3600000)return false;
  return validBridgePage_(request.page)&&bridgeSignature_(request.nonce,String(request.issuedAt),request.page)===request.signature;
}
function bridgeMethods_() {
  return {
    getPublicGameState:getPublicGameState,registerPlayer:registerPlayer,submitVote:submitVote,
    getPresentationState:getPresentationState,hostLogin:hostLogin,getHostDashboardState:getHostDashboardState,
    logoutHost:logoutHost,hostVotingAction:hostVotingAction,transitionGame:transitionGame,
    releaseNextClue:releaseNextClue,createGame:createGame,hostSetSettings:hostSetSettings,revokePlayer:revokePlayer,
    hostPresentationMedia:hostPresentationMedia
  };
}
function bridgeResponse_(payload) {
  var json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  var origin='https://ray-mhlongo.github.io';
  var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>window.top.postMessage('+json+',"'+origin+'");</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(filename){return HtmlService.createHtmlOutputFromFile(filename).getContent();}
