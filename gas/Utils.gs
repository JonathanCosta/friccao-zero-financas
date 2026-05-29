/**
 * Utils.gs — Funções utilitárias de infraestrutura e criptografia.
 */

function getSecretKey() {
  // Busca a chave diretamente do ambiente seguro do Google, nunca hardcoded no código
  var chave = PropertiesService.getScriptProperties().getProperty('CHAVE_SECRETA');
  if (!chave) {
    throw new Error('ERRO CRÍTICO: CHAVE_SECRETA não configurada nas Propriedades do Script.');
  }
  return chave;
}

function gerarToken() {
  // Gera um UUIDv4 nativo do ecossistema Google, altamente seguro e imprevisível
  return Utilities.getUuid();
}