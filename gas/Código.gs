/**
 * Código.gs — Entrypoint do Web App GAS.
 * Recebe POST com Content-Type: text/plain e JSON no body.
 * Roteia por dados.action: 'provision' ou 'sync'.
 *
 * A-1: Mensagens de erro genéricas — detalhes internos apenas no StackDriver.
 * N-2: Proteção de quota por autenticação (chave mestra + token de dispositivo),
 *      não por origin — GAS web apps não expõem o HTTP Origin header ao script,
 *      e `setHeader()` não existe em `ContentService.TextOutput`.
 *      A autenticação ocorre antes de qualquer acesso à planilha.
 */

function doPost(e) {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      saida.setContent(JSON.stringify({ erro: 'requisicao_invalida' }));
      return saida;
    }

    var dados = JSON.parse(e.postData.contents);
    var action = dados.action || '';

    if (action === 'provision') {
      if (!verificarChaveMestra(dados.chave)) {
        saida.setContent(JSON.stringify({ erro: 'nao_autorizado' }));
        return saida;
      }
      var resultado = doProvision(dados);
      saida.setContent(JSON.stringify(resultado));
      return saida;
    }

    if (action === 'sync') {
      var token = dados.token || '';
      var dispositivo = validateToken(token);

      if (!dispositivo) {
        saida.setContent(JSON.stringify({ erro: 'nao_autorizado' }));
        return saida;
      }

      var resultado = doSync(dados, dispositivo);
      saida.setContent(JSON.stringify(resultado));
      return saida;
    }

    saida.setContent(JSON.stringify({ erro: 'acao_invalida' }));
  } catch (err) {
    console.error('Erro critico no doPost: ' + err.stack);
    saida.setContent(JSON.stringify({ erro: 'erro_interno_servidor' }));
  }

  return saida;
}

function doGet(e) {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);
  saida.setContent(JSON.stringify({ status: 'ok', app: 'Financeiro PWA' }));
  return saida;
}
