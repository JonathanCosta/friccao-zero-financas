<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { db, type Categoria } from '../db/dexie'
import { todayISO, applyCurrencyMask, parseCurrencyMask } from '../utils/formatters'
import CategoryAutocomplete from './CategoryAutocomplete.vue'
import { Save, ArrowUp, ArrowDown } from '@lucide/vue'

const emit = defineEmits<{
  saved: []
}>()

const rawValor = ref('')
const displayValor = computed(() => applyCurrencyMask(rawValor.value))

function onValorInput(e: Event) {
  const el = e.target as HTMLInputElement
  rawValor.value = el.value.replace(/\D/g, '')
  nextTick(() => {
    const pos = displayValor.value.length
    el.setSelectionRange(pos, pos)
  })
}

const tipo = ref<'entrada' | 'saida'>('saida')
const descricao = ref('')
const categoria = ref<Categoria | null>(null)
const data = ref(todayISO())
const salvando = ref(false)
const erro = ref('')
const inputValor = ref<HTMLInputElement | null>(null)

function focusValor() {
  nextTick(() => inputValor.value?.focus())
}

async function salvar() {
  const valorNumerico = parseCurrencyMask(rawValor.value)
  if (valorNumerico <= 0) {
    erro.value = 'Informe um valor válido'
    return
  }
  if (!descricao.value.trim()) {
    erro.value = 'Informe uma descrição'
    return
  }
  if (!categoria.value) {
    erro.value = 'Selecione ou crie uma categoria'
    return
  }
  if (!data.value) {
    erro.value = 'Informe a data'
    return
  }

  salvando.value = true
  erro.value = ''

  try {
    const valorFinal = tipo.value === 'saida' ? -valorNumerico : valorNumerico
    await db.addMovimentacao({
      descricao: descricao.value.trim(),
      valor: valorFinal,
      categoria_id: categoria.value.categoria_id,
      data_transacao: data.value,
    })

    rawValor.value = ''
    descricao.value = ''
    categoria.value = null
    data.value = todayISO()
    emit('saved')
    focusValor()
  } catch (e) {
    erro.value = 'Erro ao salvar'
  } finally {
    salvando.value = false
  }
}

function toggleTipo() {
  tipo.value = tipo.value === 'saida' ? 'entrada' : 'saida'
}

function onCategoriaCriada(cat: Categoria) {
  categoria.value = cat
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    salvar()
  }
}
</script>

<template>
  <form @submit.prevent="salvar" @keydown="onKeydown" class="space-y-3">
    <div class="flex gap-2">
      <div class="flex-1">
        <div class="relative">
          <input
            ref="inputValor"
            :value="displayValor"
            @input="onValorInput"
            type="text"
            inputmode="numeric"
            placeholder="R$ 0,00"
            autocomplete="off"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-lg font-semibold"
          />
        </div>
      </div>
      <button
        type="button"
        @click="toggleTipo"
        class="px-4 py-3 rounded-lg border font-medium text-sm transition flex items-center gap-1.5 min-w-[90px] justify-center"
        :class="
          tipo === 'saida'
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-green-50 border-green-200 text-green-600'
        "
      >
        <ArrowDown v-if="tipo === 'saida'" class="w-4 h-4" />
        <ArrowUp v-else class="w-4 h-4" />
        {{ tipo === 'saida' ? 'Saída' : 'Entrada' }}
      </button>
    </div>

    <input
      v-model="descricao"
      type="text"
      placeholder="Descrição"
      autocomplete="off"
      class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
    />

    <CategoryAutocomplete
      :model-value="categoria"
      :tipo="tipo"
      @update:model-value="categoria = $event"
      @create="onCategoriaCriada"
    />

    <input
      v-model="data"
      type="date"
      class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
    />

    <p v-if="erro" class="text-red-500 text-sm">{{ erro }}</p>

    <button
      type="submit"
      :disabled="salvando"
      class="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
    >
      <Save class="w-5 h-5" />
      {{ salvando ? 'Salvando...' : 'Salvar' }}
    </button>
  </form>
</template>
