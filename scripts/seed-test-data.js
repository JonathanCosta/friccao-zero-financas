// dimdim — Seed de dados de teste
// Uso: abrir http://localhost:5173, fazer setup + PIN, colar no console e Enter

;(async () => {
  const DESCRICOES = {
    alimentacao: [
      'Almoço', 'Jantar', 'Supermercado', 'Padaria', 'Restaurante',
      'Ifood', 'Açaí', 'Lanche', 'Feira', 'Marmita',
    ],
    transporte: [
      'Uber', 'Gasolina', 'Ônibus', 'Metrô', 'Estacionamento',
      'Pedágio', 'Manutenção carro', '99', 'Tabloide', 'Bicicleta',
    ],
    moradia: ['Aluguel', 'Condomínio', 'IPTU', 'Água', 'Luz', 'Gás', 'Internet'],
    saude: ['Farmácia', 'Consulta', 'Exame', 'Plano de saúde', 'Dentista', 'Psicólogo'],
    educacao: ['Curso', 'Livro', 'Udemy', 'Material escolar', 'Idiomas'],
    lazer: [
      'Cinema', 'Netflix', 'Spotify', 'Streaming', 'Jogo',
      'Bar', 'Cerveja', 'Show', 'Parque', 'Academia',
    ],
    assinaturas: ['Assinatura', 'Mensalidade', 'iCloud', 'Office 365', 'VPN'],
    compras: [
      'Roupas', 'Amazon', 'Mercado Livre', 'Shopee', 'Eletrônico',
      'Presente', 'Decoração', 'Ferramenta', 'Tênis', 'Mochila',
    ],
    outros: ['Presente', 'Cartão', 'Taxa', 'Multa', 'Doação'],
    freelance: ['Projeto web', 'Consultoria', 'Design', 'Aula particular', 'Tradução'],
    investimentos: [
      'Dividendos', 'CDB', 'Tesouro direto', 'FII', 'Ações',
      'Renda fixa', 'Cripto', 'Day trade', 'Previdência', 'COE',
    ],
  }

  const CATEGORIAS_ADICIONAIS = [
    { nome: 'Mercado', tipo: 'saida' },
    { nome: 'Vestuário', tipo: 'saida' },
    { nome: 'Pet', tipo: 'saida' },
    { nome: 'Utilidades', tipo: 'saida' },
    { nome: 'Presentes', tipo: 'saida' },
  ]

  const SALARIO_BASE = 5200
  const FREELANCE_MIN = 400
  const FREELANCE_MAX = 2500

  function uuid() {
    return crypto.randomUUID()
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function pick(arr) {
    return arr[rand(0, arr.length - 1)]
  }

  function isoDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isoNow() {
    return new Date().toISOString()
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  }

  function weekday(dateStr) {
    return new Date(dateStr + 'T12:00:00').getDay()
  }

  function isWeekend(dateStr) {
    const wd = weekday(dateStr)
    return wd === 0 || wd === 6
  }

  console.log('⟳ Conectando ao banco...')

  let db
  if ((window).db) {
    db = (window).db
    console.log('✓ db encontrado via window.db')
  } else {
    try {
      const Dexie = (await import('dexie')).default
      class SeedDB extends Dexie {
        constructor() {
          super('financeiro')
          this.version(1).stores({
            dispositivos: 'dispositivo_id, token_acesso',
            categorias: 'categoria_id, nome, tipo',
            movimentacoes: 'transacao_id, categoria_id, data_transacao, atualizado_em, deletado_em',
          })
          this.version(2).stores({
            categorias: 'categoria_id, nome, tipo, criado_em',
            movimentacoes: 'transacao_id, categoria_id, data_transacao, atualizado_em, deletado_em, criado_em',
          })
        }
      }
      db = new SeedDB()
      console.log('✓ Conectado via import(\'dexie\')')
    } catch (e) {
      console.error('✗ Não foi possível conectar ao banco:', e)
      console.error('Certifique-se de que o app está rodando em http://localhost:5173')
      return
    }
  }

  const now = new Date()
  const ANO_ATUAL = now.getFullYear()
  const MES_ATUAL = now.getMonth() + 1

  console.log('⟳ Verificando categorias...')

  const catsExistentes = await db.categorias.toArray()
  const nomesExistentes = new Set(catsExistentes.map((c) => c.nome))

  const todasCategorias = [...catsExistentes]

  for (const extra of CATEGORIAS_ADICIONAIS) {
    if (!nomesExistentes.has(extra.nome)) {
      const cat = {
        categoria_id: uuid(),
        nome: extra.nome,
        tipo: extra.tipo,
        criado_em: isoNow(),
      }
      await db.categorias.add(cat)
      todasCategorias.push(cat)
      console.log(`  + Categoria criada: ${extra.nome}`)
    }
  }

  const catMap = {}
  for (const c of todasCategorias) {
    const key = c.nome.toLowerCase()
    catMap[key] = c
  }

  function cat(nome) {
    const c = catMap[nome.toLowerCase()]
    if (!c) throw new Error(`Categoria "${nome}" não encontrada`)
    return c
  }

  console.log(`✓ ${todasCategorias.length} categorias disponíveis`)

  const transacoes = []

  for (let delta = 0; delta < 6; delta++) {
    const m = MES_ATUAL - delta
    const ano = m <= 0 ? ANO_ATUAL - 1 : ANO_ATUAL
    const mes = m <= 0 ? m + 12 : m
    const totalDias = daysInMonth(ano, mes)

    console.log(`⟳ Gerando ${mes}/${ano}...`)

    // Salário (dia 5 e 20, ou útil mais próximo)
    for (const dia of [5, 20]) {
      const data = isoDate(ano, mes, Math.min(dia, totalDias))
      transacoes.push({
        transacao_id: uuid(),
        descricao: 'Salário',
        valor: SALARIO_BASE,
        categoria_id: cat('Salário').categoria_id,
        data_transacao: data,
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Freelance (1-2x por mês, dias úteis)
    const qtdFreela = rand(1, 2)
    for (let f = 0; f < qtdFreela; f++) {
      const dia = rand(8, totalDias - 5)
      const data = isoDate(ano, mes, Math.min(dia, totalDias))
      if (isWeekend(data)) continue
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.freelance),
        valor: rand(FREELANCE_MIN, FREELANCE_MAX),
        categoria_id: cat('Freelance').categoria_id,
        data_transacao: data,
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Investimentos (1x por mês)
    const diaInv = rand(10, totalDias - 5)
    const dataInv = isoDate(ano, mes, Math.min(diaInv, totalDias))
    transacoes.push({
      transacao_id: uuid(),
      descricao: pick(DESCRICOES.investimentos),
      valor: rand(50, 400),
      categoria_id: cat('Investimentos').categoria_id,
      data_transacao: dataInv,
      criado_em: isoNow(),
      atualizado_em: isoNow(),
      deletado_em: null,
      origem_registro: 'manual',
      comprovante_url: '',
    })

    // Alimentação (~10-12x por mês)
    const qtdAlim = rand(10, 12)
    for (let i = 0; i < qtdAlim; i++) {
      const dia = rand(1, totalDias)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.alimentacao),
        valor: -rand(12, 120),
        categoria_id: cat('Alimentação').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Transporte (~6-8x por mês)
    const qtdTransp = rand(6, 8)
    for (let i = 0; i < qtdTransp; i++) {
      const dia = rand(1, totalDias)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.transporte),
        valor: -rand(10, 60),
        categoria_id: cat('Transporte').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Moradia (1x por mês)
    const diaMor = rand(1, 10)
    transacoes.push({
      transacao_id: uuid(),
      descricao: pick(DESCRICOES.moradia),
      valor: -rand(800, 1500),
      categoria_id: cat('Moradia').categoria_id,
      data_transacao: isoDate(ano, mes, Math.min(diaMor, totalDias)),
      criado_em: isoNow(),
      atualizado_em: isoNow(),
      deletado_em: null,
      origem_registro: 'manual',
      comprovante_url: '',
    })

    // Moradia extra: Internet + Luz ~R$200-400
    const diaUtil = rand(10, 20)
    transacoes.push({
      transacao_id: uuid(),
      descricao: pick(['Internet', 'Luz', 'Água', 'Gás']),
      valor: -rand(80, 250),
      categoria_id: cat('Moradia').categoria_id,
      data_transacao: isoDate(ano, mes, Math.min(diaUtil, totalDias)),
      criado_em: isoNow(),
      atualizado_em: isoNow(),
      deletado_em: null,
      origem_registro: 'manual',
      comprovante_url: '',
    })

    // Saúde (1-2x por mês)
    const qtdSaude = rand(1, 2)
    for (let i = 0; i < qtdSaude; i++) {
      const dia = rand(1, totalDias)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.saude),
        valor: -rand(40, 200),
        categoria_id: cat('Saúde').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Educação (1x por mês)
    const diaEdu = rand(5, 25)
    transacoes.push({
      transacao_id: uuid(),
      descricao: pick(DESCRICOES.educacao),
      valor: -rand(30, 400),
      categoria_id: cat('Educação').categoria_id,
      data_transacao: isoDate(ano, mes, Math.min(diaEdu, totalDias)),
      criado_em: isoNow(),
      atualizado_em: isoNow(),
      deletado_em: null,
      origem_registro: 'manual',
      comprovante_url: '',
    })

    // Lazer (~4-6x por mês)
    const qtdLazer = rand(4, 6)
    for (let i = 0; i < qtdLazer; i++) {
      const dia = rand(1, totalDias)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.lazer),
        valor: -rand(15, 150),
        categoria_id: cat('Lazer').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Assinaturas (1-2x por mês)
    const qtdAss = rand(1, 2)
    for (let i = 0; i < qtdAss; i++) {
      const dia = rand(1, 28)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.assinaturas),
        valor: -rand(10, 60),
        categoria_id: cat('Assinaturas').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Compras (1-2x por mês)
    const qtdComp = rand(1, 2)
    for (let i = 0; i < qtdComp; i++) {
      const dia = rand(1, totalDias)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.compras),
        valor: -rand(30, 300),
        categoria_id: cat('Compras').categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }

    // Outros (1-2x por mês) — mercado, vestuário, pet, etc.
    const extras = ['Mercado', 'Vestuário', 'Pet', 'Utilidades', 'Presentes', 'Outros']
    for (const nome of extras) {
      const c = catMap[nome.toLowerCase()]
      if (!c) continue
      const dia = rand(3, totalDias - 2)
      transacoes.push({
        transacao_id: uuid(),
        descricao: pick(DESCRICOES.outros),
        valor: -rand(20, 250),
        categoria_id: c.categoria_id,
        data_transacao: isoDate(ano, mes, Math.min(dia, totalDias)),
        criado_em: isoNow(),
        atualizado_em: isoNow(),
        deletado_em: null,
        origem_registro: 'manual',
        comprovante_url: '',
      })
    }
  }

  const total = transacoes.length
  console.log(`⟳ Inserindo ${total} transações no banco...`)

  try {
    await db.movimentacoes.bulkAdd(transacoes)
    console.log(`✓ ${total} transações inseridas com sucesso!`)
  } catch (e) {
    if (e.name === 'BulkError') {
      // Algumas podem já existir (duplicatas de UUID) — ignorar
      const ok = total - e.failures.length
      console.log(`✓ ${ok}/${total} transações inseridas (${e.failures.length} duplicatas ignoradas)`)
    } else {
      console.error('✗ Erro ao inserir:', e)
    }
  }

  // Resumo
  const saidas = transacoes.filter((t) => t.valor < 0).length
  const entradas = transacoes.filter((t) => t.valor > 0).length
  const totalReceitas = transacoes.filter((t) => t.valor > 0).reduce((a, b) => a + b.valor, 0)
  const totalDespesas = transacoes.filter((t) => t.valor < 0).reduce((a, b) => a + Math.abs(b.valor), 0)

  console.log('')
  console.log('╔══════════════════════════════╗')
  console.log('║     SEED CONCLUÍDO           ║')
  console.log(`║  ${String(total).padStart(4)} transações                 ║`)
  console.log(`║  ${String(entradas).padStart(3)} entradas                   ║`)
  console.log(`║  ${String(saidas).padStart(3)} saídas                     ║`)
  console.log(`║  R$ ${totalReceitas.toFixed(2)} receitas                ║`)
  console.log(`║  R$ ${totalDespesas.toFixed(2)} despesas                ║`)
  console.log(`║  R$ ${(totalReceitas - totalDespesas).toFixed(2)} saldo                 ║`)
  console.log('╚══════════════════════════════╝')
  console.log('')
  console.log('⟳ Recarregue a página (F5) para ver os dados no dashboard.')
})()
