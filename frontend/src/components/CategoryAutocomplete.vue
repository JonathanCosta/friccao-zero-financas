<script setup lang="ts">
import { ref, computed } from 'vue'
import { db, type Categoria } from '../db/dexie'
import { Plus } from '@lucide/vue'

const props = defineProps<{
  modelValue: Categoria | null
  tipo: 'entrada' | 'saida'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Categoria | null]
  'create': [value: Categoria]
}>()

const query = ref('')
const open = ref(false)
const categorias = ref<Categoria[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const filtered = computed(() => {
  if (!query.value) return categorias.value.slice(0, 8)
  const lower = query.value.toLowerCase()
  return categorias.value.filter((c) => c.nome.toLowerCase().includes(lower)).slice(0, 8)
})

const showCreate = computed(() => {
  if (!query.value.trim()) return false
  return !filtered.value.some((c) => c.nome.toLowerCase() === query.value.toLowerCase())
})

async function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const tipo = props.tipo === 'entrada' ? 'entrada' : 'saida'
    const cats = await db.categorias
      .where('tipo')
      .equals(tipo)
      .or('tipo')
      .equals('misto')
      .toArray()
    categorias.value = cats
    open.value = true
  }, 200)
}

function select(cat: Categoria) {
  emit('update:modelValue', cat)
  query.value = cat.nome
  open.value = false
}

async function criar() {
  const tipo = props.tipo === 'entrada' ? 'entrada' : 'saida'
  const cat = await db.addCategoria(query.value.trim(), tipo)
  categorias.value.push(cat)
  emit('create', cat)
  query.value = cat.nome
  emit('update:modelValue', cat)
  open.value = false
}

function onBlur() {
  setTimeout(() => {
    open.value = false
  }, 200)
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      type="text"
      placeholder="Categoria"
      autocomplete="off"
      @input="onInput"
      @focus="onInput"
      @blur="onBlur"
      class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-sm"
    />

    <ul
      v-if="open && (filtered.length > 0 || showCreate)"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      <li
        v-for="cat in filtered"
        :key="cat.categoria_id"
        @mousedown.prevent="select(cat)"
        class="px-4 py-2.5 text-sm hover:bg-primary-50 cursor-pointer transition flex items-center justify-between"
      >
        <span>{{ cat.nome }}</span>
        <span
          class="text-xs px-2 py-0.5 rounded-full"
          :class="cat.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
        >
          {{ cat.tipo }}
        </span>
      </li>

      <li
        v-if="showCreate"
        @mousedown.prevent="criar"
        class="px-4 py-2.5 text-sm hover:bg-primary-50 cursor-pointer transition flex items-center gap-2 text-primary-600 font-medium border-t border-gray-100"
      >
        <Plus class="w-4 h-4" />
        Criar "{{ query }}"
      </li>
    </ul>
  </div>
</template>
