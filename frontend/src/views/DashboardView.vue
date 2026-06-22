<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { db, type Movimentacao, type Categoria } from '../db/dexie'
import { formatCurrency, formatDateBR } from '../utils/formatters'
import { sanitizeLabel } from '../utils/sanitize'
import VueApexCharts from 'vue3-apexcharts'
import SyncButton from '../components/SyncButton.vue'
import Toast from '../components/Toast.vue'
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from '@lucide/vue'
import ConfirmDestructiveModal from '../components/ConfirmDestructiveModal.vue'

const ano = ref(new Date().getFullYear())
const mes = ref(new Date().getMonth() + 1)
const movimentacoes = ref<Movimentacao[]>([])
const categorias = ref<Categoria[]>([])
const editando = ref<Movimentacao | null>(null)

const filtroTipo = ref<'todas' | 'entrada' | 'saida'>('todas')
const filtroCategoria = ref<string | null>(null)
const filtroBusca = ref('')
let buscaTimer: ReturnType<typeof setTimeout> | null = null

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const showDeleteModal = ref(false)
const deleteMode = ref<'all' | 'month'>('month')
const deleting = ref(false)

function onSyncResult(message: string, type: 'success' | 'error') {
  toastMessage.value = message
  toastType.value = type
}

const mesLabel = computed(() => {
  const d = new Date(ano.value, mes.value - 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

async function carregar() {
  movimentacoes.value = await db.getMovimentacoesDoMes(ano.value, mes.value)
  categorias.value = await db.getCategorias()
}

onMounted(carregar)
watch([ano, mes], carregar)

const movimentacoesFiltradas = computed(() =>
  movimentacoes.value
    .filter((m) => {
      if (filtroTipo.value === 'entrada' && m.valor < 0) return false
      if (filtroTipo.value === 'saida' && m.valor > 0) return false
      if (filtroCategoria.value && m.categoria_id !== filtroCategoria.value) return false
      if (filtroBusca.value && !m.descricao.toLowerCase().includes(filtroBusca.value.toLowerCase())) return false
      return true
    })
    .sort((a, b) => b.data_transacao.localeCompare(a.data_transacao))
)

const categoriasPorTipo = computed(() => {
  const tipo = filtroTipo.value
  if (tipo === 'todas') return categorias.value
  return categorias.value.filter((c) => c.tipo === tipo || c.tipo === 'misto')
})

function onBuscaInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (buscaTimer) clearTimeout(buscaTimer)
  buscaTimer = setTimeout(() => {
    filtroBusca.value = value
  }, 200)
}

function limparFiltros() {
  filtroTipo.value = 'todas'
  filtroCategoria.value = null
  filtroBusca.value = ''
}

function mesAnterior() {
  if (mes.value === 1) {
    mes.value = 12
    ano.value--
  } else {
    mes.value--
  }
}

function mesSeguinte() {
  if (mes.value === 12) {
    mes.value = 1
    ano.value++
  } else {
    mes.value++
  }
}

const gastosPorCategoria = computed(() => {
  const map = new Map<string, number>()
  for (const m of movimentacoesFiltradas.value) {
    if (m.valor >= 0) continue
    const total = map.get(m.categoria_id) ?? 0
    map.set(m.categoria_id, total + Math.abs(m.valor))
  }
  return Array.from(map.entries())
    .map(([id, total]) => ({
      categoria: sanitizeLabel(categorias.value.find((c) => c.categoria_id === id)?.nome ?? 'Sem categoria'),
      total,
    }))
    .sort((a, b) => b.total - a.total)
})

const gastosDiarios = computed(() => {
  const map = new Map<string, number>()
  for (const m of movimentacoesFiltradas.value) {
    if (m.valor >= 0) continue
    const total = map.get(m.data_transacao) ?? 0
    map.set(m.data_transacao, total + Math.abs(m.valor))
  }
  return Array.from(map.entries())
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data))
})

const donutChart = computed(() => ({
  series: gastosPorCategoria.value.map((g) => g.total),
  options: {
    chart: { type: 'donut' as const },
    labels: gastosPorCategoria.value.map((g) => g.categoria),
    colors: ['#4C563F', '#6B7A5F', '#8A9E7F', '#A9C29F', '#692721', '#8E3D35', '#B35349', '#25344F'],
    legend: { position: 'bottom' as const, fontSize: '12px' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              fontSize: '12px',
              color: '#6B7280',
            },
            value: {
              fontSize: '14px',
              fontWeight: 600,
              color: '#1F2937',
              offsetY: 4,
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total',
              fontSize: '12px',
              color: '#6B7280',
              formatter: () => formatCurrency(gastosPorCategoria.value.reduce((a, b) => a + b.total, 0)),
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (v: number) => formatCurrency(v) },
    },
  },
}))

const barChart = computed(() => ({
  series: [
    {
      name: 'Gastos',
      data: gastosDiarios.value.map((g) => g.total),
    },
  ],
  options: {
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
    },
    xaxis: {
      categories: gastosDiarios.value.map((g) => {
        const [_, m, d] = g.data.split('-')
        return `${d}/${m}`
      }),
      labels: {
        rotate: -45,
        hideOverlappingLabels: true,
        formatter: (value: string) => value.split('/')[0],
      },
    },
    colors: ['#692721'],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '70%' },
    },
    tooltip: {
      y: { formatter: (v: number) => formatCurrency(v) },
    },
    grid: { borderColor: '#e5e7eb' },
  },
}))

const receitasMes = computed(() =>
  movimentacoes.value.filter((m) => m.valor > 0).reduce((a, b) => a + b.valor, 0)
)

const despesasMes = computed(() =>
  movimentacoes.value.filter((m) => m.valor < 0).reduce((a, b) => a + Math.abs(b.valor), 0)
)

function nomeCategoria(id: string): string {
  return sanitizeLabel(categorias.value.find((c) => c.categoria_id === id)?.nome ?? '—')
}

function iniciarEdicao(m: Movimentacao) {
  editando.value = { ...m }
}

async function salvarEdicao() {
  if (!editando.value) return
  await db.updateMovimentacao(editando.value.transacao_id, {
    descricao: editando.value.descricao,
    valor: editando.value.valor,
    categoria_id: editando.value.categoria_id,
    data_transacao: editando.value.data_transacao,
  })
  editando.value = null
  await carregar()
}

async function confirmarExclusao(id: string) {
  if (!confirm('Excluir esta transação?')) return
  await db.softDeleteMovimentacao(id)
  await carregar()
}

function confirmarApagar(tipo: 'all' | 'month') {
  deleteMode.value = tipo
  showDeleteModal.value = true
}

async function executarApagar() {
  deleting.value = true
  try {
    const count = deleteMode.value === 'all'
      ? await db.softDeleteAllMovimentacoes()
      : await db.softDeleteMovimentacoesDoMes(ano.value, mes.value)
    toastMessage.value = `${count} registro(s) excluído(s)`
    toastType.value = 'success'
    showDeleteModal.value = false
    await carregar()
  } catch {
    toastMessage.value = 'Erro ao excluir registros'
    toastType.value = 'error'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg overflow-x-hidden">
    <header class="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
      <div class="flex items-center justify-between max-w-lg mx-auto">
        <div class="flex items-center gap-3">
          <img src="/logo_transparent.png" alt="dimdim logo" class="w-10 h-10 object-contain drop-shadow-sm contrast-125 saturate-150" />
          <h1 class="text-2xl font-bold text-brand-text tracking-tight">dimdim</h1>
        </div>
        <button
          @click="$router.push('/')"
          class="text-sm text-gray-500 hover:text-brand-sync transition"
        >
          Lançar
        </button>
      </div>
    </header>

    <main class="p-4 max-w-lg mx-auto space-y-4">
      <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm gap-2">
        <SyncButton @result="onSyncResult" />
        <button @click="mesAnterior" class="p-1 hover:bg-gray-100 rounded-lg transition">
          <ChevronLeft class="w-5 h-5 text-gray-500" />
        </button>
        <span class="font-medium text-gray-900 capitalize">{{ mesLabel }}</span>
        <button @click="mesSeguinte" class="p-1 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2 sm:gap-4">
        <div class="bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <p class="text-xs sm:text-sm text-gray-500 mb-1">Receitas</p>
          <h3 class="text-sm sm:text-lg md:text-xl font-bold text-brand-income tracking-tighter truncate">{{ formatCurrency(receitasMes) }}</h3>
        </div>
        <div class="bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <p class="text-xs sm:text-sm text-gray-500 mb-1">Despesas</p>
          <h3 class="text-sm sm:text-lg md:text-xl font-bold text-brand-expense tracking-tighter truncate">{{ formatCurrency(despesasMes) }}</h3>
        </div>
        <div class="bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <p class="text-xs sm:text-sm text-gray-500 mb-1">Saldo</p>
          <h3
            class="text-sm sm:text-lg md:text-xl font-bold tracking-tighter truncate"
            :class="receitasMes - despesasMes >= 0 ? 'text-brand-income' : 'text-brand-expense'"
          >{{ formatCurrency(receitasMes - despesasMes) }}</h3>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="flex flex-col gap-2">
          <div class="flex flex-col md:flex-row gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar descrição..."
                @input="onBuscaInput"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand-sync focus:ring-2 focus:ring-brand-sync/20 outline-none transition text-sm bg-gray-50 focus:bg-white"
              />
              <button
                v-if="filtroBusca || filtroTipo !== 'todas' || filtroCategoria"
                @click="limparFiltros"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Limpar
              </button>
            </div>

            <div class="flex bg-gray-50 border border-gray-200 p-1 rounded-xl">
              <button
                v-for="t in ([{ v: 'todas', l: 'Todas' }, { v: 'entrada', l: 'Entrada' }, { v: 'saida', l: 'Saída' }] as const)"
                :key="t.v"
                @click="filtroTipo = t.v"
                class="px-3 py-1.5 text-xs font-medium transition rounded-lg flex-1"
                :class="filtroTipo === t.v
                  ? 'bg-brand-sync text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'"
              >
                {{ t.l }}
              </button>
            </div>
          </div>

          <div
            v-if="categoriasPorTipo.length > 0"
            class="flex overflow-x-auto gap-2 pb-1 scrollbar-hide"
          >
            <button
              @click="filtroCategoria = null"
              class="shrink-0 px-3 py-1 text-xs font-medium transition whitespace-nowrap rounded-full"
              :class="!filtroCategoria
                ? 'bg-brand-sync text-white'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'"
            >
              Todas
            </button>
            <button
              v-for="cat in categoriasPorTipo"
              :key="cat.categoria_id"
              @click="filtroCategoria = cat.categoria_id === filtroCategoria ? null : cat.categoria_id"
              class="shrink-0 px-3 py-1 text-xs font-medium transition whitespace-nowrap rounded-full"
              :class="filtroCategoria === cat.categoria_id
                ? 'bg-brand-sync text-white'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'"
            >
              {{ cat.nome }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="gastosPorCategoria.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">Gastos por Categoria</h2>
        <VueApexCharts
          type="donut"
          :options="donutChart.options"
          :series="donutChart.series"
          height="280"
        />
      </div>

      <div v-if="gastosDiarios.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">Gastos Diários</h2>
        <VueApexCharts
          type="bar"
          :options="barChart.options"
          :series="barChart.series"
          height="200"
        />
      </div>

      <div v-if="movimentacoesFiltradas.length > 0" class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-700">Extrato</h2>
          <span v-if="movimentacoesFiltradas.length < movimentacoes.length" class="text-xs text-gray-400 ml-2">
            {{ movimentacoesFiltradas.length }} de {{ movimentacoes.length }}
          </span>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="m in movimentacoesFiltradas"
            :key="m.transacao_id"
            class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div v-if="editando?.transacao_id === m.transacao_id" class="flex-1 space-y-2">
              <input v-model="editando.descricao" maxlength="100" class="w-full px-2 py-1 border rounded text-sm" />
              <input v-model="editando.valor" type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" />
              <input v-model="editando.data_transacao" type="date" class="w-full px-2 py-1 border rounded text-sm" />
              <div class="flex gap-2">
                <button @click="salvarEdicao" class="text-xs bg-brand-income text-white px-3 py-1 rounded">Salvar</button>
                <button @click="editando = null" class="text-xs bg-gray-200 px-3 py-1 rounded">Cancelar</button>
              </div>
            </div>
            <div v-else class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ m.descricao }}</p>
              <p class="text-xs text-gray-500">{{ nomeCategoria(m.categoria_id) }} · {{ formatDateBR(m.data_transacao) }}</p>
            </div>
            <div v-if="editando?.transacao_id !== m.transacao_id" class="flex items-center gap-2 ml-3">
              <span
                class="text-sm font-semibold"
                :class="m.valor < 0 ? 'text-brand-expense' : 'text-brand-income'"
              >
                {{ formatCurrency(m.valor) }}
              </span>
              <button @click="iniciarEdicao(m)" class="p-1 hover:bg-gray-100 rounded">
                <Pencil class="w-4 h-4 text-gray-400" />
              </button>
              <button @click="confirmarExclusao(m.transacao_id)" class="p-1 hover:bg-gray-100 rounded">
                <Trash2 class="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="movimentacoes.length > 0" class="flex gap-3 pt-2">
        <button
          @click="confirmarApagar('month')"
          class="flex-1 text-xs text-gray-400 border border-gray-200 rounded-xl py-2 hover:text-brand-expense hover:border-brand-expense/30 transition"
        >
          <Trash2 class="w-3.5 h-3.5 inline-block mr-1" />
          Apagar este mês
        </button>
        <button
          @click="confirmarApagar('all')"
          class="flex-1 text-xs text-gray-400 border border-gray-200 rounded-xl py-2 hover:text-brand-expense hover:border-brand-expense/30 transition"
        >
          <Trash2 class="w-3.5 h-3.5 inline-block mr-1" />
          Apagar tudo
        </button>
      </div>

      <p v-if="movimentacoes.length === 0" class="text-center text-gray-400 py-8 text-sm">
        Nenhuma movimentação neste mês
      </p>
      <p v-else-if="movimentacoesFiltradas.length === 0" class="text-center text-gray-400 py-6 text-sm">
        Nenhum resultado para os filtros ativos
      </p>
    </main>

    <Toast
      :message="toastMessage"
      :type="toastType"
      @dismiss="toastMessage = ''"
    />

    <ConfirmDestructiveModal
      :show="showDeleteModal"
      :title="deleteMode === 'all' ? 'Apagar tudo' : 'Apagar este mês'"
      :description="`Isso excluirá permanentemente ${movimentacoes.length} registro(s). Esta ação não pode ser desfeita.`"
      :loading="deleting"
      @confirm="executarApagar"
      @close="showDeleteModal = false"
    />
  </div>
</template>
