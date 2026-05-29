/**
 * Auth.gs — Provisionamento de dispositivos e validação de tokens.
 * O token é recebido DENTRO do corpo JSON (nunca do header Authorization).
 * A chave de provisionamento é comparada em TEMPO CONSTANTE (M-2).
 */

var SHEET_DISPOSITIVOS = 'dispositivos';

var COL_DISPOSITIVO_ID = 0;
var COL_NOME_DISPOSITIVO = 1;
var COL_TOKEN_ACESSO = 2;
var COL_CRIADO_EM = 3;

function verificarChaveMestra(chaveInformada) {
  var chaveSecreta = PropertiesService.getScriptProperties().getProperty('CHAVE_SECRETA');

  if (!chaveSecreta || !chaveInformada) {
    return false;
  }

  var strA = String(chaveInformada);
  var strB = String(chaveSecreta);

  if (strA.length !== strB.length) {
    return false;
  }

  var resultado = 0;
  for (var i = 0; i < strA.length; i++) {
    resultado |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
  }

  return resultado === 0;
}

function doProvision(dados) {
  var nomeDispositivo = dados.nome_dispositivo || 'Desconhecido';
  var token = gerarToken();
  var agora = new Date().toISOString();

  var sheet = getOrCreateSheet(SHEET_DISPOSITIVOS, [
    'dispositivo_id', 'nome_dispositivo', 'token_acesso', 'criado_em'
  ]);

  var dispositivoId = gerarToken();
  appendRow(sheet, [dispositivoId, nomeDispositivo, token, agora]);

  return {
    sucesso: true,
    dispositivo_id: dispositivoId,
    token_acesso: token
  };
}

function validateToken(token) {
  if (!token) return null;

  try {
    var sheet = getSheet(SHEET_DISPOSITIVOS);
    var linha = findRowByKey(sheet, COL_TOKEN_ACESSO, token);
    if (linha) {
      var dados = sheet.getRange(linha, 1, 1, 4).getValues()[0];
      return {
        dispositivo_id: String(dados[COL_DISPOSITIVO_ID]),
        nome_dispositivo: String(dados[COL_NOME_DISPOSITIVO])
      };
    }
  } catch (e) {
    console.error('Erro ao validar token: ' + e.message);
  }
  return null;
}

function gerarToken() {
  return Utilities.getUuid();
}
