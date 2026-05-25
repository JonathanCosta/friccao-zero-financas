#!/usr/bin/env node
/**
 * Mock GAS Server — Simula o backend Google Apps Script localmente.
 * Uso: node scripts/mock-gas.js
 *
 * Endpoints:
 *   POST /  (body: text/plain JSON)
 *     action=provision  → retorna token
 *     action=sync       → upsert simulado
 *
 * Dados salvos em mock-gas-data.json para inspeção.
 */

import http from 'node:http'
import fs from 'node:fs'
import crypto from 'node:crypto'

const PORT = 3100
const DATA_FILE = new URL('./mock-gas-data.json', import.meta.url)

let banco = { dispositivos: [], categorias: [], movimentacoes: [] }

function carregar() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    banco = JSON.parse(raw)
  } catch {
    banco = { dispositivos: [], categorias: [], movimentacoes: [] }
  }
}

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(banco, null, 2))
}

carregar()

function jsonReply(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'GET') {
    jsonReply(res, 200, { status: 'ok', app: 'Mock GAS Server' })
    return
  }

  if (req.method !== 'POST') {
    jsonReply(res, 405, { erro: 'Método não permitido' })
    return
  }

  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    try {
      const dados = JSON.parse(body)
      const action = dados.action || ''

      if (action === 'provision') {
        handleProvision(res, dados)
      } else if (action === 'sync') {
        handleSync(res, dados)
      } else {
        jsonReply(res, 400, { erro: 'Ação desconhecida: ' + action })
      }
    } catch (e) {
      jsonReply(res, 400, { erro: 'JSON inválido: ' + e.message })
    }
  })
})

function handleProvision(res, dados) {
  if (!dados.chave) {
    jsonReply(res, 401, { erro: 'Chave de instalação inválida' })
    return
  }

  const token = crypto.randomUUID()
  const dispositivoId = crypto.randomUUID()
  const agora = new Date().toISOString()

  const dispositivo = {
    dispositivo_id: dispositivoId,
    nome_dispositivo: dados.nome_dispositivo || 'Desconhecido',
    token_acesso: token,
    criado_em: agora,
  }

  banco.dispositivos.push(dispositivo)
  salvar()

  console.log(`[PROVISION] Dispositivo: ${dispositivo.nome_dispositivo} → Token: ${token}`)

  jsonReply(res, 200, {
    sucesso: true,
    dispositivo_id: dispositivoId,
    token_acesso: token,
  })
}

function handleSync(res, dados) {
  if (!dados.token) {
    jsonReply(res, 401, { erro: 'token_invalido' })
    return
  }

  let inserts = 0
  let updates = 0

  if (dados.categorias) {
    for (const cat of dados.categorias) {
      const idx = banco.categorias.findIndex((c) => c.categoria_id === cat.categoria_id)
      if (idx >= 0) {
        if (cat.criado_em > banco.categorias[idx].criado_em) {
          banco.categorias[idx] = cat
          updates++
        }
      } else {
        banco.categorias.push(cat)
        inserts++
      }
    }
  }

  if (dados.movimentacoes) {
    for (const mov of dados.movimentacoes) {
      const idx = banco.movimentacoes.findIndex((m) => m.transacao_id === mov.transacao_id)
      if (idx >= 0) {
        if (mov.atualizado_em > banco.movimentacoes[idx].atualizado_em) {
          banco.movimentacoes[idx] = mov
          updates++
        }
      } else {
        banco.movimentacoes.push(mov)
        inserts++
      }
    }
  }

  salvar()

  console.log(`[SYNC] Token: ${dados.token} | +${inserts} inserts, ~${updates} updates`)

  jsonReply(res, 200, { inserts, updates, sucesso: true })
}

server.listen(PORT,'0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║  Mock GAS Server rodando                ║
║  http://localhost:${PORT}                    ║
║                                          ║
║  Dados salvos em: mock-gas-data.json    ║
╚══════════════════════════════════════════╝
  `)
})
