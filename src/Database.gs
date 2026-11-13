function db_() {
  var id = PropertiesService.getScriptProperties().getProperty('TITANX_SPREADSHEET_ID');
  if (!id) throw new Error('Game database is not configured. Ask the host to finish setup.');
  return SpreadsheetApp.openById(id);
}
function setupDatabase_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var id = PropertiesService.getScriptProperties().getProperty('TITANX_SPREADSHEET_ID');
    if (!id) throw new Error('Game database is not configured. Run setupDatabaseWithId_(spreadsheetId) from the Apps Script editor first.');
    var ss = openDatabaseSpreadsheet_(id);
    return initialiseDatabase_(ss);
  } finally {
    lock.releaseLock();
  }
}
function setupDatabaseWithId_(spreadsheetId) {
  var id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Provide a Google spreadsheet ID, then run setupDatabaseWithId_(spreadsheetId) again.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Verify access before writing configuration. The ID is stored only in Script Properties.
    var ss = openDatabaseSpreadsheet_(id);
    PropertiesService.getScriptProperties().setProperty('TITANX_SPREADSHEET_ID', id);
    return initialiseDatabase_(ss);
  } finally {
    lock.releaseLock();
  }
}
function openDatabaseSpreadsheet_(id) {
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Unable to open the configured game spreadsheet. Check that the spreadsheet ID is correct and that this Apps Script project has access.');
  }
}
function initialiseDatabase_(ss) {
  Object.keys(CONFIG.SHEETS).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = CONFIG.SHEETS[name];
    migrateSheetSchema_(sheet, headers);
    sheet.setFrozenRows(1);
  });
  var settings = ss.getSheetByName('Settings');
  if (!settingGet_('state')) settingSet_('state', JSON.stringify(defaultState_()));
  if (!settingGet_('playerLimit')) settingSet_('playerLimit', String(CONFIG.DEFAULT_MAX_PLAYERS));
  if (!settingGet_('allowVoteChanges')) settingSet_('allowVoteChanges', 'false');
  seedCharacters_();
  return 'Database ready: ' + ss.getName();
}
function migrateSheetSchema_(sheet, headers) {
  var last=sheet.getLastRow(), width=sheet.getLastColumn();
  if(!last){sheet.getRange(1,1,1,headers.length).setValues([headers]);return;}
  var oldHeaders=sheet.getRange(1,1,1,Math.max(1,width)).getValues()[0].map(String);
  if(headers.every(function(h){return oldHeaders.indexOf(h)>=0;}))return;
  var data=last>1?sheet.getRange(2,1,last-1,Math.max(1,width)).getValues():[];
  var objects=data.map(function(row){var o={};oldHeaders.forEach(function(h,i){if(h)o[h]=row[i];});return o;});
  sheet.clearContents();sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if(objects.length)sheet.getRange(2,1,objects.length,headers.length).setValues(objects.map(function(o){
    if(sheet.getName()==='Characters'){o.assignmentStatus=o.assignedGameId?'ASSIGNED':'AVAILABLE';}
    if(sheet.getName()==='Players'){o.gender=o.gender||'Prefer not to say';o.avatarId=o.avatarId||avatarIdForGender_(o.gender);if(String(o.status).toLowerCase()==='active')o.status='ACTIVE';else if(String(o.status).toLowerCase()==='eliminated')o.status='ELIMINATED';}
    return headers.map(function(h){return o[h]===undefined?'':o[h];});
  }));
}
function defaultState_() { return {gameId:'',phase:'LOBBY',registrationOpen:true,createdAt:now_(),startedAt:'',phaseStartedAt:now_(),durationSeconds:180, clueCursor:0,killerId:'',solutionRevealed:false,votingRound:0,votingDeadline:'',autoClose:true,runoffCharacterIds:[],eliminationPending:''}; }
function settingGet_(key) {
  var sh=db_().getSheetByName('Settings'), values=sh.getDataRange().getValues();
  for(var i=1;i<values.length;i++) if(String(values[i][0])===key) return String(values[i][1]);
  return '';
}
function settingSet_(key,value) {
  var sh=db_().getSheetByName('Settings'), values=sh.getDataRange().getValues();
  for(var i=1;i<values.length;i++) if(String(values[i][0])===key) { sh.getRange(i+1,2).setValue(value); return; }
  sh.appendRow([key,value]);
}
function rows_(sheetName) {
  var sh=db_().getSheetByName(sheetName), values=sh.getDataRange().getValues();
  return values.length<2?[]:values.slice(1).map(function(row){var o={}; CONFIG.SHEETS[sheetName].forEach(function(h,i){o[h]=row[i];}); if(sheetName==='Players'){if(String(o.status).toLowerCase()==='active')o.status='ACTIVE';if(String(o.status).toLowerCase()==='eliminated')o.status='ELIMINATED';} return o;});
}
function appendObject_(sheetName,obj) {
  var headers=CONFIG.SHEETS[sheetName]; db_().getSheetByName(sheetName).appendRow(headers.map(function(h){return obj[h]===undefined?'':obj[h];}));
}
function rewriteRows_(sheetName,objects) {
  var sh=db_().getSheetByName(sheetName), headers=CONFIG.SHEETS[sheetName], last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,headers.length).clearContent();
  if(objects.length) sh.getRange(2,1,objects.length,headers.length).setValues(objects.map(function(o){return headers.map(function(h){return o[h]===undefined?'':o[h];});}));
}
function seedCharacters_() {
  var old=rows_('Characters'),byId={};old.forEach(function(c){byId[c.characterId]=c;});
  var seeded=CHARACTERS.map(function(c){var prior=byId[c.id]||{};return {characterId:c.id,name:c.name,roleType:c.role,description:c.description,motive:c.motive,alibi:c.alibi,privateInfo:c.privateInfo,knows:c.knows,objective:c.objective,relationship:c.relationship,assignedGameId:prior.assignedGameId||'',assignmentStatus:prior.assignedGameId?'ASSIGNED':'AVAILABLE'};});
  old.filter(function(c){return !CHARACTERS.some(function(x){return x.id===c.characterId;});}).forEach(function(c){seeded.push(c);});
  rewriteRows_('Characters',seeded);
}
function setCharacterAssignment_(characterId,gameId){
  var sh=db_().getSheetByName('Characters'),values=sh.getDataRange().getValues();
  var assignmentColumn=CONFIG.SHEETS.Characters.indexOf('assignedGameId')+1,statusColumn=CONFIG.SHEETS.Characters.indexOf('assignmentStatus')+1;
  for(var i=1;i<values.length;i++)if(values[i][0]===characterId){sh.getRange(i+1,assignmentColumn).setValue(gameId||'');sh.getRange(i+1,statusColumn).setValue(gameId?'ASSIGNED':'AVAILABLE');return;}
}
function now_(){return new Date().toISOString();}
function isActivePlayer_(p){return p&&String(p.status).toUpperCase()==='ACTIVE';}
function avatarIdForGender_(gender){return gender==='Male'?'pumpkin-male':gender==='Female'?'pumpkin-female':'pumpkin-neutral';}
function log_(gameId,event,details){appendObject_('GameLog',{timestamp:now_(),gameId:gameId,event:event,details:String(details||'').slice(0,240)});}
