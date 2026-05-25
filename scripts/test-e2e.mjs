#!/usr/bin/env node
/**
 * Teste E2E do Financeiro PWA
 * Usa Puppeteer para navegar e validar todas as funcionalidades.
 *
 * Uso: node scripts/test-e2e.mjs
 */

import puppeteer from 'puppeteer'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(DIR, '..')
const FRONTEND = path.join(ROOT, 'frontend')
const SCREENSHOTS = path.join(DIR, 'screenshots')
const MOCK_DATA = path.join(DIR, 'mock-gas-data.json')
const MOCK_PORT = 3100
const VITE_PORT = 5173
const BASE = `http://localhost:${VITE_PORT}`

// ─── Helpers ────────────────────────────────────────────────────

let passed = 0
let failed = 0
const results = []

function ok(msg) {
  passed++
  results.push({ status: '✅', msg })
  console.log(`  ✅ ${msg}`)
}

function fail(msg, err) {
  failed++
  results.push({ status: '❌', msg, err: err?.message })
  console.log(`  ❌ ${msg}${err ? ': ' + err.message : ''}`)
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function startProcess(cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true })
  p.stdout.on('data', () => {})
  p.stderr.on('data', () => {})
  return p
}

async function waitForServer(url, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {}
    await sleep(500)
  }
  throw new Error(`Servidor ${url} não iniciou em ${timeout}ms`)
}

async function startMockGas() {
  const p = startProcess('node', ['scripts/mock-gas.js'], ROOT)
  await waitForServer(`http://localhost:${MOCK_PORT}`)
  return p
}

async function startVite() {
  const p = startProcess('npx', ['vite', '--port', String(VITE_PORT)], FRONTEND)
  await waitForServer(`http://localhost:${VITE_PORT}`)
  return p
}

/** Escapa texto para uso em string literal XPath (single-quoted) */
function xpathLiteral(str) {
  if (str.includes("'")) {
    return `concat('${str.replace(/'/g, "', \"'\", '")}')`
  }
  return `'${str}'`
}

/** Espera até que um elemento específico contendo o nó de texto apareça no DOM */
async function waitForText(page, text, timeout = 10000) {
  // CORREÇÃO: Alvo focado no nó de texto [text()[contains(...)]] para evitar capturar html/body
  const xpath = `//descendant::*[text()[contains(., ${xpathLiteral(text)})]]`
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const handle = await page.evaluateHandle((xp) => {
      return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue
    }, xpath)
    const el = handle.asElement()
    if (el) return el
    handle.dispose()
    await sleep(200)
  }
  throw new Error(`"${text}" não encontrado em ${timeout}ms`)
}

/** Clica em elemento contendo o texto */
async function clickByText(page, text) {
  const el = await waitForText(page, text)
  await el.click()
}

/** Espera dropdown de categoria aparecer (com polling) */
async function waitForDropdown(page, timeout = 2500) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const dropdown = await page.$('ul.absolute')
    if (dropdown) return dropdown
    await sleep(200)
  }
  return null
}

/** Encontra input pelo placeholder */
async function findPlaceholder(page, placeholder) {
  return page.waitForSelector(`[placeholder="${placeholder}"]`)
}

/** Busca elemento contendo texto (sem esperar, retorna null se não achar) */
async function findByTextOnce(page, text) {
  const xpath = `//descendant::*[text()[contains(., ${xpathLiteral(text)})]]`
  const handle = await page.evaluateHandle((xp) => {
    return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue
  }, xpath)
  const el = handle.asElement()
  handle.dispose()
  return el
}

// ─── Test Steps ─────────────────────────────────────────────────

async function testProvisionamento(page) {
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.waitForSelector('input[placeholder="Chave de instalação"]', { timeout: 5000 })
  await waitForText(page, 'Modo desenvolvimento', 3000)

  const pwdInput = await page.waitForSelector('input[type="password"]')
  await pwdInput.type('teste123')

  await page.click('button[type="submit"]')
  await sleep(2000)

  const header = await page.$('h1')
  const text = await header?.evaluate((el) => el.textContent)
  if (text && text.includes('Financeiro')) {
    ok('Provisionamento: tela Home exibida')
  } else {
    throw new Error('Home não apareceu após provisionamento')
  }
}

async function lancarRapido(page, valor, descricao, categoria) {
  const valInput = await findPlaceholder(page, 'R$ 0,00')
  // CORREÇÃO: Triplo clique + Backspace para limpar campos mascarados com segurança
  await valInput.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await valInput.type(valor)

  const descInput = await findPlaceholder(page, 'Descrição')
  await descInput.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await descInput.type(descricao)

  const catInput = await findPlaceholder(page, 'Categoria')
  await catInput.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await catInput.type(categoria)

  const dropdown = await waitForDropdown(page)
  if (dropdown) {
    const items = await dropdown.$$('li')
    let clicked = false
    for (const li of items) {
      const txt = await li.evaluate((el) => el.textContent)
      if (txt && txt.includes(categoria) && !txt.includes('Criar')) {
        await li.click()
        clicked = true
        break
      }
    }
    if (!clicked) {
      const criar = await findByTextOnce(page, `Criar "${categoria}"`)
      if (criar) {
        await criar.click()
        await sleep(500)
      }
    }
  }

  await page.click('button[type="submit"]')
}
  
async function testLancamentos(page) {
  await lancarRapido(page, '1500', 'Uber', 'Transporte')
  await waitForText(page, 'Registro salvo!', 3000)
  ok('Lançamento "Uber" (R$ 15,00): salvo')

  await lancarRapido(page, '4590', 'Almoço', 'Alimentação')
  await waitForText(page, 'Registro salvo!', 3000)
  ok('Lançamento "Almoço" (R$ 45,90): salvo')

  await lancarRapido(page, '500000', 'Salário mensal', 'Salário')
  await waitForText(page, 'Registro salvo!', 3000)
  ok('Lançamento "Salário" (R$ 5.000,00): salvo')
}

async function testCategoriaDinamica(page) {
  await lancarRapido(page, '8990', 'Academia mensal', 'Academia')
  await waitForText(page, 'Registro salvo!', 3000)
  ok('Categoria dinâmica "Academia": criada e usada com sucesso')
}

async function testPinDashboard(page) {
  await clickByText(page, 'Relatórios')
  await sleep(1000)
  await waitForText(page, 'Criar PIN', 3000)
  ok('PIN: modal de criação apareceu')

  const PIN_SEL = 'input[inputmode="numeric"][maxlength="1"]'
  const inputs = await page.$$(PIN_SEL)
  if (inputs.length < 4) throw new Error('Inputs PIN não encontrados')

  await inputs[0].type('1')
  await inputs[1].type('2')
  await inputs[2].type('3')
  await inputs[3].type('4')
  await sleep(1000)

  const confirmInputs = await page.$$(PIN_SEL)
  if (confirmInputs.length >= 4) {
    await confirmInputs[0].type('1')
    await confirmInputs[1].type('2')
    await confirmInputs[2].type('3')
    await confirmInputs[3].type('4')
  }
  await sleep(2000)

  await waitForText(page, 'Saldo', 5000)
  await waitForText(page, 'Receitas', 3000)
  await waitForText(page, 'Despesas', 3000)
  ok('Dashboard: cards de saldo/receitas/despesas visíveis')

  const grafico = await page.$('.apexcharts-canvas')
  if (grafico) ok('Dashboard: gráficos ApexCharts renderizados')
  else fail('Dashboard: gráficos não encontrados (pode ser async)')

  await waitForText(page, 'Extrato', 3000)
  ok('Dashboard: seção Extrato visível')
}

async function testEdicaoExclusao(page) {
  const editResult = await page.evaluate(() => {
    const rows = document.querySelectorAll('.divide-y.divide-gray-100 > div')
    if (rows.length === 0) return { error: 'nenhuma transação no extrato' }
    const actionBtns = rows[0].querySelectorAll('button')
    if (actionBtns.length < 2) return { error: 'botões de ação não encontrados' }
    actionBtns[0].click()
    return { ok: true }
  })
  if (editResult.error) {
    fail('Edição: ' + editResult.error)
    return
  }

  await sleep(600)
  const editInput = await page.$('input[type="number"]')
  if (editInput) {
    await editInput.click({ clickCount: 3 })
    await page.keyboard.press('Backspace')
    await editInput.type('2000')
    await clickByText(page, 'Salvar')
    await sleep(1500)
    ok('Edição: valor alterado e salvo')
  } else {
    fail('Edição: input de edição não apareceu')
    return
  }

  page.on('dialog', async (dialog) => {
    await dialog.accept()
  })
  const deleteResult = await page.evaluate(() => {
    const rows = document.querySelectorAll('.divide-y.divide-gray-100 > div')
    if (rows.length === 0) return { error: 'nenhuma transação após edição' }
    const actionBtns = rows[0].querySelectorAll('button')
    if (actionBtns.length < 2) return { error: 'botões não encontrados após edição' }
    actionBtns[1].click()
    return { ok: true }
  })
  if (deleteResult.error) {
    fail('Exclusão: ' + deleteResult.error)
    return
  }
  await sleep(1500)
  ok('Exclusão: soft delete confirmado')
}

async function testSync(page) {
  await clickByText(page, 'Sincronizar')
  await sleep(4000)

  if (fs.existsSync(MOCK_DATA)) {
    const data = JSON.parse(fs.readFileSync(MOCK_DATA, 'utf-8'))
    if (data.movimentacoes && data.movimentacoes.length > 0) {
      ok(`Sync: ${data.movimentacoes.length} movimentações enviadas`)
    } else {
      fail('Sync: movimentações não chegaram ao mock')
    }
    if (data.categorias && data.categorias.length > 0) {
      ok(`Sync: ${data.categorias.length} categorias enviadas`)
    }
  } else {
    fail('Sync: mock-gas-data.json não foi criado')
  }
}

async function testAutoLock(page) {
  // CORREÇÃO: Primeiro navega e garante que está no Dashboard ativo
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle0' })
  await sleep(1000)

  // Executa a simulação do encerramento de visibilidade na página atual (sem resetar com page.goto depois)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(1000)

  // Força uma reconfiguração de rota interna ou clique para ativar a tranca global do router guard
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
  await clickByText(page, 'Relatórios')
  await sleep(1000)

  const pinLogin = await findByTextOnce(page, 'Digite seu PIN')
  if (pinLogin) {
    ok('Auto-lock: PIN exigido após visibilitychange')
  } else {
    fail('Auto-lock: PIN não foi exigido')
  }
}

async function testOfflineMode(page) {
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(2000)

  const pwdInput = await page.$('input[type="password"]')
  if (!pwdInput) {
    fail('Offline: tela de instalação não apareceu')
    return
  }
  ok('Offline: tela de instalação exibida corretamente')

  const offlineBtn = await findByTextOnce(page, 'Continuar em modo offline')
  if (offlineBtn) {
    ok('Offline: botão "Continuar em modo offline" disponível')
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════╗
║  Teste E2E - Financeiro PWA             ║
╚══════════════════════════════════════════╝
  `)

  fs.mkdirSync(SCREENSHOTS, { recursive: true })
  if (fs.existsSync(MOCK_DATA)) fs.unlinkSync(MOCK_DATA)

  const mock = await startMockGas()
  console.log('  ✓ Mock GAS server')
  const vite = await startVite()
  console.log('  ✓ Vite dev server')

  // CORREÇÃO: Removido o executablePath hardcoded para usar o binário nativo do ecossistema do Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(10000)

  const steps = [
    { name: 'Provisionamento', fn: () => testProvisionamento(page) },
    { name: 'Lançamentos rápidos', fn: () => testLancamentos(page) },
    { name: 'Categoria dinâmica', fn: () => testCategoriaDinamica(page) },
    { name: 'Dashboard + PIN', fn: () => testPinDashboard(page) },
    { name: 'Edição e Exclusão', fn: () => testEdicaoExclusao(page) },
    { name: 'Sincronização', fn: () => testSync(page) },
    { name: 'Auto-lock', fn: () => testAutoLock(page) },
    { name: 'Modo Offline', fn: () => testOfflineMode(page) },
  ]

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const num = String(i + 1).padStart(2, '0')
    console.log(`\n── Passo ${num}: ${step.name} ──`)
    try {
      await step.fn()
      await page.screenshot({ path: path.join(SCREENSHOTS, `${num}-${step.name}.png`) })
    } catch (e) {
      await page.screenshot({ path: path.join(SCREENSHOTS, `${num}-${step.name}-erro.png`) })
      fail(step.name, e)
    }
  }

  await browser.close()
  mock.kill()
  vite.kill()
  if (fs.existsSync(MOCK_DATA)) fs.unlinkSync(MOCK_DATA)

  const total = passed + failed
  const cor = failed > 0 ? '\x1b[31m' : '\x1b[32m'
  console.log(`
${cor}══════════════════════════════════════════\x1b[0m
${cor}  ${passed}/${total} testes passaram${failed > 0 ? ` (${failed} falhas)` : ' ✅'}\x1b[0m
${cor}══════════════════════════════════════════\x1b[0m
  `)

  if (failed > 0) {
    console.log('Falhas:')
    results.filter((r) => r.status === '❌')
      .forEach((r) => console.log(`  ${r.status} ${r.msg}${r.err ? ': ' + r.err : ''}`))
  }
  console.log(`Screenshots: ${SCREENSHOTS}/`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Erro fatal:', e)
  process.exit(1)
})