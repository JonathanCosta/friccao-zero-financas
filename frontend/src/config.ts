export const CONFIG = {
  DEV_MODE: import.meta.env.DEV === true,
  GAS_URL: import.meta.env.DEV
    ? '/gas-api'
    : (import.meta.env.VITE_GAS_URL || 'URL_NAO_CONFIGURADA'),
  APP_NAME: 'dimdim',
  APP_VERSION: '1.0.0',
}
