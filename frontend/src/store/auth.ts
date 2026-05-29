import { reactive } from 'vue'

export interface AuthState {
  isAuthorized: boolean
  deviceToken: string | null
  pinHash: string | null
  showPinModal: boolean
}

const state = reactive<AuthState>({
  isAuthorized: false,
  deviceToken: null,
  pinHash: null,
  showPinModal: false,
})

let idleTimer: ReturnType<typeof setTimeout> | null = null
let isInitialized = false

const IDLE_TIMEOUT = 3 * 60 * 1000

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    state.isAuthorized = false
  }, IDLE_TIMEOUT)
}

export function useAuth() {
  function init() {
    if (isInitialized) return
    isInitialized = true
    state.deviceToken = localStorage.getItem('device_token')
    state.pinHash = localStorage.getItem('pin_hash')
    setupVisibilityListener()
    setupActivityListener()
  }

  function setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        state.isAuthorized = false
        if (idleTimer) clearTimeout(idleTimer)
      } else {
        if (state.isAuthorized) resetIdleTimer()
      }
    })
  }

  function setupActivityListener() {
    const events = ['click', 'touchstart', 'keydown', 'scroll']
    events.forEach((ev) => {
      document.addEventListener(ev, () => {
        if (state.isAuthorized) resetIdleTimer()
      })
    })
  }

  function setDeviceToken(token: string) {
    state.deviceToken = token
    localStorage.setItem('device_token', token)
  }

  function clearDeviceToken() {
    state.deviceToken = null
    localStorage.removeItem('device_token')
  }

  function isDeviceProvisioned(): boolean {
    return state.deviceToken !== null
  }

  async function setPin(pin: string) {
    await registrarNovoPin(pin)
    state.pinHash = localStorage.getItem('pin_hash')
  }

  async function validatePin(pin: string): Promise<boolean> {
    return validarPin(pin)
  }

  function authorize() {
    state.isAuthorized = true
    state.showPinModal = false
    resetIdleTimer()
  }

  function deauthorize() {
    state.isAuthorized = false
    if (idleTimer) clearTimeout(idleTimer)
  }

  function requestAuthorization() {
    state.showPinModal = true
  }

  function hidePinModal() {
    state.showPinModal = false
  }

  return {
    state,
    init,
    setDeviceToken,
    clearDeviceToken,
    isDeviceProvisioned,
    setPin,
    validatePin,
    registrarNovoPin,
    validarPin,
    authorize,
    deauthorize,
    requestAuthorization,
    hidePinModal,
  }
}

async function sha256(message: string): Promise<string> {
  if (!window.crypto || !crypto.subtle) {
    throw new Error('Ambiente inseguro detectado. O aplicativo exige criptografia nativa via HTTPS.')
  }
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registrarNovoPin(pin: string): Promise<void> {
  const array = new Uint32Array(4)
  window.crypto.getRandomValues(array)
  const salt = Array.from(array).map(b => b.toString(16)).join('').slice(0, 16)

  const hash = await sha256(salt + pin)

  localStorage.setItem('pin_salt', salt)
  localStorage.setItem('pin_hash', hash)
  state.pinHash = hash
}

export async function validarPin(pinTentativa: string): Promise<boolean> {
  const salt = localStorage.getItem('pin_salt')
  const hashSalvo = localStorage.getItem('pin_hash')

  if (!salt || !hashSalvo) return false

  const hashTentativa = await sha256(salt + pinTentativa)
  return hashTentativa === hashSalvo
}
