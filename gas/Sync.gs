/**
 * Sync.gs — Motor de sincronização upsert.
 * Recebe categorias e movimentações do frontend e faz merge na planilha.
 * Usa transacao_id / categoria_id como chave natural para idempotência.
 */

var SHEET_CATEGORIAS = 'categorias';
var SHEET_MOVIMENTACOES = 'movimentacoes';

var COL_CATEGORIA_ID = 0;
var COL_CAT_NOME = 1;
var COL_CAT_TIPO = 2;
var COL_CAT_CRIADO_EM = 3;

var COL_TRANSACAO_ID = 0;
var COL_DESCRICAO = 1;
var COL_VALOR = 2;
var COL_CATEGORIA_ID_MOV = 3;
var COL_DATA_TRANSACAO = 4;
var COL_CRIADO_EM = 5;
var COL_ATUALIZADO_EM = 6;
var COL_DELETADO_EM = 7;
var COL_ORIGEM_REGISTRO = 8;
var COL_COMPROVANTE_URL = 9;

// CORREÇÃO: Função auxiliar para garantir uma comparação de datas segura e precisa
function obterTimestamp(valorData) {
  if (valorData instanceof Date) {
    return valorData.getTime();
  }
  if (!valorData) return 0;
  return new Date(valorData).getTime();
}

function validarCategoria(cat, erros) {
  if (typeof cat.categoria_id !== 'string' || !cat.categoria_id) {
    erros.push('categoria_id invalido'); return false;
  }
  if (typeof cat.nome !== 'string' || cat.nome.length > 100) {
    erros.push('nome invalido ou muito longo: ' + cat.categoria_id); return false;
  }
  if (['entrada','saida','misto'].indexOf(cat.tipo) < 0) {
    erros.push('tipo invalido: ' + cat.categoria_id); return false;
  }
  return true;
}

function validarMovimentacao(mov, erros) {
  if (typeof mov.transacao_id !== 'string' || !mov.transacao_id) {
    erros.push('transacao_id invalido'); return false;
  }
  if (typeof mov.descricao !== 'string' || mov.descricao.length > 200) {
    erros.push('descricao invalida ou muito longa: ' + mov.transacao_id); return false;
  }
  if (typeof mov.valor !== 'number' || !isFinite(mov.valor)) {
    erros.push('valor invalido: ' + mov.transacao_id); return false;
  }
  if (mov.comprovante_url && typeof mov.comprovante_url !== 'string') {
    erros.push('comprovante_url invalido: ' + mov.transacao_id); return false;
  }
  return true;
}

function doSync(dados, dispositivo) {
  var resultado = { inserts: 0, updates: 0, erros: [] };

  criarAbaCategoriasSeNecessario();

  if (dados.categorias && dados.categorias.length > 0) {
    var resultadoCat = upsertCategorias(dados.categorias, resultado.erros);
    resultado.inserts += resultadoCat.inserts;
    resultado.updates += resultadoCat.updates;
  }

  criarAbaMovimentacoesSeNecessario();

  if (dados.movimentacoes && dados.movimentacoes.length > 0) {
    var resultadoMov = upsertMovimentacoes(dados.movimentacoes, resultado.erros);
    resultado.inserts += resultadoMov.inserts;
    resultado.updates += resultadoMov.updates;
  }

  return resultado;
}

function criarAbaCategoriasSeNecessario() {
  getOrCreateSheet(SHEET_CATEGORIAS, [
    'categoria_id', 'nome', 'tipo', 'criado_em'
  ]);
}

function criarAbaMovimentacoesSeNecessario() {
  getOrCreateSheet(SHEET_MOVIMENTACOES, [
    'transacao_id', 'descricao', 'valor', 'categoria_id',
    'data_transacao', 'criado_em', 'atualizado_em', 'deletado_em',
    'origem_registro', 'comprovante_url'
  ]);
}

function upsertCategorias(categorias, erros) {
  var sheet = getSheet(SHEET_CATEGORIAS);
  var inserts = 0, updates = 0;

  for (var i = 0; i < categorias.length; i++) {
    var cat = categorias[i];
    if (!validarCategoria(cat, erros)) continue;

    var linha = findRowByKey(sheet, COL_CATEGORIA_ID, cat.categoria_id);

    if (linha) {
      var linhaData = sheet.getRange(linha, 1, 1, 4).getValues()[0];
      
      // CORREÇÃO: Conversão protetiva para timestamp numérico
      var criadoEmPlanilha = obterTimestamp(linhaData[COL_CAT_CRIADO_EM]);
      var criadoEmFrontend = obterTimestamp(cat.criado_em);

      if (criadoEmFrontend > criadoEmPlanilha) {
        updateRow(sheet, linha, [
          cat.categoria_id, cat.nome, cat.tipo, cat.criado_em
        ]);
        updates++;
      }
    } else {
      appendRow(sheet, [
        cat.categoria_id, cat.nome, cat.tipo, cat.criado_em
      ]);
      inserts++;
    }
  }

  return { inserts: inserts, updates: updates };
}

function upsertMovimentacoes(movimentacoes, erros) {
  var sheet = getSheet(SHEET_MOVIMENTACOES);
  var inserts = 0, updates = 0;

  for (var i = 0; i < movimentacoes.length; i++) {
    var mov = movimentacoes[i];
    if (!validarMovimentacao(mov, erros)) continue;

    var linha = findRowByKey(sheet, COL_TRANSACAO_ID, mov.transacao_id);

    if (linha) {
      var linhaData = sheet.getRange(linha, 1, 1, 10).getValues()[0];
      
      // CORREÇÃO: Conversão protetiva para timestamp numérico evitando falhas de string vs Date
      var atualizadoEmPlanilha = obterTimestamp(linhaData[COL_ATUALIZADO_EM]);
      var atualizadoEmFrontend = obterTimestamp(mov.atualizado_em);

      if (atualizadoEmFrontend > atualizadoEmPlanilha) {
        updateRow(sheet, linha, [
          mov.transacao_id, mov.descricao, mov.valor, mov.categoria_id,
          mov.data_transacao, mov.criado_em, mov.atualizado_em, mov.deletado_em || '',
          mov.origem_registro || 'manual', mov.comprovante_url || ''
        ]);
        updates++;
      }
    } else {
      appendRow(sheet, [
        mov.transacao_id, mov.descricao, mov.valor, mov.categoria_id,
        mov.data_transacao, mov.criado_em, mov.atualizado_em, mov.deletado_em || '',
        mov.origem_registro || 'manual', mov.comprovante_url || ''
      ]);
      inserts++;
    }
  }

  return { inserts: inserts, updates: updates };
}