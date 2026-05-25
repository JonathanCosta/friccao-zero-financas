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

const IDLE_TIMEOUT = 3 * 60 * 1000

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    state.isAuthorized = false
  }, IDLE_TIMEOUT)
}

export function useAuth() {
  function init() {
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
    const hash = await sha256(pin)
    state.pinHash = hash
    localStorage.setItem('pin_hash', hash)
  }

  async function validatePin(pin: string): Promise<boolean> {
    if (!state.pinHash) return false
    const hash = await sha256(pin)
    return hash === state.pinHash
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
    authorize,
    deauthorize,
    requestAuthorization,
    hidePinModal,
  }
}

async function sha256(message: string): Promise<string> {
  if (crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let hash = 0
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
