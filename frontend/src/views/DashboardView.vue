<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { db, type Movimentacao, type Categoria } from '../db/dexie'
import { formatCurrency, formatDateBR } from '../utils/formatters'
import VueApexCharts from 'vue3-apexcharts'
import SyncButton from '../components/SyncButton.vue'
import Toast from '../components/Toast.vue'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from '@lucide/vue'

const ano = ref(new Date().getFullYear())
const mes = ref(new Date().getMonth() + 1)
const movimentacoes = ref<Movimentacao[]>([])
const categorias = ref<Categoria[]>([])
const editando = ref<Movimentacao | null>(null)

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

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
  for (const m of movimentacoes.value) {
    if (m.valor >= 0) continue
    const total = map.get(m.categoria_id) ?? 0
    map.set(m.categoria_id, total + Math.abs(m.valor))
  }
  return Array.from(map.entries())
    .map(([id, total]) => ({
      categoria: categorias.value.find((c) => c.categoria_id === id)?.nome ?? 'Sem categoria',
      total,
    }))
    .sort((a, b) => b.total - a.total)
})

const gastosDiarios = computed(() => {
  const map = new Map<string, number>()
  for (const m of movimentacoes.value) {
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
    colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#15803d', '#166534', '#14532d'],
    legend: { position: 'bottom' as const, fontSize: '12px' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: { show: true, label: 'Total', fontSize: '14px', formatter: () => formatCurrency(gastosPorCategoria.value.reduce((a, b) => a + b.total, 0)) },
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
    },
    colors: ['#16a34a'],
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
  return categorias.value.find((c) => c.categoria_id === id)?.nome ?? '—'
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
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
      <div class="flex items-center justify-between max-w-lg mx-auto">
        <h1 class="text-lg font-bold text-primary-700">Dashboard</h1>
        <button
          @click="$router.push('/')"
          class="text-sm text-gray-500 hover:text-primary-600 transition"
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

      <div class="flex gap-3">
        <div class="flex-1 bg-white rounded-xl p-4 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Receitas</p>
          <p class="text-lg font-bold text-green-600">{{ formatCurrency(receitasMes) }}</p>
        </div>
        <div class="flex-1 bg-white rounded-xl p-4 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Despesas</p>
          <p class="text-lg font-bold text-red-500">{{ formatCurrency(despesasMes) }}</p>
        </div>
        <div class="flex-1 bg-white rounded-xl p-4 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Saldo</p>
          <p
            class="text-lg font-bold"
            :class="receitasMes - despesasMes >= 0 ? 'text-primary-600' : 'text-red-500'"
          >
            {{ formatCurrency(receitasMes - despesasMes) }}
          </p>
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

      <div v-if="movimentacoes.length > 0" class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-700">Extrato</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="m in movimentacoes"
            :key="m.transacao_id"
            class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div v-if="editando?.transacao_id === m.transacao_id" class="flex-1 space-y-2">
              <input v-model="editando.descricao" class="w-full px-2 py-1 border rounded text-sm" />
              <input v-model="editando.valor" type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" />
              <input v-model="editando.data_transacao" type="date" class="w-full px-2 py-1 border rounded text-sm" />
              <div class="flex gap-2">
                <button @click="salvarEdicao" class="text-xs bg-primary-600 text-white px-3 py-1 rounded">Salvar</button>
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
                :class="m.valor < 0 ? 'text-red-500' : 'text-green-600'"
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

      <p v-else class="text-center text-gray-400 py-8 text-sm">
        Nenhuma movimentação neste mês
      </p>
    </main>

    <Toast
      :message="toastMessage"
      :type="toastType"
      @dismiss="toastMessage = ''"
    />
  </div>
</template>
