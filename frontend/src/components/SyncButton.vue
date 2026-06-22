<script setup lang="ts">
import { ref } from 'vue'
import { RotateCw } from '@lucide/vue'
import { syncToGAS } from '../services/sync'
import { db } from '../db/dexie'

const emit = defineEmits<{
  result: [message: string, type: 'success' | 'error']
}>()

const syncing = ref(false)

const ultimoSyncLabel = ref('')

function atualizarLabel() {
  const ts = db.getUltimoSync()
  if (ts) {
    const d = new Date(ts)
    ultimoSyncLabel.value = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    ultimoSyncLabel.value = 'nunca'
  }
}

atualizarLabel()

async function sync() {
  if (syncing.value) return
  syncing.value = true

  try {
    const result = await syncToGAS()
    if (result.synced) {
      emit('result', result.message, 'success')
    } else {
      emit('result', result.message, 'error')
    }
    atualizarLabel()
  } catch {
    emit('result', 'Erro inesperado', 'error')
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <button
    @click="sync"
    :disabled="syncing"
    class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
    :title="'Último sync: ' + ultimoSyncLabel"
  >
    <RotateCw
      class="w-4 h-4"
      :class="syncing ? 'animate-spin text-brand-sync' : ''"
    />
    {{ syncing ? 'Sincronizando...' : 'Sincronizar' }}
  </button>
</template>
