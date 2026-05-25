/**
 * Camada de abstração para acesso às abas da planilha.
 * NUNCA usar getSheets() por índice — sempre getSheetByName().
 */

function getOrCreateSheet(nome, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (sheet) return sheet;

  sheet = ss.insertSheet(nome);
  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function getSheet(nome) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!sheet) throw new Error('Aba "' + nome + '" não encontrada');
  return sheet;
}

function findRowByKey(sheet, colIndex, key) {
  var dados = sheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][colIndex]) === String(key)) {
      return i + 1;
    }
  }
  return null;
}

function appendRow(sheet, dados) {
  sheet.appendRow(dados);
}

function updateRow(sheet, rowIndex, dados) {
  var numCols = dados.length;
  sheet.getRange(rowIndex, 1, 1, numCols).setValues([dados]);
}

function getHeaderRow(sheet) {
  var dados = sheet.getDataRange().getValues();
  return dados.length > 0 ? dados[0] : [];
}
