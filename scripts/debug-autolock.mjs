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
const BASE = 'http://localhost:5173'

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
    await new Promise(r => setTimeout(r, 500))
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

const mock = startProcess('node', ['scripts/mock-gas.js'], ROOT)
await waitForServer('http://localhost:3100')
const vite = startProcess('npx', ['vite', '--port', '5173'], FRONTEND)
await waitForServer('http://localhost:5173')

if (fs.existsSync(MOCK_DATA)) fs.unlinkSync(MOCK_DATA)
fs.mkdirSync(SCREENSHOTS, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
page.setDefaultTimeout(10000)

// Capture console messages from the page
page.on('console', msg => console.log('PAGE:', msg.text()))

const PIN_SEL = 'input[inputmode="numeric"][maxlength="1"]'
const xpathRel = `//descendant::*[text()[contains(., 'Relat\u00f3rios')]]`

// --- Provision ---
await page.goto(BASE, { waitUntil: 'networkidle0' })
await page.waitForSelector('input[type="password"]')
await page.type('input[type="password"]', 'teste123')
await page.click('button[type="submit"]')
await sleep(2000)

// --- Create PIN ---
const relHandle = await page.evaluateHandle((xp) => {
  return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
}, xpathRel)
await relHandle.asElement().click()
relHandle.dispose()
await sleep(1000)

const inputs = await page.$$(PIN_SEL)
await inputs[0].type('1')
await inputs[1].type('2')
await inputs[2].type('3')
await inputs[3].type('4')
await sleep(1500)

const confirmInputs = await page.$$(PIN_SEL)
await confirmInputs[0].type('1')
await confirmInputs[1].type('2')
await confirmInputs[2].type('3')
await confirmInputs[3].type('4')
await sleep(2000)

const ls = await page.evaluate(() => ({
  pin_hash: localStorage.getItem('pin_hash') ? 'EXISTS' : 'NULL',
  pin_salt: localStorage.getItem('pin_salt') ? 'EXISTS' : 'NULL',
}))
console.log('localStorage:', JSON.stringify(ls))

// ======= AUTO-LOCK TEST =======
// Step 1: Visibilitychange
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { get: () => true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
})
await sleep(1000)

// Step 2: Reload to home
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
await sleep(2000)

// DEBUG: Check state after reload
const stateCheck1 = await page.evaluate(() => {
  // Check if PinModal-related state is accessible
  return {
    pinHash: localStorage.getItem('pin_hash') ? 'EXISTS' : 'NULL',
    hasRelatorios: document.body.innerText.includes('Relatórios'),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
  }
})
console.log('State after reload:', JSON.stringify(stateCheck1))

// Instead of clicking via XPath, let's try to evaluate irDashboard directly
const result = await page.evaluate(() => {
  // Access the Vue app instance
  const appEl = document.querySelector('#app')
  if (!appEl) return 'no app element'
  
  // Try to find the Vue component instance
  const vm = appEl.__vue_app__
  if (!vm) return 'no Vue app'
  
  const pinHash = localStorage.getItem('pin_hash')
  return `localStorage pin_hash exists: ${!!pinHash}, Vue app found: true`
})
console.log('Vue check:', result)

// Now try clicking "Relatórios" button directly via querySelector
const btnClicked = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'))
  const relBtn = buttons.find(b => b.textContent.includes('Relatórios'))
  if (relBtn) {
    relBtn.click()
    return 'clicked'
  }
  return 'not found'
})
console.log('Direct button click:', btnClicked)
await sleep(3000)

const textAfter = await page.evaluate(() => document.body.innerText)
console.log('After click:', textAfter.substring(0, 400))
console.log(`"Digite seu PIN": ${textAfter.includes('Digite seu PIN')}`)
console.log(`"Criar PIN": ${textAfter.includes('Criar PIN')}`)

await page.screenshot({ path: path.join(SCREENSHOTS, 'debug-autolock-final.png') })
console.log('Screenshot saved')

await browser.close()
mock.kill()
vite.kill()
if (fs.existsSync(MOCK_DATA)) fs.unlinkSync(MOCK_DATA)
