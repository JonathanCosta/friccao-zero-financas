<script setup lang="ts">
import { ref, watch } from 'vue'
import { CircleCheck, CircleX } from '@lucide/vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error'
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.message,
  (val) => {
    if (!val) return
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
      setTimeout(() => emit('dismiss'), 300)
    }, 2000)
  }
)
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'"
  >
    <div
      class="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      :class="type === 'error' ? 'bg-brand-expense text-white' : 'bg-brand-income text-white'"
    >
      <CircleCheck v-if="type !== 'error'" class="w-4 h-4" />
      <CircleX v-else class="w-4 h-4" />
      {{ message }}
    </div>
  </div>
</template>
