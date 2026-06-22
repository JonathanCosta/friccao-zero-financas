<script setup lang="ts">
import { ref, watch } from 'vue'
import { validarPin } from '../store/auth'
import { TriangleAlert, CircleAlert } from '@lucide/vue'

const props = defineProps<{
  show: boolean
  title: string
  description: string
  loading: boolean
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()

const confirmText = ref('')
const step = ref<'confirm' | 'pin'>('confirm')
const digits = [ref(''), ref(''), ref(''), ref('')]
const erro = ref('')

watch(() => props.show, (v) => {
  if (v) {
    confirmText.value = ''
    step.value = 'confirm'
    digits.forEach(d => d.value = '')
    erro.value = ''
  }
})

function onConfirmTextInput(e: Event) {
  confirmText.value = (e.target as HTMLInputElement).value.toUpperCase()
}

function avancarParaPin() {
  if (confirmText.value !== 'APAGAR') {
    erro.value = 'Digite APAGAR para confirmar'
    return
  }
  erro.value = ''
  step.value = 'pin'
}

const pin = () => digits.map(d => d.value).join('')

function onPinInput(idx: number, e: Event) {
  const target = e.target as HTMLInputElement
  digits[idx].value = target.value.slice(0, 1)
  if (target.value.length === 1 && idx < 3) {
    const next = document.getElementById(`pin-${idx + 1}`)
    next?.focus()
  }
}

function onPinBackspace(idx: number) {
  if (!digits[idx].value && idx > 0) {
    const prev = document.getElementById(`pin-${idx - 1}`)
    prev?.focus()
  }
}

watch(digits.map(d => d), () => {
  if (pin().length === 4) {
    validarPin(pin()).then((ok) => {
      if (ok) {
        emit('confirm')
      } else {
        erro.value = 'PIN incorreto'
        digits.forEach(d => d.value = '')
        const first = document.getElementById('pin-0')
        first?.focus()
      }
    })
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-brand-lock/50 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-8 text-center">
        <div class="bg-brand-expense/10 p-3 rounded-full inline-flex mb-4">
          <TriangleAlert class="w-6 h-6 text-brand-expense" />
        </div>

        <h2 class="text-lg font-bold text-gray-900 mb-1">{{ title }}</h2>
        <p class="text-sm text-gray-500 mb-6">{{ description }}</p>

        <template v-if="step === 'confirm'">
          <p class="text-xs text-gray-400 mb-2">
            Digite <span class="font-bold text-brand-expense tracking-wider">APAGAR</span> para continuar
          </p>
          <input
            type="text"
            :value="confirmText"
            @input="onConfirmTextInput"
            placeholder="APAGAR"
            autocomplete="off"
            class="w-full px-4 py-2.5 text-sm text-center font-bold tracking-widest border-2 rounded-xl outline-none transition mb-4"
            :class="erro ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-brand-expense'"
          />
          <p v-if="erro" class="text-brand-expense text-xs flex items-center justify-center gap-1 mb-2">
            <CircleAlert class="w-4 h-4" />
            {{ erro }}
          </p>
          <button
            @click="avancarParaPin"
            class="w-full py-2.5 rounded-xl text-sm font-medium bg-brand-expense text-white hover:bg-brand-expense/90 transition disabled:opacity-50"
            :disabled="confirmText !== 'APAGAR'"
          >
            Continuar
          </button>
        </template>

        <template v-else>
          <p class="text-xs text-gray-400 mb-4">Digite seu PIN para confirmar</p>
          <div class="flex justify-center gap-3 mb-4">
            <input
              v-for="i in 4"
              :key="i"
              :id="`pin-${i - 1}`"
              :value="digits[i - 1].value"
              @input="onPinInput(i - 1, $event)"
              @keydown.backspace.prevent="onPinBackspace(i - 1)"
              type="text"
              inputmode="numeric"
              maxlength="1"
              autocomplete="off"
              class="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition"
              :class="erro ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-brand-lock'"
            />
          </div>
          <p v-if="erro" class="text-brand-expense text-xs flex items-center justify-center gap-1 mb-2">
            <CircleAlert class="w-4 h-4" />
            {{ erro }}
          </p>
          <button
            @click="step = 'confirm'; erro = ''"
            class="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Voltar
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>
