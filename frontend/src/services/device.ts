const STORAGE_KEY = 'device_token'

export function getDeviceToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setDeviceToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearDeviceToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isDeviceProvisioned(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}
