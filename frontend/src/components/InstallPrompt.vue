<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Download, X } from '@lucide/vue'

const COOLDOWN_DAYS = 7
const LS_KEY = 'pwa_dismissed_until'

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isStandalone = ref(false)
const isIOS = ref(false)
const showIOSInstructions = ref(false)

const isDismissed = computed(() => {
  try {
    const until = localStorage.getItem(LS_KEY)
    return until !== null && Date.now() < Number(until)
  } catch {
    return false
  }
})

const canShow = computed(() =>
  !isStandalone.value
  && !isDismissed.value
  && (deferredPrompt.value !== null || isIOS.value)
)

function checkStandalone() {
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function checkIOS() {
  const ua = navigator.userAgent
  isIOS.value =
    /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function dismiss() {
  try {
    const until = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(LS_KEY, String(until))
  } catch {
    // localStorage indisponível (private browsing restritivo)
  }
  deferredPrompt.value = null
}

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    isStandalone.value = true
  }
  deferredPrompt.value = null
}

function onAppInstalled() {
  isStandalone.value = true
}

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
}

onMounted(() => {
  checkStandalone()
  if (isStandalone.value) return

  checkIOS()

  if (!isIOS.value) {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }

  window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<template>
  <div v-if="canShow" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
    <div
      v-if="!isIOS"
      class="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 text-sm"
    >
      <Download class="w-5 h-5 text-primary-600 shrink-0" />
      <span class="flex-1 text-gray-700">
        Instale o <strong>Financeiro</strong> para acesso offline
      </span>
      <button
        @click="install"
        class="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition"
      >
        Instalar
      </button>
      <button @click="dismiss" class="text-gray-400 hover:text-gray-600 transition" aria-label="Fechar">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div
      v-else
      class="px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 text-sm"
    >
      <div class="flex items-center gap-3">
        <Download class="w-5 h-5 text-primary-600 shrink-0" />
        <span class="flex-1 text-gray-700">
          Instale o <strong>Financeiro</strong> no seu iPhone
        </span>
        <button @click="dismiss" class="text-gray-400 hover:text-gray-600 transition shrink-0" aria-label="Fechar">
          <X class="w-4 h-4" />
        </button>
      </div>
      <button
        @click="showIOSInstructions = !showIOSInstructions"
        class="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium transition"
      >
        {{ showIOSInstructions ? 'Ocultar instruções' : 'Ver instruções' }}
      </button>
      <div
        v-if="showIOSInstructions"
        class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-2"
      >
        <p>1. Toque no botão <strong>Compartilhar</strong> <span class="text-base">⎙</span> na barra do Safari</p>
        <p>2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></p>
        <p>3. Toque em <strong>Adicionar</strong> no canto superior direito</p>
      </div>
    </div>
  </div>
</template>
