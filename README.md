# dimdim

Aplicativo de controle financeiro pessoal **PWA** com arquitetura **Local-First**. Funciona 100% offline e sincroniza com Google Sheets via Google Apps Script.

> "Registrar um gasto deve ser tão rápido quanto enviar um WhatsApp."

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Vue 3 (Composition API) + TypeScript + Vite |
| **Estilização** | Tailwind CSS (Brand Book: Off-white, Verde-oliva, Vermelho-tijolo) |
| **Banco Local** | Dexie.js (IndexedDB) — fonte primária |
| **Gráficos** | ApexCharts + vue3-apexcharts |
| **Ícones** | lucide-vue-next |
| **PWA** | vite-plugin-pwa (standalone + SW precache) |
| **Backend** | Google Apps Script (Web App) |
| **Banco Remoto** | Google Sheets |

---

## Começar

```bash
# Instalar dependências
cd frontend && npm install

# Subir ambiente dev (Mock GAS + Vite)
cd .. && ./scripts/start-dev.sh
# Mock GAS: http://localhost:3100
# Vite:     http://localhost:5173
```

No modo dev, qualquer chave de instalação é aceita — sem dependência externa.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `./scripts/start-dev.sh` | Sobe mock GAS (3100) + Vite (5173) |
| `cd frontend && npm run build` | `vue-tsc -b && vite build` |
| `node scripts/test-e2e.mjs` | 15 testes E2E com Puppeteer |
| `cd frontend && npm run dev` | Vite standalone (sem mock GAS) |

---

## Arquitetura

**Local-First:** Dexie.js (IndexedDB) é a fonte primária de dados. Google Sheets é destino de sincronização, não backend transacional. O app funciona completamente offline.

```
Navegador
  ├── Dexie (IndexedDB) ─── fonte primária
  ├── Motor de Sync ─────── coleta dirty records, envia para GAS
  └── PWA (SW precache) ── assets offline

GAS (Google Apps Script)
  ├── doPost ────────────── roteia action: provision | sync
  ├── Auth.gs ───────────── valida token, provisiona dispositivos
  ├── Sync.gs ───────────── upsert por ID + timestamp
  └── Sheets.gs ─────────── getSheetByName (nunca getSheets()[0])
```

**CORS:** GAS não responde a OPTIONS (preflight). Toda requisição usa `Content-Type: text/plain` com token dentro do body JSON.

---

## Funcionalidades

- **Provisionamento:** Tela de setup com chave de instalação
- **Transações rápidas:** Formulário minimalista com máscara de moeda, autocomplete de categorias, CTRL+Enter
- **PIN 4 dígitos:** SHA-256 via `crypto.subtle.digest`, auto-lock 3 min + visibilitychange
- **Dashboard:** Gráfico rosca (gastos por categoria), barras (gastos diários), extrato editável com soft delete
- **Sincronização:** Botão manual, upsert por ID, detecção por timestamp, tratamento de token inválido
- **PWA:** Service worker, manifest, funcionamento offline

---

## Estrutura

```
├── frontend/          Vite + Vue 3 + Tailwind
│   ├── src/
│   │   ├── components/   TransactionForm, PinModal, SetupDevice...
│   │   ├── views/        HomeView, DashboardView
│   │   ├── services/     sync.ts, device.ts
│   │   ├── store/        auth.ts
│   │   └── db/           dexie.ts
│   └── public/
├── gas/               Google Apps Script
│   ├── Código.gs      Entrypoint
│   ├── Auth.gs        Token + provisionamento
│   ├── Sync.gs        Upsert
│   └── Sheets.gs      Abstração sheets
└── scripts/           start-dev.sh, mock-gas.js, test-e2e.mjs
```

---

## Deploy

1. Crie o secret `VITE_GAS_URL` no repositório (Settings > Secrets and variables > Actions)
2. Faça push para `main` — o workflow em `.github/workflows/deploy.yml` faz o build e publica no GitHub Pages
3. Ative GitHub Pages em Settings > Pages > Source: GitHub Actions

---

## Segurança

| Medida | Implementação |
|--------|---------------|
| Token no body | Dentro do JSON, nunca em headers (CORS) |
| Hash PIN | SHA-256 via `crypto.subtle.digest` |
| Idempotência | UUIDv4 como chave natural |
| Soft delete | `deletado_em` timestamp, registros nunca removidos |
| Chave secreta | Script Properties (GAS), nunca no frontend |

---

## Licença

MIT
