/**
 * Código.gs — Entrypoint do Web App GAS.
 * Recebe POST com Content-Type: text/plain e JSON no body.
 * Roteia por dados.action: 'provision' ou 'sync'.
 *
 * A-1: Mensagens de erro genéricas — detalhes internos apenas no StackDriver.
 * M-1: CORS headers em TODOS os retornos — setCorsHeaders() chamado na criação,
 *      antes de qualquer return, garantindo que erros também tenham CORS.
 * N-2: setCorsHeaders valida origin contra lista de origens permitidas para
 *      evitar abuso de quota do GAS por sites externos.
 */

function doPost(e) {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);
  var origin = (e && e.parameter && e.parameter.origin) || '';
  setCorsHeaders(saida, origin);

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
    // A-1: Detalhes guardados no StackDriver, longe do atacante
    console.error('Erro critico no doPost: ' + err.stack);
    saida.setContent(JSON.stringify({ erro: 'erro_interno_servidor' }));
  }

  return saida;
}

function doGet(e) {
  var saida = ContentService.createTextOutput();
  saida.setMimeType(ContentService.MimeType.JSON);
  var origin = (e && e.parameter && e.parameter.origin) || '';
  setCorsHeaders(saida, origin);
  saida.setContent(JSON.stringify({ status: 'ok', app: 'Financeiro PWA' }));
  return saida;
}

function setCorsHeaders(saida, origin) {
  // N-2: Lista de origens autorizadas para evitar abuso de quota do GAS
  var origensPermitidas = [
    'https://jonathancosta.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  if (origin && origensPermitidas.indexOf(origin) >= 0) {
    saida.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback seguro: apenas produção
    saida.setHeader('Access-Control-Allow-Origin', 'https://jonathancosta.github.io');
  }

  saida.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  saida.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
