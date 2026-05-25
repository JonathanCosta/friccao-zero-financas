import { db } from '../db/dexie'
import { CONFIG } from '../config'
import { getDeviceToken, clearDeviceToken } from './device'

export interface SyncResult {
  synced: boolean
  message: string
  details?: {
    inserts: number
    updates: number
  }
}

export async function syncToGAS(): Promise<SyncResult> {
  const ultimoSync = db.getUltimoSync()
  const dirty = await db.getDirtyRecords(ultimoSync ?? '')

  const hasDirtyData =
    dirty.categorias.length > 0 || dirty.movimentacoes.length > 0

  if (!hasDirtyData) {
    return { synced: false, message: 'Nada a sincronizar' }
  }

  const token = getDeviceToken()
  if (!token) {
    return { synced: false, message: 'Dispositivo não provisionado' }
  }

  try {
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'sync',
        token,
        categorias: dirty.categorias,
        movimentacoes: dirty.movimentacoes,
      }),
    })

    const data = await response.json()

    if (data.erro === 'token_invalido') {
      clearDeviceToken()
      return {
        synced: false,
        message: 'Token inválido — faça o provisionamento novamente',
      }
    }

    if (!response.ok) {
      return { synced: false, message: data.erro || 'Erro no servidor' }
    }

    await db.updateSyncTimestamp()

    return {
      synced: true,
      message: `${data.inserts || 0} inseridos, ${data.updates || 0} atualizados`,
      details: { inserts: data.inserts || 0, updates: data.updates || 0 },
    }
  } catch (e) {
    const message =
      e instanceof TypeError
        ? 'Sem conexão com a internet'
        : 'Erro ao sincronizar'
    return { synced: false, message }
  }
}
