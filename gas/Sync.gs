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

function doSync(dados, dispositivo) {
  var resultado = { inserts: 0, updates: 0, erros: [] };

  criarAbaCategoriasSeNecessario();

  if (dados.categorias && dados.categorias.length > 0) {
    var resultadoCat = upsertCategorias(dados.categorias);
    resultado.inserts += resultadoCat.inserts;
    resultado.updates += resultadoCat.updates;
  }

  criarAbaMovimentacoesSeNecessario();

  if (dados.movimentacoes && dados.movimentacoes.length > 0) {
    var resultadoMov = upsertMovimentacoes(dados.movimentacoes);
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

function upsertCategorias(categorias) {
  var sheet = getSheet(SHEET_CATEGORIAS);
  var inserts = 0, updates = 0;

  for (var i = 0; i < categorias.length; i++) {
    var cat = categorias[i];
    if (!cat.categoria_id) continue;

    var linha = findRowByKey(sheet, COL_CATEGORIA_ID, cat.categoria_id);

    if (linha) {
      var linhaData = sheet.getRange(linha, 1, 1, 4).getValues()[0];
      var criadoEm = linhaData[COL_CAT_CRIADO_EM];

      if (cat.criado_em > criadoEm) {
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

function upsertMovimentacoes(movimentacoes) {
  var sheet = getSheet(SHEET_MOVIMENTACOES);
  var inserts = 0, updates = 0;

  for (var i = 0; i < movimentacoes.length; i++) {
    var mov = movimentacoes[i];
    if (!mov.transacao_id) continue;

    var linha = findRowByKey(sheet, COL_TRANSACAO_ID, mov.transacao_id);

    if (linha) {
      var linhaData = sheet.getRange(linha, 1, 1, 10).getValues()[0];
      var atualizadoEm = linhaData[COL_ATUALIZADO_EM];

      if (mov.atualizado_em > atualizadoEm) {
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
