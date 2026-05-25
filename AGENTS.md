# Financeiro PWA

## Comandos

| Comando | O que faz |
|---------|-----------|
| `./scripts/start-dev.sh` | Sobe mock GAS (porta 3100) + Vite (porta 5173) |
| `node scripts/test-e2e.mjs` | Executa testes E2E (Puppeteer) |
| `npm run build` (em `frontend/`) | `vue-tsc -b && vite build` — typecheck obrigatório |
| `node scripts/mock-gas.js` | Mock GAS avulso, dados em `scripts/mock-gas-data.json` |

## Arquitetura

- **Local-First:** Dexie.js (IndexedDB) é fonte primária. Google Apps Script é destino de sincronização, não backend transacional.
- **Router hash mode** (`createWebHashHistory`) — essencial para PWA offline.
- **Router guard:** rota `/dashboard` redireciona para `/` se `isAuthorized === false` (não bloqueia).
- **Provisionamento:** `App.vue` checa `device_token` no `onMounted`. Sem token, renderiza `<SetupDevice />` no lugar de `<router-view />`.
- **PIN:** SHA-256 via `crypto.subtle.digest`. Hash salvo como `pin_hash` no localStorage. Fluxo: criar → confirmar → logar.
- **Auto-lock:** 3min inatividade + `visibilitychange` → `isAuthorized = false`.

## Quirks e Convenções

- **CORS com GAS:** toda requisição deve ser **Simple Request** — `Content-Type: text/plain`, token **dentro do body JSON**, nunca em headers.
- **Input de valor monetário** usa máscara customizada (`applyCurrencyMask`/`parseCurrencyMask`), não `<input type="number">`. Digitar `1500` = R$ 15,00.
- **Autocomplete de categorias** tem 200ms de debounce antes de consultar Dexie.
- **Toast** "Registro salvo!" some após 2s — testes precisam capturar nessa janela.
- **Soft delete:** `deletado_em` timestamp, registros nunca são removidos fisicamente.
- **IDs:** UUIDv4 gerado no frontend via `crypto.randomUUID()`.
- **Locale:** pt-BR, tema verde (`#16a34a`).
- **GAS sheets:** sempre acessadas por `getSheetByName('nome')`, nunca `getSheets()[0]`.

## Testes E2E

- `waitForText()` usa XPath: `//descendant::*[text()[contains(., "texto")]]`.
- Teste de sync lê `scripts/mock-gas-data.json` do disco para validar.
- Auto-lock simulado sobrescrevendo `document.hidden` + disparando `visibilitychange`.
- Screenshots de cada passo salvos em `scripts/screenshots/`.

## opencode.json

MCPs configurados: `puppeteer` (local) e `grep` (remote em `https://mcp.grep.app`).
