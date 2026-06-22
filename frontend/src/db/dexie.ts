import Dexie, { type Table } from 'dexie'
import { generateUUID } from '../utils/uuid'
import { nowISO } from '../utils/formatters'

export interface Dispositivo {
  dispositivo_id: string
  nome_dispositivo: string
  token_acesso: string
  criado_em: string
}

export interface Categoria {
  categoria_id: string
  nome: string
  tipo: 'entrada' | 'saida' | 'misto'
  criado_em: string
}

export interface Movimentacao {
  transacao_id: string
  descricao: string
  valor: number
  categoria_id: string
  data_transacao: string
  criado_em: string
  atualizado_em: string
  deletado_em: string | null
  origem_registro: string
  comprovante_url: string
}

export class FinanceiroDB extends Dexie {
  dispositivos!: Table<Dispositivo, string>
  categorias!: Table<Categoria, string>
  movimentacoes!: Table<Movimentacao, string>

  constructor() {
    super('financeiro')
    this.version(1).stores({
      dispositivos: 'dispositivo_id, token_acesso',
      categorias: 'categoria_id, nome, tipo',
      movimentacoes: 'transacao_id, categoria_id, data_transacao, deletado_em, atualizado_em',
    })
    this.version(2).stores({
      dispositivos: 'dispositivo_id, token_acesso',
      categorias: 'categoria_id, nome, tipo, criado_em',
      movimentacoes: 'transacao_id, categoria_id, data_transacao, deletado_em, atualizado_em',
    })
  }

  async addMovimentacao(data: {
    descricao: string
    valor: number
    categoria_id: string
    data_transacao: string
    origem_registro?: string
  }): Promise<string> {
    const now = nowISO()
    const id = generateUUID()
    const mov: Movimentacao = {
      transacao_id: id,
      descricao: data.descricao,
      valor: data.valor,
      categoria_id: data.categoria_id,
      data_transacao: data.data_transacao,
      criado_em: now,
      atualizado_em: now,
      deletado_em: null,
      origem_registro: data.origem_registro ?? 'manual',
      comprovante_url: '',
    }
    await this.movimentacoes.add(mov)
    return id
  }

  async updateMovimentacao(
    id: string,
    data: Partial<Pick<Movimentacao, 'descricao' | 'valor' | 'categoria_id' | 'data_transacao'>>
  ): Promise<void> {
    await this.movimentacoes.update(id, {
      ...data,
      atualizado_em: nowISO(),
    })
  }

  async softDeleteMovimentacao(id: string): Promise<void> {
    await this.movimentacoes.update(id, {
      deletado_em: nowISO(),
      atualizado_em: nowISO(),
    })
  }

  async softDeleteMovimentacoesDoMes(ano: number, mes: number): Promise<number> {
    const prefix = `${ano}-${String(mes).padStart(2, '0')}`
    const all = await this.movimentacoes.toArray()
    const ids = all.filter(m => m.data_transacao.startsWith(prefix) && m.deletado_em === null).map(m => m.transacao_id)
    if (ids.length === 0) return 0
    const now = nowISO()
    await this.movimentacoes
      .where('transacao_id')
      .anyOf(ids)
      .modify({ deletado_em: now, atualizado_em: now })
    return ids.length
  }

  async softDeleteAllMovimentacoes(): Promise<number> {
    const all = await this.movimentacoes.toArray()
    const ids = all.filter(m => m.deletado_em === null).map(m => m.transacao_id)
    if (ids.length === 0) return 0
    const now = nowISO()
    await this.movimentacoes
      .where('transacao_id')
      .anyOf(ids)
      .modify({ deletado_em: now, atualizado_em: now })
    return ids.length
  }

  async getCategorias(tipo?: 'entrada' | 'saida' | 'misto'): Promise<Categoria[]> {
    if (tipo) {
      return this.categorias.where('tipo').equals(tipo).toArray()
    }
    return this.categorias.toArray()
  }

  async getCategoriasByNome(search: string): Promise<Categoria[]> {
    const all = await this.categorias.toArray()
    const lower = search.toLowerCase()
    return all.filter((c) => c.nome.toLowerCase().includes(lower))
  }

  async addCategoria(nome: string, tipo: 'entrada' | 'saida' | 'misto'): Promise<Categoria> {
    const now = nowISO()
    const cat: Categoria = {
      categoria_id: generateUUID(),
      nome,
      tipo,
      criado_em: now,
    }
    await this.categorias.add(cat)
    return cat
  }

  async getMovimentacoesDoMes(
    ano: number,
    mes: number
  ): Promise<Movimentacao[]> {
    const prefix = `${ano}-${String(mes).padStart(2, '0')}`
    const all = await this.movimentacoes.toArray()
    return all.filter(
      (m) =>
        m.data_transacao.startsWith(prefix) && m.deletado_em === null
    )
  }

  async getDirtyRecords(since: string): Promise<{
    categorias: Categoria[]
    movimentacoes: Movimentacao[]
  }> {
    const categorias = !since
      ? await this.categorias.toArray()
      : await this.categorias.where('criado_em').above(since).toArray()
    const movimentacoes = !since
      ? await this.movimentacoes.toArray()
      : await this.movimentacoes.where('atualizado_em').above(since).toArray()
    return { categorias, movimentacoes }
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await this.categorias.count()
    if (count > 0) return

    const defaults: Array<{ nome: string; tipo: 'entrada' | 'saida' | 'misto' }> = [
      { nome: 'Alimentação', tipo: 'saida' },
      { nome: 'Transporte', tipo: 'saida' },
      { nome: 'Moradia', tipo: 'saida' },
      { nome: 'Saúde', tipo: 'saida' },
      { nome: 'Educação', tipo: 'saida' },
      { nome: 'Lazer', tipo: 'saida' },
      { nome: 'Assinaturas', tipo: 'saida' },
      { nome: 'Compras', tipo: 'saida' },
      { nome: 'Salário', tipo: 'entrada' },
      { nome: 'Freelance', tipo: 'entrada' },
      { nome: 'Investimentos', tipo: 'entrada' },
      { nome: 'Outros', tipo: 'misto' },
    ]

    const now = nowISO()
    const batch = defaults.map((c) => ({
      categoria_id: generateUUID(),
      nome: c.nome,
      tipo: c.tipo,
      criado_em: now,
    }))
    await this.categorias.bulkAdd(batch)
  }

  async updateSyncTimestamp(): Promise<void> {
    localStorage.setItem('ultimo_sync', nowISO())
  }

  getUltimoSync(): string | null {
    return localStorage.getItem('ultimo_sync')
  }
}

export const db = new FinanceiroDB()
