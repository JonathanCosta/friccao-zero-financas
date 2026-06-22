<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '../store/auth'
import { Lock, CircleAlert } from '@lucide/vue'

const emit = defineEmits<{
  authorized: []
  close: []
}>()

const { state, authorize, registrarNovoPin, validarPin } = useAuth()

const step = ref<'create' | 'confirm' | 'login'>(
  state.pinHash ? 'login' : 'create'
)
const d1 = ref('')
const d2 = ref('')
const d3 = ref('')
const d4 = ref('')
const createPin = ref('')
const erro = ref('')

const inputRefs = ref<HTMLInputElement[]>([])

function setInputRef(el: unknown, idx: number) {
  if (el instanceof HTMLInputElement) {
    inputRefs.value[idx] = el
  }
}

const pin = () => `${d1.value}${d2.value}${d3.value}${d4.value}`

watch([d1, d2, d3, d4], () => {
  if (pin().length === 4) {
    handleComplete(pin())
  }
})

const digits = [d1, d2, d3, d4]

function onInput(idx: number, e: Event) {
  const target = e.target as HTMLInputElement
  digits[idx].value = target.value.slice(0, 1)
  if (target.value.length === 1 && idx < 3) {
    nextTick(() => inputRefs.value[idx + 1]?.focus())
  }
}

function onBackspace(idx: number) {
  if (![d1, d2, d3, d4][idx].value && idx > 0) {
    nextTick(() => inputRefs.value[idx - 1]?.focus())
  }
}

function limparDigitos() {
  d1.value = ''
  d2.value = ''
  d3.value = ''
  d4.value = ''
}

function handleComplete(pinValue: string) {
  if (step.value === 'create') {
    createPin.value = pinValue
    step.value = 'confirm'
    limparDigitos()
    erro.value = ''
    nextTick(() => inputRefs.value[0]?.focus())
  } else if (step.value === 'confirm') {
    if (pinValue === createPin.value) {
      registrarNovoPin(pinValue)
      authorize()
      emit('authorized')
    } else {
      erro.value = 'PIN não confere. Tente novamente.'
      step.value = 'create'
      createPin.value = ''
      limparDigitos()
      nextTick(() => inputRefs.value[0]?.focus())
    }
  } else if (step.value === 'login') {
    validarPin(pinValue).then((ok) => {
      if (ok) {
        authorize()
        emit('authorized')
      } else {
        erro.value = 'PIN incorreto'
        limparDigitos()
        nextTick(() => inputRefs.value[0]?.focus())
      }
    })
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-brand-lock/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-8 text-center">
      <div class="bg-brand-lock/10 p-3 rounded-full inline-flex mb-4">
        <Lock class="w-6 h-6 text-brand-lock" />
      </div>

      <h2 class="text-lg font-bold text-gray-900 mb-1">
        <template v-if="step === 'create'">Criar PIN</template>
        <template v-else-if="step === 'confirm'">Confirmar PIN</template>
        <template v-else>Digite seu PIN</template>
      </h2>
      <p class="text-sm text-gray-500 mb-6">
        <template v-if="step === 'create'">Defina um PIN de 4 dígitos</template>
        <template v-else-if="step === 'confirm'">Redigite o PIN para confirmar</template>
        <template v-else>Informe o PIN para acessar os relatórios</template>
      </p>

      <div class="flex justify-center gap-3 mb-4">
        <input
          v-for="(_, i) in 4"
          :key="i"
          :ref="(el: unknown) => setInputRef(el, i)"
          :value="digits[i].value"
          @input="onInput(i, $event)"
          @keydown.backspace.prevent="onBackspace(i)"
          type="text"
          inputmode="numeric"
          maxlength="1"
          autocomplete="one-time-code"
          class="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition"
          :class="erro ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-brand-lock'"
        />
      </div>

      <p v-if="erro" class="text-brand-expense text-sm flex items-center justify-center gap-1 mb-2">
        <CircleAlert class="w-4 h-4" />
        {{ erro }}
      </p>
    </div>
  </div>
</template>
