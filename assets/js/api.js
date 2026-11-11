(function(){'use strict';
var frame,ticket=null,queue=[],pending=Object.create(null),sequence=0;
var endpoint='https://script.google.com/macros/s/AKfycbwYFo3N5_gXIkZpSUeio5UrMUaH5W5DTQZAAkYmz6PBy3_K4cMYSlOhb7tQhS_lu7F8/exec';
function trustedBridgeOrigin(origin){try{var host=new URL(origin).hostname;return host==='script.google.com'||host==='script.googleusercontent.com'||/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(host);}catch(e){return false;}}
function removeFrame(item){if(item.frame&&item.frame.parentNode)item.frame.parentNode.removeChild(item.frame);if(item.form&&item.form.parentNode)item.form.parentNode.removeChild(item.form);}
function send(item){
  var request={id:item.id,nonce:ticket.nonce,issuedAt:ticket.issuedAt,page:ticket.page,signature:ticket.signature,method:item.method,args:item.args};
  var frameName='titanx_'+item.id;
  var target=document.createElement('iframe');target.name=frameName;target.title='TitanX API response';target.setAttribute('aria-hidden','true');target.tabIndex=-1;target.referrerPolicy='unsafe-url';target.style.cssText='position:absolute;width:1px;height:1px;left:-10000px;border:0';
  var form=document.createElement('form');form.method='post';form.action=endpoint+'?bridge=1';form.target=frameName;form.referrerPolicy='unsafe-url';form.style.display='none';
  var input=document.createElement('input');input.type='hidden';input.name='request';input.value=JSON.stringify(request);form.appendChild(input);
  var flag=document.createElement('input');flag.type='hidden';flag.name='bridge';flag.value='1';form.appendChild(flag);
  item.frame=target;item.form=form;document.body.appendChild(target);document.body.appendChild(form);form.submit();
  window.setTimeout(function(){if(form.parentNode)form.parentNode.removeChild(form);},1000);
}
function flush(){if(!ticket)return;while(queue.length)send(queue.shift());}
window.addEventListener('message',function(event){
  if(!trustedBridgeOrigin(event.origin))return;
  var data=event.data||{};
  if(data.type==='titanx-bridge-ready'&&data.ticket&&data.ticket.page===location.pathname&&/^[a-f0-9]{128}$/.test(data.ticket.nonce)&&/^[a-f0-9]{64}$/.test(data.ticket.signature)){ticket=data.ticket;flush();return;}
  if(data.type!=='titanx-response'||!ticket||data.nonce!==ticket.nonce||!pending[data.id])return;
  var item=pending[data.id];delete pending[data.id];window.clearTimeout(item.timer);removeFrame(item);
  data.ok?item.resolve(data.result):item.reject(new Error((data.result&&data.result.error)||'Backend request failed'));
});
function init(){if(frame)return;frame=document.createElement('iframe');frame.title='TitanX backend connection';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.referrerPolicy='unsafe-url';frame.style.cssText='position:absolute;width:1px;height:1px;left:-10000px;border:0';frame.src=endpoint+'?bridge=1&page='+encodeURIComponent(location.pathname);document.body.appendChild(frame);}
function call(method,args){init();return new Promise(function(resolve,reject){var id=Date.now().toString(36)+'_'+(++sequence).toString(36);var item={id:id,method:String(method),args:Array.isArray(args)?args:[],resolve:resolve,reject:reject,frame:null,form:null,timer:null};item.timer=window.setTimeout(function(){delete pending[id];removeFrame(item);reject(new Error('Backend timeout'));},25000);pending[id]=item;queue.push(item);flush();});}
window.TitanXApi={call:call};document.addEventListener('DOMContentLoaded',init);
})();
