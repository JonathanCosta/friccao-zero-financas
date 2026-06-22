<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../store/auth'
import TransactionForm from '../components/TransactionForm.vue'
import PinModal from '../components/PinModal.vue'
import Toast from '../components/Toast.vue'
import { BarChart3 } from '@lucide/vue'

const router = useRouter()
const { state } = useAuth()

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function onSaved() {
  toastMessage.value = 'Registro salvo!'
  toastType.value = 'success'
}

function irDashboard() {
  if (state.isAuthorized) {
    router.push('/dashboard')
  } else {
    state.showPinModal = true
  }
}

function onAuthorized() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <img src="/logo_transparent.png" alt="dimdim logo" class="w-10 h-10 object-contain drop-shadow-sm contrast-125 saturate-150" />
        <h1 class="text-2xl font-bold text-brand-text tracking-tight">dimdim</h1>
      </div>
      <button
        @click="irDashboard"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-sync transition px-3 py-1.5 rounded-lg hover:bg-brand-sync/10"
      >
        <BarChart3 class="w-4 h-4" />
        Relatórios
      </button>
    </header>

    <main class="flex-1 p-4 max-w-lg mx-auto w-full">
      <TransactionForm @saved="onSaved" />
    </main>

    <footer class="text-center text-xs text-gray-400 py-3">
      Todos os dados ficam salvos no seu dispositivo
    </footer>

    <PinModal
      v-if="state.showPinModal"
      @authorized="onAuthorized"
      @close="state.showPinModal = false"
    />

    <Toast
      :message="toastMessage"
      :type="toastType"
      @dismiss="toastMessage = ''"
    />
  </div>
</template>
