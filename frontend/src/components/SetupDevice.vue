<script setup lang="ts">
import { ref } from 'vue'
import { CONFIG } from '../config'
import { generateUUID } from '../utils/uuid'
import { KeyRound, Loader2, WifiOff, Bug } from '@lucide/vue'

const emit = defineEmits<{
  provisioned: [token: string]
}>()

const chave = ref('')
const loading = ref(false)
const modoOffline = ref(false)
const erro = ref('')

async function confirmar() {
  if (!chave.value.trim()) {
    erro.value = 'Informe a chave de instalação'
    return
  }
  if (chave.value.trim().length > 100) {
    erro.value = 'Chave excede o limite máximo de 100 caracteres'
    return
  }

  if (CONFIG.DEV_MODE) {
    provisionarLocal()
    return
  }

  loading.value = true
  erro.value = ''

  try {
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'provision',
        chave: chave.value.trim(),
        nome_dispositivo: 'web',
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.erro || 'Chave inválida')
    }

    const data = await response.json()
    emit('provisioned', data.token_acesso)
  } catch (e) {
    if (e instanceof TypeError) {
      modoOffline.value = true
      erro.value = 'Servidor indisponível. Use o modo offline?'
    } else {
      erro.value = e instanceof Error ? e.message : 'Erro ao conectar'
    }
  } finally {
    loading.value = false
  }
}

// M-4: Token criptograficamente seguro via randomUUID em vez de charCode + timestamp
// M-8: Sem fingerprint de navegador — nome_dispositivo fixo como 'web'
function provisionarLocal() {
  const token = generateUUID()
  emit('provisioned', token)
}

function continuarOffline() {
  provisionarLocal()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-sync to-brand-lock p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
      <div class="flex justify-center mb-6">
        <div class="bg-brand-sync/10 p-3 rounded-full">
          <KeyRound class="w-8 h-8 text-brand-sync" />
        </div>
      </div>

      <h1 class="text-2xl font-bold text-center text-gray-900 mb-2">
        dimdim
      </h1>
      <p class="text-sm text-center text-gray-500 mb-2">
        Digite a chave de instalação fornecida pelo administrador
      </p>

      <div
        v-if="CONFIG.DEV_MODE"
        class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2"
      >
        <Bug class="w-4 h-4 text-amber-600 shrink-0" />
        <span class="text-xs text-amber-700">
          Modo desenvolvimento — qualquer chave é aceita
        </span>
      </div>

      <form @submit.prevent="confirmar" class="space-y-4">
        <div>
          <input
            v-model="chave"
            type="password"
            placeholder="Chave de instalação"
            autocomplete="off"
            maxlength="100"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-brand-sync focus:ring-2 focus:ring-brand-sync/20 outline-none transition text-center text-lg tracking-widest"
            :disabled="loading"
          />
        </div>

        <p v-if="erro && !modoOffline" class="text-red-500 text-sm text-center">{{ erro }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-brand-sync hover:bg-brand-sync/80 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
          {{ loading ? 'Validando...' : 'Confirmar' }}
        </button>

        <div v-if="modoOffline" class="space-y-2">
          <p class="text-amber-600 text-sm text-center flex items-center justify-center gap-1">
            <WifiOff class="w-4 h-4" />
            Servidor indisponível
          </p>
          <button
            type="button"
            @click="continuarOffline"
            class="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition text-sm"
          >
            Continuar em modo offline
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
