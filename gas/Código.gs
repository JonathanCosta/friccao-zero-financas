/**
 * Código.gs — Entrypoint do Web App GAS.
 * Recebe POST com Content-Type: text/plain e JSON no body.
 * Roteia por dados.action: 'provision' ou 'sync'.
 */

function doPost(e) {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      saida.setContent(JSON.stringify({ erro: 'Requisição inválida' }));
      return saida;
    }

    var dados = JSON.parse(e.postData.contents);
    var action = dados.action || '';

    if (action === 'provision') {
      var resultado = doProvision(dados);
      setCorsHeaders(saida);
      saida.setContent(JSON.stringify(resultado));
      return saida;
    }

    if (action === 'sync') {
      var token = dados.token || '';
      var dispositivo = validateToken(token);

      if (!dispositivo) {
        saida.setContent(JSON.stringify({ erro: 'token_invalido' }));
        return saida;
      }

      var resultado = doSync(dados, dispositivo);
      setCorsHeaders(saida);
      saida.setContent(JSON.stringify(resultado));
      return saida;
    }

    saida.setContent(JSON.stringify({ erro: 'Ação desconhecida: ' + action }));
  } catch (err) {
    saida.setContent(JSON.stringify({ erro: 'Erro interno: ' + err.message }));
    console.error('doPost error: ' + err.message);
  }

  return saida;
}

function doGet() {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);
  setCorsHeaders(saida);
  saida.setContent(JSON.stringify({ status: 'ok', app: 'Financeiro PWA' }));
  return saida;
}

function setCorsHeaders(saida) {
  saida.setHeader('Access-Control-Allow-Origin', '*');
  saida.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  saida.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
