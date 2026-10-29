function doGet(e) {
  var template=HtmlService.createTemplateFromFile('Index');
  template.presentation=!!(e&&e.parameter&&e.parameter.presentation==='1');
  return template.evaluate().setTitle(CONFIG.APP_TITLE).addMetaTag('viewport','width=device-width, initial-scale=1');
}
function include(filename){return HtmlService.createHtmlOutputFromFile(filename).getContent();}
