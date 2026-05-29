<script setup lang="ts">
import { onMounted, ref, provide } from 'vue'
import { useAuth } from './store/auth'
import { db } from './db/dexie'
import SetupDevice from './components/SetupDevice.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const { state, init, isDeviceProvisioned, setDeviceToken } = useAuth()
const ready = ref(false)

provide('auth', { state })

onMounted(async () => {
  try {
    init()
    await db.seedDefaultCategories()
  } catch (e) {
    console.error('Erro na inicialização:', e)
  } finally {
    ready.value = true
  }
})

function onProvisioned(token: string) {
  setDeviceToken(token)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div v-if="!ready" class="text-gray-400 text-sm">Carregando...</div>
    <SetupDevice
      v-else-if="!isDeviceProvisioned()"
      @provisioned="onProvisioned"
    />
    <router-view v-else />
    <InstallPrompt />
  </div>
</template>
